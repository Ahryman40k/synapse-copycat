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

use app_lib::razer::device::DeviceKind;
use openrazer::backend::{dbus::DbusBackend, BackendError, DeviceBackend};

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

// ─── capability discovery ─────────────────────────────────────────────────────

/// The point of discovery: devices differ, and finer than by kind.
///
/// Introspected against the fake daemon, which reports exactly what the real
/// one would. A Huntsman publishes `setWave`; a Goliathus publishes the same
/// `razer.device.lighting.chroma` interface **without** it. Anything deciding
/// from the interface alone offers a wave that answers `UnknownMethod`.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn discovery_separates_devices_that_share_an_interface() {
    let backend = backend().await;

    let huntsman = backend
        .supported_methods("XX0000000226")
        .await
        .expect("introspection failed");
    let goliathus = backend
        .supported_methods("XX0000000C02")
        .await
        .expect("introspection failed");

    // Both publish chroma and a static colour.
    for device in [&huntsman, &goliathus] {
        assert!(device.contains("razer.device.lighting.chroma.setStatic"));
    }

    // Only one of them can wave.
    assert!(huntsman.contains("razer.device.lighting.chroma.setWave"));
    assert!(
        !goliathus.contains("razer.device.lighting.chroma.setWave"),
        "the Goliathus would be offered a wave it refuses"
    );
}

/// Discovery answers in the vocabulary the frontend sends.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_mouse_reports_dpi_and_battery_and_a_keyboard_does_not() {
    let backend = backend().await;

    // The Basilisk Ultimate receiver: a wireless mouse, so DPI and power.
    let mouse = openrazer::request::supported_from(
        &backend.supported_methods("XX0000000088").await.unwrap(),
    );
    // The Huntsman Elite: a wired keyboard, so neither.
    let keyboard = openrazer::request::supported_from(
        &backend.supported_methods("XX0000000226").await.unwrap(),
    );

    for wanted in [
        "GetDpi",
        "SetDpi",
        "GetMaxDpi",
        "GetBatteryLevel",
        "IsCharging",
    ] {
        assert!(mouse.contains(&wanted.to_string()), "mouse lacks {wanted}");
        assert!(
            !keyboard.contains(&wanted.to_string()),
            "the keyboard was offered {wanted}, which it has no interface for"
        );
    }

    // And what they do share is reported for both, so discovery is not simply
    // answering "mouse" and "keyboard" by another name.
    for shared in ["GetDeviceName", "GetDeviceImage"] {
        assert!(mouse.contains(&shared.to_string()), "mouse lacks {shared}");
        assert!(
            keyboard.contains(&shared.to_string()),
            "keyboard lacks {shared}"
        );
    }

    // ⚠️ The case that makes method-level discovery necessary, and the one
    // `src-tauri/AGENTS.md` warns about: the Basilisk publishes
    // `razer.device.lighting.chroma` but **not `setStatic`** — its colour is
    // per zone, on `razer.device.lighting.logo` and friends. So the keyboard
    // takes a static colour and the mouse does not, despite both advertising
    // the same interface. Anything reading interfaces would offer the mouse a
    // control that answers `UnknownMethod`.
    assert!(keyboard.contains(&"SetChromaStatic".to_string()));
    assert!(
        !mouse.contains(&"SetChromaStatic".to_string()),
        "the Basilisk's colour is per zone; offering it the global static \
         colour is exactly the trap discovery exists to close"
    );
}

/// A headset has no matrix and no wave, and discovery has to say so.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_headset_is_offered_only_what_it_can_do() {
    let backend = backend().await;

    let kraken = backend.supported_methods("XX0000000527").await.unwrap();
    let named = openrazer::request::supported_from(&kraken);

    // It can take a colour.
    assert!(named.contains(&"SetChromaStatic".to_string()));
    // It cannot be painted — no `setKeyRow`, no `setCustom`. This is why the
    // engine approximates a headset with one averaged colour.
    assert!(!kraken.contains("razer.device.lighting.chroma.setKeyRow"));
    assert!(!kraken.contains("razer.device.lighting.chroma.setCustom"));
    // And it has no brightness interface at all.
    assert!(!named.contains(&"SetBrightness".to_string()));
}
