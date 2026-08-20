#!/usr/bin/env bash
#
# Run the OpenRazer daemon against fake devices: the real daemon, the real DBus
# interface, no hardware, no kernel module, no root.
#
#   ./openrazer-fake.sh start     # bus + fake devices + daemon
#   ./openrazer-fake.sh devices   # what the daemon sees
#   ./openrazer-fake.sh env       # the export the Rust backend needs
#   ./openrazer-fake.sh stop
#
# Everything is bootstrapped into .openrazer-fake/ at the repository root, which
# is gitignored. Nothing is installed system wide and nothing is written to
# ~/.config.
#
# ⚠️ A fake device says yes to everything. This proves the shape of the calls
# and the capability discovery — never the latency, the firmware, the wireless
# link, or what a frame actually looks like.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

# At the repository root, not beside this script. Storybook's `staticDirs`
# copies the whole of apps/synapse, and the fake tree emulates sysfs — its
# read-only endpoints make that copy fail with EACCES and break the build.
ROOT="$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || echo "$HERE/..")/.openrazer-fake"
REPO="$ROOT/openrazer"
VENV="$ROOT/venv"
TREE="$ROOT/devices"
BUSFILE="$ROOT/bus-address"

# The four the frontend mocks in apps/synapse/src/app/app.config.ts, so both
# modes show the same hardware. `create_fake_device.py --all` gives all 268.
DEVICES=(
  razerbasiliskultimatereceiver   # 0x0088 — per-zone lighting, battery
  razerviperv2prowired            # 0x00A5 — no lighting at all
  razergoliathusextended          # 0x0C02 — chroma, but no wave
  razerhuntsmanelite              # 0x0226 — full 9x22 matrix, macros
)

die() { echo "openrazer-fake: $*" >&2; exit 1; }

alive() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

# ── bootstrap ────────────────────────────────────────────────────────────────

need_system_deps() {
  # python-dbus and PyGObject are C extensions bound to the system libraries.
  # Installing them from PyPI needs a compiler and headers; every distribution
  # ships them, so ask for the package instead of building it.
  python3 - <<'PY' 2>/dev/null && return 0
import dbus, gi
PY
  cat >&2 <<'EOF'
openrazer-fake: python3-dbus and python3-gi are required and were not found.

  Debian/Ubuntu  sudo apt install python3-dbus python3-gi
  Fedora         sudo dnf install python3-dbus python3-gobject
  Arch           sudo pacman -S python-dbus python-gobject

They are C extensions bound to the system libraries — pip cannot stand in.
EOF
  exit 1
}

bootstrap() {
  need_system_deps
  command -v dbus-daemon >/dev/null || die "dbus-daemon not found (install dbus)"
  command -v git >/dev/null || die "git not found"

  mkdir -p "$ROOT"

  [ -d "$REPO/.git" ] || git clone --depth 1 -q \
    https://github.com/openrazer/openrazer.git "$REPO"

  if [ ! -x "$VENV/bin/python" ]; then
    # --system-site-packages so the venv inherits dbus and gi from the system.
    if ! python3 -m venv --system-site-packages "$VENV" >/dev/null 2>&1; then
      # Some distributions ship venv without ensurepip (Debian's python3-venv
      # is a separate package). Build the venv anyway and fetch pip by hand.
      python3 -m venv --without-pip --system-site-packages "$VENV" \
        || die "could not create a virtualenv"
      curl -sSfL https://bootstrap.pypa.io/get-pip.py -o "$ROOT/get-pip.py" \
        || die "could not download get-pip.py"
      "$VENV/bin/python" "$ROOT/get-pip.py" -q
    fi
    "$VENV/bin/python" -m pip install -q daemonize setproctitle pyudev numpy
  fi

  # The daemon refuses to start without one, and looks for a copy it can only
  # find once installed system wide.
  [ -f "$ROOT/razer.conf" ] || cp "$REPO/daemon/resources/razer.conf" "$ROOT/razer.conf"
}

# ── the session bus ──────────────────────────────────────────────────────────

# `gdbus --address` rather than `dbus-send --address`, which does not answer on
# a live bus. An address that is merely *set* proves nothing — see ensure_bus.
bus_works() {
  [ -n "${1:-}" ] || return 1
  gdbus call --address "$1" --dest org.freedesktop.DBus \
    --object-path /org/freedesktop/DBus \
    --method org.freedesktop.DBus.ListNames >/dev/null 2>&1
}

