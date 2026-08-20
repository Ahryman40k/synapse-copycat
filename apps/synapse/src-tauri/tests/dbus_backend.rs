//! The DBus backend against a live daemon.
//!
//! These run against the **fake** OpenRazer daemon, which serves the same four
//! devices the frontend mocks:
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

use app_lib::razer::backend::{dbus::DbusBackend, BackendError, DeviceBackend};

/// Serials the fake driver derives from each device's product id.
const HUNTSMAN: &str = "XX0000000226";
const GOLIATHUS: &str = "XX0000000C02";
const VIPER: &str = "XX00000000A5";
const BASILISK: &str = "XX0000000088";

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

    let mut expected = vec![HUNTSMAN, GOLIATHUS, VIPER, BASILISK];
    expected.sort();
    assert_eq!(serials, expected);
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn reports_the_same_ids_the_frontend_mocks() {
    let backend = backend().await;

    // The pairs in apps/synapse/src/app/app.config.ts, so the mock and the
    // daemon describe the same hardware. 5426 is 0x1532, Razer.
    for (serial, name, kind, vid, pid) in [
        (HUNTSMAN, "Razer Huntsman Elite", "keyboard", 5426, 550),
        (GOLIATHUS, "Razer Goliathus Extended", "mousemat", 5426, 3074),
        (VIPER, "Razer Viper V2 Pro (Wired)", "mouse", 5426, 165),
        (
            BASILISK,
            "Razer Basilisk Ultimate (Receiver)",
            "mouse",
            5426,
            136,
        ),
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

/// The Viper V2 Pro has no lighting at all — its `chroma` interface carries
/// only `restoreLastEffect`. The Basilisk has lighting, but per zone: `.logo`,
/// `.scroll`, `.left`, `.right`, and never the global `chroma` setters this
/// backend calls.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn cannot_light_the_two_mice_through_the_global_interface() {
    let backend = backend().await;

    assert!(
        backend.set_chroma_static(VIPER, 255, 0, 0).await.is_err(),
        "the Viper reports no lighting"
    );
    assert!(
        backend.set_chroma_static(BASILISK, 255, 0, 0).await.is_err(),
        "the Basilisk is lit per zone, not through razer.device.lighting.chroma"
    );
}

/// DPI is the one capability both mice really have.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn sets_dpi_on_a_mouse() {
    let backend = backend().await;

    backend.set_dpi(VIPER, 1600, 1600).await.expect("set_dpi");
    assert_eq!(backend.get_dpi(VIPER).await.unwrap(), (1600, 1600));
    assert!(backend.get_max_dpi(VIPER).await.unwrap() > 0);
}
