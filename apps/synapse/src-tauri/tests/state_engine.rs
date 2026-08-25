//! Groups as the application state owns them, including what survives a
//! restart.
//!
//! ```sh
//! scripts/openrazer-fake.sh start
//! eval "$(scripts/openrazer-fake.sh env)"
//! cargo test --test state_engine -- --ignored --test-threads=1
//! ```
//!
//! ⚠️ `--test-threads=1`. These set `XDG_CONFIG_HOME` so they write to a
//! scratch directory instead of the real one, and that is process-wide.
#![cfg(target_os = "linux")]

use std::path::PathBuf;

use app_lib::razer::engine::ambience::Ambience;
use app_lib::razer::engine::cadence::Cadence;
use app_lib::razer::engine::frame::Rgb;
use app_lib::razer::state::RazerState;

/// Points the config at a scratch directory, empty unless asked otherwise.
fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("synapse-state-{name}"));
    std::fs::remove_dir_all(&dir).ok();
    std::fs::create_dir_all(&dir).unwrap();
    std::env::set_var("XDG_CONFIG_HOME", &dir);
    dir
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_first_run_puts_everything_in_one_group_and_draws_it() {
    scratch("first-run");

    let state = RazerState::new().await;
    let groups = state.groups().await;

    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].group.members.len(), 6);
    assert!(groups[0].group.started, "the first run draws");
    // Started means running, not merely marked.
    assert_eq!(groups[0].devices.len(), 6);
    assert!(state.unassigned().await.unwrap().is_empty());

    state.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn what_was_running_is_running_again_after_a_restart() {
    let dir = scratch("restart");

    {
        let state = RazerState::new().await;
        let id = state.groups().await[0].group.id;
        state.stop_group(id).await;
        state.rename_group(id, "Desk").await.unwrap();
        state.stop_all().await;
    }

    // A second launch reads the same file.
    assert!(dir.join("synapse/groups.json").exists());
    let restarted = RazerState::new().await;
    let groups = restarted.groups().await;

    assert_eq!(groups[0].group.name, "Desk", "the name did not survive");
    assert!(
        !groups[0].group.started,
        "a stopped group came back running"
    );
    assert!(groups[0].devices.is_empty());

    restarted.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_broken_file_is_not_silently_replaced() {
    let dir = scratch("broken");
    std::fs::create_dir_all(dir.join("synapse")).unwrap();
    std::fs::write(dir.join("synapse/groups.json"), "{ not json").unwrap();

    let state = RazerState::new().await;

    // No groups, and nothing invented — the file is still there to repair.
    assert!(state.groups().await.is_empty());
    assert_eq!(state.unassigned().await.unwrap().len(), 6);
    assert_eq!(
        std::fs::read_to_string(dir.join("synapse/groups.json")).unwrap(),
        "{ not json",
        "the unreadable file was overwritten"
    );
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_participant_cannot_be_taken_by_a_second_group() {
    scratch("clash");
    let state = RazerState::new().await;
    let held = state.groups().await[0].group.members[0].clone();

    let refused = state
        .create_group("Other", vec![held.clone()], Ambience::still(Rgb::BLACK))
        .await;

    assert!(refused.is_err(), "two groups claimed one device");
    state.stop_all().await;
}

#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn every_change_is_on_disk_before_it_returns() {
    let dir = scratch("saves");
    let state = RazerState::new().await;
    let id = state.groups().await[0].group.id;

    state.set_group_cadence(id, Cadence::Slow).await.unwrap();

    // No natural moment to batch on: the user closes the window rather than
    // the application, so a change that is not saved now may never be.
    let written = std::fs::read_to_string(dir.join("synapse/groups.json")).unwrap();
    assert!(written.contains("\"slow\""), "{written}");

    state.stop_all().await;
}