# Adopt a bus that already works, or fail. Only `start` may create one — this
# used to create one here too, and that was the bug: `env` or `devices` run
# after the recorded bus died would fork a fresh empty one and *overwrite the
# pointer to the live daemon*, so the devices vanished with no error anywhere.
use_bus() {
  # Under WSLg, DBUS_SESSION_BUS_ADDRESS names a socket that does not exist, so
  # the variable alone proves nothing — it has to answer.
  if bus_works "${DBUS_SESSION_BUS_ADDRESS:-}"; then
    export DBUS_SESSION_BUS_ADDRESS
    return 0
  fi
  local recorded
  recorded="$(cat "$BUSFILE" 2>/dev/null || true)"
  if bus_works "$recorded"; then
    export DBUS_SESSION_BUS_ADDRESS="$recorded"
    return 0
  fi
  return 1
}

ensure_bus() {
  use_bus && return 0
  dbus-daemon --session --print-address --fork > "$BUSFILE"
  export DBUS_SESSION_BUS_ADDRESS="$(cat "$BUSFILE")"
}

# ── commands ─────────────────────────────────────────────────────────────────

start() {
  bootstrap
  ensure_bus
  export PYTHONPATH="$REPO/daemon:$REPO/pylib"

  if ! alive "$ROOT/devices.pid"; then
    # The tree emulates sysfs, so some endpoints are left read-only and the
    # tool's own --clear-dest cannot unlink them.
    chmod -R u+w "$TREE" 2>/dev/null || true
    rm -rf "$TREE"
    mkdir -p "$TREE"
    # This process owns the tree: it must stay alive, it holds the handles the
    # daemon reads and writes.
    nohup "$VENV/bin/python" "$REPO/scripts/create_fake_device.py" \
      --dest "$TREE" --non-interactive "${DEVICES[@]}" \
      > "$ROOT/devices.log" 2>&1 &
    echo $! > "$ROOT/devices.pid"
    sleep 3
  fi

  # A pidfile left by a killed run stops the next daemon taking the lock.
  mkdir -p "$ROOT/run" "$ROOT/log"
  rm -f "$ROOT"/run/*.pid

  # ⚠️ Do not record `$!`. The daemon double-forks and `setproctitle`s itself to
  # "openrazer-daemon", so the pid launched here dies immediately and the real
  # one is reparented. It writes its own pidfile into --run-dir; that is the
  # only handle on it. Five orphans accumulated before this was understood,
  # each holding a bus of its own.
  nohup "$VENV/bin/python" "$REPO/daemon/run_openrazer_daemon.py" \
    -F -v --test-dir "$TREE" --config "$ROOT/razer.conf" \
    --run-dir "$ROOT/run" --log-dir "$ROOT/log" \
    --persistence "$ROOT/persistence.conf" \
    > "$ROOT/daemon.log" 2>&1 &
  sleep 5

  grep -q "Serving DBus" "$ROOT/daemon.log" \
    || die "the daemon did not come up — see $ROOT/daemon.log"

  echo "bus: $DBUS_SESSION_BUS_ADDRESS"
  devices
}

devices() {
  use_bus || die "no daemon on any known bus — run: $(basename "$0") start"
  local serials
  serials=$(gdbus call --session --dest org.razer --object-path /org/razer \
            --method razer.devices.getDevices | grep -o "'[^']*'" | tr -d "'")
  for serial in $serials; do
    printf '  %-14s %-36s %s\n' "$serial" \
      "$(gdbus call --session --dest org.razer \
          --object-path "/org/razer/device/$serial" \
          --method razer.device.misc.getDeviceName | tr -d "(),'")" \
      "$(gdbus call --session --dest org.razer \
          --object-path "/org/razer/device/$serial" \
          --method razer.device.misc.getVidPid | tr -d '()')"
  done
}

stop() {
  # By recorded pid, never `pkill -f`: the pattern would also match the shell
  # running this script, and the script would kill its own caller. The daemon's
  # pidfile is the one it writes itself — see the warning in `start`.
  for pidfile in "$ROOT"/run/*.pid "$ROOT/devices.pid"; do
    alive "$pidfile" && kill "$(cat "$pidfile")" 2>/dev/null || true
    rm -f "$pidfile"
  done
  rm -f "$BUSFILE"
  # The tree emulates sysfs, so a plain `rm -rf .openrazer-fake` fails on the
  # read-only endpoints. Leave it removable.
  chmod -R u+w "$TREE" 2>/dev/null || true
  echo "daemon and fake devices stopped; the bus is left running"
}

case "${1:-start}" in
  start)   start ;;
  devices) devices ;;
  env)     use_bus || die "no daemon on any known bus — run: $(basename "$0") start"
           echo "export DBUS_SESSION_BUS_ADDRESS='$DBUS_SESSION_BUS_ADDRESS'" ;;
  stop)    stop ;;
  *)       echo "usage: $(basename "$0") {start|devices|env|stop}" >&2; exit 1 ;;
esac
