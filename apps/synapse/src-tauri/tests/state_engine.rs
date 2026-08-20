//! The engine's lifecycle as the application state owns it.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test state_engine -- --ignored
//! ```
#![cfg(target_os = "linux")]

use app_lib::razer::backend::BackendError;
use app_lib::razer::engine::ambience::Ambience;
use app_lib::razer::engine::cadence::Cadence;
use app_lib::razer::engine::frame::Rgb;
use app_lib::razer::state::RazerState;

const RED: Rgb = Rgb::new(255, 0, 0);
const BLUE: Rgb = Rgb::new(0, 0, 255);

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn the_engine_is_lodged_but_not_running() {
    let state = RazerState::new().await;

    // Starting on launch would paint every device with a default nobody chose,
    // overwriting whatever lighting was already there. It waits to be asked.
    assert!(!state.is_drawing().await);
    assert!(state.ambience_status().await.is_none());
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn starting_draws_on_every_device_the_daemon_reports() {
    let state = RazerState::new().await;

    let status = state
        .start_ambience(Ambience::still(RED), Cadence::Normal)
        .await
        .expect("the daemon is up");

    assert_eq!(status.devices.len(), 6);
    assert!(status.skipped.is_empty(), "{:?}", status.skipped);
    assert!(state.is_drawing().await);

    state.stop_ambience().await;
    assert!(!state.is_drawing().await);
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn starting_twice_replaces_rather_than_stacks() {
    let state = RazerState::new().await;

    state
        .start_ambience(Ambience::still(RED), Cadence::Normal)
        .await
        .unwrap();
    let second = state
        .start_ambience(Ambience::still(BLUE), Cadence::Slow)
        .await
        .unwrap();

    // Two engines on one device would each keep undoing the other, and both
    // dirty-row memories would be wrong.
    assert_eq!(second.ambience, Ambience::still(BLUE));
    assert_eq!(second.cadence, Cadence::Slow);
    assert_eq!(second.devices.len(), 6);

    state.stop_ambience().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn changing_the_ambience_needs_one_to_be_running() {
    let state = RazerState::new().await;

    // Silently starting would hide a caller that forgot to, and would light
    // devices the user never asked for.
    let refused = state.set_ambience(Ambience::still(BLUE)).await;
    assert!(matches!(refused, Err(BackendError::Protocol(_))));

    state
        .start_ambience(Ambience::still(RED), Cadence::Normal)
        .await
        .unwrap();
    state.set_ambience(Ambience::still(BLUE)).await.unwrap();

    let status = state.ambience_status().await.expect("running");
    assert_eq!(status.ambience, Ambience::still(BLUE));

    state.stop_ambience().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn stopping_twice_is_harmless() {
    let state = RazerState::new().await;

    state
        .start_ambience(Ambience::still(RED), Cadence::Normal)
        .await
        .unwrap();
    state.stop_ambience().await;
    state.stop_ambience().await;

    assert!(!state.is_drawing().await);
}
