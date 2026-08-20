//! What a frame costs.
//!
//! Composing colour, motion and brightness from different sources means
//! painting the matrix ourselves — `setKeyRow` per row, then `setCustom` to
//! show it — instead of asking the device for an effect it owns. That only
//! works if a frame is cheap enough to send many times a second, and this
//! measures how many.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test frame_budget -- --ignored --nocapture
//! ```
//!
//! ⚠️ This is an **upper bound, and a generous one**. A fake device writes to a
//! file; a real one goes on to a USB HID report the firmware has to accept. The
//! number here is the cost of DBus and the daemon alone — the floor beneath
//! which no real device can go, never what one will actually do.
#![cfg(target_os = "linux")]

use std::time::Instant;
use zbus::Connection;

const HUNTSMAN: &str = "XX0000000226"; // 9 x 22 — the largest matrix we serve
const TARTARUS: &str = "XX000000022B"; // 4 x 6
const BASILISK: &str = "XX0000000088"; // 1 x 14

#[zbus::proxy(
    interface = "razer.device.lighting.chroma",
    default_service = "org.razer"
)]
trait Chroma {
    #[zbus(name = "setKeyRow")]
    fn set_key_row(&self, payload: &[u8]) -> zbus::Result<()>;
    #[zbus(name = "setCustom")]
    fn set_custom(&self) -> zbus::Result<()>;
}

/// `[row, start_col, stop_col, r, g, b, r, g, b, …]` — one triplet per column
/// from `start` to `stop` inclusive. A count that disagrees with the bounds is
/// rejected by the driver.
fn row_payload(row: u8, columns: u8, rgb: (u8, u8, u8)) -> Vec<u8> {
    let mut payload = vec![row, 0, columns - 1];
    for _ in 0..columns {
        payload.extend_from_slice(&[rgb.0, rgb.1, rgb.2]);
    }
    payload
}

async fn paint(proxy: &ChromaProxy<'_>, rows: u8, columns: u8, tick: u8) {
    for row in 0..rows {
        let shade = tick.wrapping_add(row * 8);
        proxy
            .set_key_row(&row_payload(row, columns, (shade, 0, 255 - shade)))
            .await
            .expect("setKeyRow");
    }
    proxy.set_custom().await.expect("setCustom");
}

async fn measure(serial: &str, label: &str, rows: u8, columns: u8) {
    let conn = Connection::session()
        .await
        .expect("no session bus — run scripts/openrazer-fake.sh start");
    let proxy = ChromaProxy::builder(&conn)
        .path(format!("/org/razer/device/{serial}"))
        .unwrap()
        .build()
        .await
        .expect("no chroma interface");

    // Warm the connection: the first call pays for the name resolution.
    paint(&proxy, rows, columns, 0).await;

    const FRAMES: u32 = 200;
    let started = Instant::now();
    for tick in 0..FRAMES {
        paint(&proxy, rows, columns, tick as u8).await;
    }
    let elapsed = started.elapsed();

    let per_frame = elapsed / FRAMES;
    let calls = u32::from(rows) + 1;
    println!(
        "  {label:<10} {rows}x{columns:<3} {calls:>3} calls/frame  \
         {:>7.2?}/frame  {:>6.0} fps  {:>7.2?}/call",
        per_frame,
        1.0 / per_frame.as_secs_f64(),
        per_frame / calls,
    );
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn frame_cost_by_matrix_size() {
    println!("\n  upper bound — a fake device writes a file, real hardware also talks USB\n");
    measure(HUNTSMAN, "Huntsman", 9, 22).await;
    measure(TARTARUS, "Tartarus", 4, 6).await;
    measure(BASILISK, "Basilisk", 1, 14).await;
    println!();
}

/// Building a proxy per call is cheap enough to leave alone.
///
/// `backend::dbus` builds a fresh one inside every method, and the engine
/// measures ~10.2ms a frame where this file measures ~7.8ms for the same ten
/// calls with one proxy reused. The proxy looked like the obvious suspect. It
/// is not: rebuilding costs about 10% more per call, well under the run to run
/// spread, so caching proxies would buy a fraction of a millisecond and cost a
/// lifetime on every backend method. The rest of that gap is not accounted for
/// — most likely the difference between a tight loop here and one that also
/// composes, measures and yields to the scheduler thirty times a second.
///
/// This test exists to stop the next person chasing it too.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn rebuilding_the_proxy_costs_more_than_the_call() {
    let conn = Connection::session().await.expect("no session bus");
    let path = format!("/org/razer/device/{HUNTSMAN}");

    let reused = ChromaProxy::builder(&conn)
        .path(path.clone())
        .unwrap()
        .build()
        .await
        .unwrap();
    reused.set_custom().await.unwrap(); // warm

    const CALLS: u32 = 200;

    let started = Instant::now();
    for _ in 0..CALLS {
        reused.set_custom().await.unwrap();
    }
    let with_one_proxy = started.elapsed() / CALLS;

    let started = Instant::now();
    for _ in 0..CALLS {
        let fresh = ChromaProxy::builder(&conn)
            .path(path.clone())
            .unwrap()
            .build()
            .await
            .unwrap();
        fresh.set_custom().await.unwrap();
    }
    let with_a_fresh_one = started.elapsed() / CALLS;

    println!("\n  one proxy reused : {with_one_proxy:?}/call");
    println!("  rebuilt each time: {with_a_fresh_one:?}/call\n");

    // Not "cheaper" — the two are close enough that either can win a given
    // run. What is worth holding is that rebuilding never becomes expensive.
    assert!(
        with_a_fresh_one < with_one_proxy * 2,
        "rebuilding a proxy has become worth avoiding: \
         {with_a_fresh_one:?} against {with_one_proxy:?}"
    );
}

/// Every row is one round trip, so the cost tracks the row count rather than
/// the number of LEDs. Worth knowing before designing anything that redraws:
/// a 9-row keyboard costs nine times a single-row mouse, whatever the width.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn cost_is_paid_per_row_not_per_led() {
    let conn = Connection::session().await.expect("no session bus");
    let proxy = ChromaProxy::builder(&conn)
        .path(format!("/org/razer/device/{HUNTSMAN}"))
        .unwrap()
        .build()
        .await
        .expect("no chroma interface");

    async fn time(proxy: &ChromaProxy<'_>, rows: u8, columns: u8) -> std::time::Duration {
        let started = Instant::now();
        for tick in 0..100u32 {
            paint(proxy, rows, columns, tick as u8).await;
        }
        started.elapsed() / 100
    }

    let one_wide = time(&proxy, 1, 22).await;
    let nine_wide = time(&proxy, 9, 22).await;
    let one_narrow = time(&proxy, 1, 2).await;

    println!("\n  1 row  x 22 cols : {one_wide:?}");
    println!("  9 rows x 22 cols : {nine_wide:?}");
    println!("  1 row  x  2 cols : {one_narrow:?}\n");

    // Nine rows cost far more than one; a wide row costs barely more than a
    // narrow one. If this ever stops holding, the payload has become the
    // bottleneck rather than the round trip.
    assert!(nine_wide > one_wide * 3, "rows should dominate");
}
