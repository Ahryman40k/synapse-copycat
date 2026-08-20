//! Drawing on a live device.
//!
//! The unit tests prove the picture is right; this proves it reaches the
//! hardware, and — the part that matters for the budget — that a frame which
//! has not changed costs nothing.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test painter -- --ignored --nocapture
//! ```
#![cfg(target_os = "linux")]

use app_lib::razer::backend::dbus::DbusBackend;
use app_lib::razer::engine::ambience::{Ambience, MotionSource, Tick};
use app_lib::razer::engine::frame::{Geometry, Rgb};
use app_lib::razer::engine::painter::{Canvas, Painter};

const HUNTSMAN: &str = "XX0000000226"; // 9 x 22
const KRAKEN: &str = "XX0000000527"; // no matrix at all
const GOLIATHUS: &str = "XX0000000C02"; // 1 x 1

async fn backend() -> DbusBackend {
    DbusBackend::new()
        .await
        .expect("no daemon — run scripts/openrazer-fake.sh start")
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn discovers_what_each_device_can_take() {
    let backend = backend().await;

    assert_eq!(
        Canvas::discover(&backend, HUNTSMAN).await.unwrap(),
        Canvas::Matrix(Geometry::new(9, 22))
    );
    // A headset has no matrix and no setKeyRow. Not an error — a class of
    // device the engine cannot drive, which the caller has to know about.
    assert_eq!(
        Canvas::discover(&backend, KRAKEN).await.unwrap(),
        Canvas::EffectsOnly
    );
    // And a mousemat that is one single LED: paintable, but nothing to draw.
    let goliathus = Canvas::discover(&backend, GOLIATHUS).await.unwrap();
    assert_eq!(goliathus, Canvas::Matrix(Geometry::new(1, 1)));
    assert!(!goliathus.geometry().unwrap().can_hold_a_picture());
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn the_first_frame_is_sent_whole() {
    let backend = backend().await;
    let geometry = Geometry::new(9, 22);
    let mut painter = Painter::new(HUNTSMAN, geometry);

    let frame = Ambience::still(Rgb::new(255, 0, 0)).compose(geometry, Tick::at(0.0));

    // Nothing is known to be on the device, so all nine rows go out.
    assert_eq!(painter.draw(&backend, &frame).await.unwrap(), 9);
}

/// The measurement said a frame costs one round trip per row and the payload is
/// nearly free, so the only way to make an ambience affordable is to send fewer
/// rows. This is that, working.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_still_ambience_costs_nothing_to_hold() {
    let backend = backend().await;
    let geometry = Geometry::new(9, 22);
    let mut painter = Painter::new(HUNTSMAN, geometry);
    let still = Ambience::still(Rgb::new(0, 128, 255));

    painter
        .draw(&backend, &still.compose(geometry, Tick::at(0.0)))
        .await
        .unwrap();

    // Ten seconds later the picture is identical, so not one row is sent — and
    // not even `setCustom`, which would be a round trip to redisplay what is
    // already displayed.
    for second in 1..=10 {
        let frame = still.compose(geometry, Tick::at(second as f32));
        assert_eq!(painter.draw(&backend, &frame).await.unwrap(), 0);
    }
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_wave_redraws_only_the_rows_it_touches() {
    let backend = backend().await;
    // One row per LED strip, wide: a wave moves along the columns, so on a
    // matrix every row changes together. Use a mouse-shaped strip instead,
    // where the interesting number is that the whole thing is two round trips.
    let geometry = Geometry::new(1, 22);
    let mut painter = Painter::new(HUNTSMAN, geometry);
    let wave = Ambience {
        motion: MotionSource::Wave {
            columns_per_second: 8.0,
            width: 3.0,
        },
        ..Ambience::still(Rgb::new(255, 255, 255))
    };

    painter
        .draw(&backend, &wave.compose(geometry, Tick::at(0.0)))
        .await
        .unwrap();

    // Moving, so the row is dirty every frame — one row, not nine.
    let moved = painter
        .draw(&backend, &wave.compose(geometry, Tick::at(0.25)))
        .await
        .unwrap();
    assert_eq!(moved, 1);
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn forgetting_makes_the_next_frame_whole_again() {
    let backend = backend().await;
    let geometry = Geometry::new(9, 22);
    let mut painter = Painter::new(HUNTSMAN, geometry);
    let still = Ambience::still(Rgb::new(10, 20, 30));
    let frame = still.compose(geometry, Tick::at(0.0));

    painter.draw(&backend, &frame).await.unwrap();
    assert_eq!(painter.draw(&backend, &frame).await.unwrap(), 0);

    // Something else painted over us — a hardware effect, another client, the
    // daemon restoring persistence. What we think is up is no longer true.
    painter.forget();
    assert_eq!(painter.draw(&backend, &frame).await.unwrap(), 9);
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_frame_of_the_wrong_shape_is_refused_before_it_reaches_the_wire() {
    let backend = backend().await;
    let mut painter = Painter::new(HUNTSMAN, Geometry::new(9, 22));

    let wrong = Ambience::still(Rgb::new(1, 1, 1)).compose(Geometry::new(1, 14), Tick::at(0.0));

    assert!(painter.draw(&backend, &wrong).await.is_err());
}
