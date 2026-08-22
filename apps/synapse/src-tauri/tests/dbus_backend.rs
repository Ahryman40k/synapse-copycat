//! The DBus backend against a live daemon.
//!
//! These run against the **fake** OpenRazer daemon, which serves one device of
//! every type OpenRazer can report, bar `core`:
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test dbus_backend -- --ignored
//! ```
//!
//! `#[ignore]` because they need that daemon on the session bus — a plain
//! `cargo test` must stay green on a machine that has neither the daemon nor
//! any Razer hardware.
//!
//! ⚠️ A fake device says yes to everything. What is asserted here is the shape
//! of the conversation and which capabilities each device reports — never the
//! latency, the firmware, or what a frame looks like.
#![cfg(target_os = "linux")]

use openrazer::backend::{dbus::DbusBackend, BackendError, DeviceBackend};
use app_lib::razer::device::DeviceKind;

/// Serials the fake driver derives from each device's product id. One per
/// device type OpenRazer can report, bar `core`.
const HUNTSMAN: &str = "XX0000000226"; // keyboard
const BASILISK: &str = "XX0000000088"; // mouse
const GOLIATHUS: &str = "XX0000000C02"; // mousemat
const BASE_STATION: &str = "XX0000000F08"; // accessory
const KRAKEN: &str = "XX0000000527"; // headset
const TARTARUS: &str = "XX000000022B"; // keypad

async fn backend() -> DbusBackend {
    DbusBackend::new()
        .await
        .expect("no daemon on the session bus — run scripts/openrazer-fake.sh start")
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn enumerates_every_device() {
    let backend = backend().await;

    let mut serials = backend.list_devices().await.expect("listing failed");
    serials.sort();

    let mut expected = vec![
        HUNTSMAN,
        BASILISK,
        GOLIATHUS,
        BASE_STATION,
        KRAKEN,
        TARTARUS,
    ];
    expected.sort();
    assert_eq!(serials, expected);
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn names_and_identifies_every_device() {
    let backend = backend().await;

    // 5426 is 0x1532, Razer. The keyboard, mouse and mousemat are the three the
    // frontend also mocks, with the same ids — the rest of the set is wider on
    // purpose, since the mock cannot serve types the app has no page for.
    for (serial, name, kind, vid, pid) in [
        (HUNTSMAN, "Razer Huntsman Elite", "keyboard", 5426, 550),
        (
            BASILISK,
            "Razer Basilisk Ultimate (Receiver)",
            "mouse",
            5426,
            136,
        ),
        (
            GOLIATHUS,
            "Razer Goliathus Extended",
            "mousemat",
            5426,
            3074,
        ),
        (
            BASE_STATION,
            "Razer Base Station Chroma",
            "accessory",
            5426,
            3848,
        ),
        (KRAKEN, "Razer Kraken Ultimate", "headset", 5426, 1319),
        (TARTARUS, "Razer Tartarus V2", "keypad", 5426, 555),
    ] {
        assert_eq!(backend.get_device_name(serial).await.unwrap(), name);
        assert_eq!(backend.get_device_type(serial).await.unwrap(), kind);
        assert_eq!(backend.get_vid_pid(serial).await.unwrap(), (vid, pid));
    }
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn writes_and_reads_back_a_static_colour() {
    let backend = backend().await;

    backend
        .set_chroma_static(GOLIATHUS, 255, 0, 0)
        .await
        .expect("the mousemat supports setStatic");
    backend
        .set_brightness(GOLIATHUS, 42.0)
        .await
        .expect("the mousemat supports setBrightness");

    assert_eq!(backend.get_brightness(GOLIATHUS).await.unwrap(), 42.0);
}

/// The mousemat has no `setWave`: its `MATRIX_DIMS` is `[1, 1]`, a single zone,
/// so a wave would mean nothing. The daemon does not publish the method at all.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn refuses_a_wave_the_device_does_not_have() {
    let backend = backend().await;

    let refused = backend.set_chroma_wave(GOLIATHUS, 1).await;
    assert!(refused.is_err(), "the mousemat has no setWave");

    // ⚠️ Documents what happens today, not what should. A missing method comes
    // back as `org.freedesktop.DBus.Error.UnknownMethod`, which `From<zbus::Error>`
    // does not recognise — only `InterfaceNotFound` maps to
    // `InterfaceUnsupported`, so an unsupported capability is reported as a
    // transport failure. The frontend cannot tell "this device cannot do that"
    // from "the daemon is unreachable".
    assert!(
        matches!(refused, Err(BackendError::Transport(_))),
        "expected the current mapping; got {refused:?}"
    );
}

/// The Basilisk is lit per zone — `.logo`, `.scroll`, `.left`, `.right` — and
/// never through the global `chroma` setters this backend calls. Being unlit
/// and being lit differently look the same from here, and neither is a fault
/// of the daemon.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn cannot_light_the_mouse_through_the_global_interface() {
    let backend = backend().await;

    assert!(backend
        .set_chroma_static(BASILISK, 255, 0, 0)
        .await
        .is_err());
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn sets_dpi_on_a_mouse() {
    let backend = backend().await;

    backend
        .set_dpi(BASILISK, 1600, 1600)
        .await
        .expect("set_dpi");
    assert_eq!(backend.get_dpi(BASILISK).await.unwrap(), (1600, 1600));
    assert!(backend.get_max_dpi(BASILISK).await.unwrap() > 0);
}

/// The daemon's vocabulary is wider than ours, and the two do not line up.
///
/// A keypad is now a keyboard — the Tartarus publishes the same interfaces as
/// the Huntsman, so it belongs on the same page. What is left over is `core`,
/// an external GPU enclosure, which still arrives as `Unknown`.
///
/// ⚠️ `headset` is the one that has nowhere to go: `DeviceKind` has it and the
/// frontend union does not. Turn this round when the three vocabularies agree.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn speaks_a_wider_vocabulary_than_the_app() {
    let backend = backend().await;

    // What the daemon says, before any mapping.
    assert_eq!(backend.get_device_type(TARTARUS).await.unwrap(), "keypad");
    assert_eq!(backend.get_device_type(KRAKEN).await.unwrap(), "headset");

    // And what we make of it.
    assert!(matches!(
        DeviceKind::from_type_str("keypad"),
        DeviceKind::Keyboard
    ));
    assert!(matches!(
        DeviceKind::from_type_str("core"),
        DeviceKind::Unknown
    ));
}
