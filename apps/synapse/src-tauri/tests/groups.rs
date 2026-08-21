//! Several groups drawing at once, on a live daemon.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test groups -- --ignored --nocapture
//! ```
#![cfg(target_os = "linux")]

use std::sync::Arc;
use std::time::Duration;

use app_lib::razer::backend::{dbus::DbusBackend, DeviceBackend};
use app_lib::razer::engine::ambience::{Ambience, MotionSource};
use app_lib::razer::engine::cadence::Cadence;
use app_lib::razer::engine::frame::Rgb;
use app_lib::razer::engine::group::Conductor;

const HUNTSMAN: &str = "XX0000000226";
const BASILISK: &str = "XX0000000088";
const KRAKEN: &str = "XX0000000527";
const GOLIATHUS: &str = "XX0000000C02";

async fn backend() -> Arc<dyn DeviceBackend> {
    Arc::new(
        DbusBackend::new()
            .await
            .expect("no daemon — run scripts/openrazer-fake.sh start"),
    )
}

fn ids(names: &[&str]) -> Vec<String> {
    names.iter().map(|n| (*n).to_string()).collect()
}

fn still(rgb: Rgb) -> Ambience {
    Ambience::still(rgb)
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
async fn two_groups_draw_different_ambiences_at_once() {
    let backend = backend().await;
    let mut conductor = Conductor::default();

    // What the user described: peripherals on one ambience, the rest on
    // another, and a keyboard left out of both.
    let desk = conductor
        .create("Desk", ids(&[BASILISK, GOLIATHUS]), moving())
        .unwrap();
    let quiet = conductor
        .create("Quiet", ids(&[KRAKEN]), still(Rgb::new(40, 0, 60)))
        .unwrap();

    conductor.start(desk, backend.clone()).await.unwrap();
    conductor.start(quiet, backend.clone()).await.unwrap();
    tokio::time::sleep(Duration::from_millis(300)).await;

    let status = conductor.status();
    assert_eq!(status.len(), 2);
    assert_eq!(status[0].devices.len(), 2);
    assert_eq!(status[1].devices.len(), 1);
    assert!(conductor.is_running(desk) && conductor.is_running(quiet));

    // The keyboard belongs to neither and is not being driven.
    let all = ids(&[HUNTSMAN, BASILISK, KRAKEN, GOLIATHUS]);
    assert_eq!(conductor.unassigned(&all), vec![&HUNTSMAN.to_string()]);

    conductor.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_group_can_be_prepared_and_run_later() {
    let backend = backend().await;
    let mut conductor = Conductor::default();
    let evening = conductor
        .create("Evening", ids(&[HUNTSMAN]), moving())
        .unwrap();

    assert!(!conductor.is_running(evening));
    assert!(!conductor.group(evening).unwrap().started);

    conductor.start(evening, backend).await.unwrap();
    assert!(conductor.group(evening).unwrap().started);

    conductor.stop(evening).await;
    // Stopped, not forgotten: the ambience is still there to run again.
    assert!(!conductor.group(evening).unwrap().started);
    assert_eq!(conductor.group(evening).unwrap().ambience, moving());
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn changing_a_running_group_takes_effect_without_a_restart() {
    let backend = backend().await;
    let mut conductor = Conductor::default();
    let id = conductor
        .create("Desk", ids(&[HUNTSMAN]), still(Rgb::new(255, 0, 0)))
        .unwrap();
    conductor.start(id, backend).await.unwrap();
    tokio::time::sleep(Duration::from_millis(100)).await;

    let blue = still(Rgb::new(0, 0, 255));
    conductor.set_ambience(id, blue).unwrap();
    tokio::time::sleep(Duration::from_millis(150)).await;

    // One send down the watch channel — the engine is not rebuilt, so nothing
    // blinks and the dirty-row memory survives.
    assert_eq!(conductor.group(id).unwrap().ambience, blue);
    assert!(conductor.is_running(id));

    conductor.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn the_first_run_lights_everything_in_one_group() {
    let backend = backend().await;
    let serials = backend.list_devices().await.unwrap();
    let mut conductor = Conductor::with_everything(serials.clone(), moving());

    conductor.start_marked(backend).await;
    tokio::time::sleep(Duration::from_millis(300)).await;

    let status = &conductor.status()[0];
    assert_eq!(status.devices.len(), serials.len());
    assert!(status.group.started);
    assert!(conductor.unassigned(&serials).is_empty());

    conductor.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn removing_a_group_stops_it_and_frees_its_participants() {
    let backend = backend().await;
    let mut conductor = Conductor::default();
    let id = conductor
        .create("Desk", ids(&[HUNTSMAN, BASILISK]), moving())
        .unwrap();
    conductor.start(id, backend.clone()).await.unwrap();

    conductor.remove(id).await.unwrap();

    assert!(!conductor.is_running(id));
    assert!(conductor.groups().is_empty());
    // Free again, so they can join something else.
    conductor
        .create("Other", ids(&[HUNTSMAN, BASILISK]), moving())
        .unwrap();
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn each_group_keeps_its_own_cadence() {
    let backend = backend().await;
    let mut conductor = Conductor::default();
    let fast = conductor
        .create("Fast", ids(&[HUNTSMAN]), moving())
        .unwrap();
    let slow = conductor.create("Slow", ids(&[KRAKEN]), moving()).unwrap();
    conductor.set_cadence(slow, Cadence::Slow).unwrap();

    conductor.start(fast, backend.clone()).await.unwrap();
    conductor.start(slow, backend.clone()).await.unwrap();
    tokio::time::sleep(Duration::from_millis(1300)).await;

    let status = conductor.status();
    for group in &status {
        for device in &group.devices {
            println!(
                "  {:<6} {}  {:>3} frames  {:>5.1} Hz",
                group.group.name,
                device.serial,
                device.achieved.frames,
                device.achieved.effective_hertz()
            );
        }
    }

    // A group of strips has no business at 30Hz, and does not have to drag the
    // keyboard down to say so.
    let frames = |name: &str| {
        status
            .iter()
            .find(|g| g.group.name == name)
            .unwrap()
            .devices[0]
            .achieved
            .frames
    };
    assert!(
        frames("Fast") > frames("Slow") * 2,
        "cadences did not differ"
    );

    conductor.stop_all().await;
}
