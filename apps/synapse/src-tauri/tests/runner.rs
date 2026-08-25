//! The loop, running against a live daemon.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test runner -- --ignored --nocapture
//! ```
#![cfg(target_os = "linux")]

use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::watch;

use app_lib::capability::TwinklyPool;
use app_lib::razer::engine::ambience::{Ambience, MotionSource};
use app_lib::razer::engine::cadence::{Achieved, Cadence};
use app_lib::razer::engine::frame::{Geometry, Rgb};
use app_lib::razer::engine::runner::Runner;
use openrazer::backend::{dbus::DbusBackend, DeviceBackend};

/// An empty pool: these tests drive Razer devices only, and an empty pool is
/// exactly what a machine with no Twinkly has.
fn no_strips() -> TwinklyPool {
    TwinklyPool::default()
}

const HUNTSMAN: &str = "XX0000000226"; // 9 x 22
const KRAKEN: &str = "XX0000000527"; // no matrix
const GOLIATHUS: &str = "XX0000000C02"; // 1 x 1

async fn backend() -> Arc<dyn DeviceBackend> {
    Arc::new(
        DbusBackend::new()
            .await
            .expect("no daemon — run scripts/openrazer-fake.sh start"),
    )
}

fn moving() -> Ambience {
    Ambience {
        motion: MotionSource::Wave {
            laps_per_second: 0.5,
            width: 0.2,
        },
        ..Ambience::still(Rgb::new(255, 64, 0))
    }
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn attaches_to_each_device_as_it_can_be_driven() {
    let backend = backend().await;

    let keyboard = Runner::attach(Some(backend.clone()), &no_strips(), HUNTSMAN)
        .await
        .unwrap();
    assert!(keyboard.is_painted());
    assert_eq!(keyboard.geometry(), Geometry::new(9, 22));

    // No matrix at all: it belongs to the ambience through a single averaged
    // colour, which is not a failure to handle but the only thing it can show.
    let headset = Runner::attach(Some(backend.clone()), &no_strips(), KRAKEN)
        .await
        .unwrap();
    assert!(!headset.is_painted());

    // And one that *has* a matrix of exactly one pixel. Painting it would cost
    // a round trip per frame to say what setStatic says once.
    let mousemat = Runner::attach(Some(backend.clone()), &no_strips(), GOLIATHUS)
        .await
        .unwrap();
    assert!(!mousemat.is_painted());
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn runs_until_the_ambience_channel_closes() {
    let backend = backend().await;
    let runner = Runner::attach(Some(backend), &no_strips(), HUNTSMAN)
        .await
        .unwrap();
    let (ambience, receiver) = watch::channel(moving());

    let task = tokio::spawn(runner.run(receiver, Cadence::Normal, None));
    tokio::time::sleep(Duration::from_millis(200)).await;
    assert!(!task.is_finished(), "it should still be drawing");

    // Dropping the sender is the whole shutdown protocol: no token to thread
    // through, and no way to leave a runner going by forgetting to signal it.
    drop(ambience);

    let stopped = tokio::time::timeout(Duration::from_secs(2), task).await;
    assert!(stopped.is_ok(), "the runner outlived its ambience");
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn reports_what_the_cadence_actually_cost() {
    let backend = backend().await;
    let runner = Runner::attach(Some(backend), &no_strips(), HUNTSMAN)
        .await
        .unwrap();
    let (ambience, receiver) = watch::channel(moving());
    let (report, mut achieved) = watch::channel(Achieved {
        requested: Cadence::Normal,
        per_frame: Duration::ZERO,
        frames: 0,
        every: 1,
    });

    let task = tokio::spawn(runner.run(receiver, Cadence::Normal, Some(report)));

    // The meter reports about once a second.
    tokio::time::timeout(Duration::from_secs(3), achieved.changed())
        .await
        .expect("no report inside three seconds")
        .expect("the runner dropped the reporter");

    let measured = *achieved.borrow_and_update();
    println!(
        "\n  {} frames, {:?}/frame, every {} tick(s), {:.1} effective Hz\n",
        measured.frames,
        measured.per_frame,
        measured.every,
        measured.effective_hertz()
    );

    // A 30Hz cadence over about a second.
    assert!(measured.frames >= 20, "only {} frames", measured.frames);
    assert!(measured.keeps_up(), "a keyboard should hold 30Hz");

    drop(ambience);
    let _ = task.await;
}

/// The reason each device gets its own task. Painted in sequence, these four
/// would spend the sum of their costs inside one interval.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn drives_a_whole_setup_at_once() {
    let backend = backend().await;
    let (ambience, receiver) = watch::channel(moving());

    let mut tasks = Vec::new();
    for serial in [HUNTSMAN, KRAKEN, GOLIATHUS, "XX0000000088", "XX000000022B"] {
        let runner = Runner::attach(Some(backend.clone()), &no_strips(), serial)
            .await
            .unwrap();
        tasks.push(tokio::spawn(runner.run(
            receiver.clone(),
            Cadence::Normal,
            None,
        )));
    }

    let began = Instant::now();
    tokio::time::sleep(Duration::from_millis(500)).await;
    assert!(
        tasks.iter().all(|task| !task.is_finished()),
        "a runner died while the ambience was still up"
    );

    drop(ambience);
    for task in tasks {
        let _ = tokio::time::timeout(Duration::from_secs(2), task).await;
    }
    println!(
        "\n  five devices, half a second, stopped in {:?}\n",
        began.elapsed()
    );
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn follows_the_ambience_when_it_changes() {
    let backend = backend().await;
    let runner = Runner::attach(Some(backend), &no_strips(), HUNTSMAN)
        .await
        .unwrap();
    let (ambience, receiver) = watch::channel(Ambience::still(Rgb::new(255, 0, 0)));

    let task = tokio::spawn(runner.run(receiver, Cadence::Normal, None));
    tokio::time::sleep(Duration::from_millis(100)).await;

    // A still ambience sends nothing after its first frame; changing it has to
    // wake the drawing up again rather than leave the old picture in place.
    ambience.send(Ambience::still(Rgb::new(0, 0, 255))).unwrap();
    tokio::time::sleep(Duration::from_millis(100)).await;
    assert!(!task.is_finished());

    drop(ambience);
    let _ = task.await;
}
