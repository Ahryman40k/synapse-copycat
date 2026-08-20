//! The engine driving a whole setup.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test engine -- --ignored --nocapture
//! ```
#![cfg(target_os = "linux")]

use std::sync::Arc;
use std::time::Duration;

use app_lib::razer::backend::{dbus::DbusBackend, DeviceBackend};
use app_lib::razer::engine::ambience::{Ambience, MotionSource};
use app_lib::razer::engine::cadence::Cadence;
use app_lib::razer::engine::frame::Rgb;
use app_lib::razer::engine::Engine;

async fn backend() -> Arc<dyn DeviceBackend> {
    Arc::new(
        DbusBackend::new()
            .await
            .expect("no daemon — run scripts/openrazer-fake.sh start"),
    )
}

async fn every_device(backend: &Arc<dyn DeviceBackend>) -> Vec<String> {
    backend.list_devices().await.expect("listing failed")
}

fn moving() -> Ambience {
    Ambience {
        motion: MotionSource::Wave {
            laps_per_second: 0.5,
            width: 0.2,
        },
        ..Ambience::still(Rgb::new(0, 200, 255))
    }
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn drives_every_device_it_is_given() {
    let backend = backend().await;
    let serials = every_device(&backend).await;

    let engine = Engine::start(backend, &serials, moving(), Cadence::Normal).await;

    assert_eq!(engine.device_count(), serials.len());
    assert!(engine.skipped().is_empty(), "{:?}", engine.skipped());

    // Both classes are present in the set, and the engine says which is which
    // rather than pretending they are alike.
    let statuses = engine.statuses();
    assert!(statuses.iter().any(|d| d.painted), "nothing is painted");
    assert!(
        statuses.iter().any(|d| !d.painted),
        "the headset and the single-LED mousemat should be approximated"
    );

    engine.stop().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_device_it_cannot_reach_is_skipped_not_fatal() {
    let backend = backend().await;
    let mut serials = every_device(&backend).await;
    serials.push("XXNOTADEVICE".to_string());

    let engine = Engine::start(backend, &serials, moving(), Cadence::Normal).await;

    // A peripheral unplugged between enumeration and here must not cost the
    // user the ambience on everything else.
    assert_eq!(engine.skipped().len(), 1);
    assert_eq!(engine.skipped()[0].serial, "XXNOTADEVICE");
    assert!(!engine.skipped()[0].because.is_empty(), "say why");
    assert_eq!(engine.device_count(), serials.len() - 1);

    engine.stop().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn changing_the_ambience_is_one_send() {
    let backend = backend().await;
    let serials = every_device(&backend).await;
    let engine = Engine::start(
        backend,
        &serials,
        Ambience::still(Rgb::new(255, 0, 0)),
        Cadence::Normal,
    )
    .await;

    tokio::time::sleep(Duration::from_millis(100)).await;
    engine.set_ambience(moving());
    assert_eq!(engine.ambience(), moving());

    tokio::time::sleep(Duration::from_millis(200)).await;
    engine.stop().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn reports_what_each_device_costs() {
    let backend = backend().await;
    let serials = every_device(&backend).await;
    let engine = Engine::start(backend, &serials, moving(), Cadence::Normal).await;

    // The meters report about once a second.
    tokio::time::sleep(Duration::from_millis(1400)).await;

    println!();
    for device in engine.statuses() {
        let a = device.achieved;
        println!(
            "  {}  {:<12} {:>3} frames  {:>9.2?}/frame  every {} tick(s)  {:>5.1} Hz",
            device.serial,
            if device.painted {
                "painted"
            } else {
                "approximated"
            },
            a.frames,
            a.per_frame,
            a.every,
            a.effective_hertz()
        );
    }
    println!();

    let measured: Vec<_> = engine
        .statuses()
        .into_iter()
        .filter(|d| d.achieved.frames > 0)
        .collect();
    assert!(!measured.is_empty(), "no device reported anything");

    // Against the budget, not against `keeps_up`. That method reserves half
    // the interval as room for the *other* devices, which is the right
    // question to ask of one device alone — and the wrong one here, where all
    // six are running and consuming exactly the room it was holding back.
    // Asserting it of every device at once asks for the same margin six times,
    // and failed about one run in three.
    let budget = Cadence::Normal.budget();
    for device in &measured {
        assert!(
            device.achieved.per_frame < budget,
            "{} took {:?}, over the {:?} interval",
            device.serial,
            device.achieved.per_frame,
            budget
        );
    }

    engine.stop().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn dropping_the_engine_stops_the_drawing() {
    let backend = backend().await;
    let serials = every_device(&backend).await;

    {
        let _engine = Engine::start(backend.clone(), &serials, moving(), Cadence::Normal).await;
        tokio::time::sleep(Duration::from_millis(100)).await;
        // Falls out of scope here, taking the ambience sender with it.
    }

    // The runners see the closed channel on their next tick and return. There
    // is no token to forget to signal.
    tokio::time::sleep(Duration::from_millis(300)).await;

    // And the devices are usable again by whoever comes next. Whether this
    // particular one accepts a global chroma call is beside the point — the
    // engine must not have left anything holding it.
    let _ = backend.set_chroma_static(&serials[0], 0, 0, 0).await;
}
