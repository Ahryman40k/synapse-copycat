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

/// ⚠️ What Quit does, and the defect it fixes.
///
/// `stop_all` was written for the real quit — "so the devices are not left
/// being driven by a process that is going away" — and was wired to nothing.
/// The tray's Quit was a bare `app.exit(0)`, so quitting left every device
/// showing its last frame with nothing still running that could turn it off.
///
/// Both halves matter. Stopping has to actually stop the engines, and it must
/// **not** clear `started`: quitting the application is not switching the
/// ambience off, and the next launch has to bring the room back.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn quitting_stops_the_engines_and_still_comes_back_next_launch() {
    let dir = scratch("quit");

    {
        let state = RazerState::new().await;
        let running = state.groups().await;
        assert!(running[0].group.started, "the first run draws");
        assert!(
            !running[0].devices.is_empty(),
            "started should mean running, not merely marked"
        );

        // ⚠️ A rename only to get the group on disk. A first run builds it in
        // memory and saves nothing until something changes it, so without this
        // the relaunch below would be another first run and would prove
        // nothing about what was restored. Reported separately — it is not
        // what this test is about.
        state
            .rename_group(running[0].group.id, "Desk")
            .await
            .unwrap();

        // What Quit now reaches, through `lifecycle::quiesce`.
        state.stop_all().await;

        let quiet = state.groups().await;
        assert!(
            quiet[0].devices.is_empty(),
            "a device is still being driven by a process that is quitting"
        );
        assert!(
            quiet[0].group.started,
            "quitting un-marked the group, so the next launch would open dark"
        );
    }

    // And it does come back. This is why `stop_all` deliberately differs from
    // `stop`, which does clear the flag.
    assert!(dir.join("synapse/groups.json").exists());
    let relaunched = RazerState::new().await;
    let restored = relaunched.groups().await;

    assert_eq!(
        restored[0].group.name, "Desk",
        "a different group came back"
    );
    assert!(restored[0].group.started);
    assert!(
        !restored[0].devices.is_empty(),
        "the ambience did not resume after a quit"
    );

    relaunched.stop_all().await;
}

/// ⚠️ A first run has to write itself down.
///
/// Every other save happens because the user changed something. A first run
/// changes nothing — the "All devices" group is invented at startup — so the
/// file did not exist until the user happened to rename a group or move a
/// slider, and until then a quit lost the lot. `next_id` went with it, which
/// is worse than losing a group: ids would be handed out a second time and a
/// reference the interface still held would quietly address a different group.
#[tokio::test]
#[ignore = "needs the fake daemon: scripts/openrazer-fake.sh start"]
async fn a_first_run_is_on_disk_before_anything_is_changed() {
    let dir = scratch("first-run-saves");

    let state = RazerState::new().await;
    let invented = state.groups().await;

    // Nothing has been asked of it — no rename, no slider.
    let written = std::fs::read_to_string(dir.join("synapse/groups.json"))
        .expect("a first run saved nothing, so quitting would lose it");

    assert!(written.contains("All devices"), "{written}");
    // The counter matters as much as the groups: reused ids address the
    // wrong group rather than merely losing one.
    assert!(
        written.contains("\"nextId\":1") || written.contains("\"nextId\": 1"),
        "next_id did not survive: {written}"
    );

    state.stop_all().await;

    // And a relaunch restores rather than re-inventing — same id, not a
    // second group built from scratch.
    let relaunched = RazerState::new().await;
    let restored = relaunched.groups().await;
    assert_eq!(restored.len(), 1);
    assert_eq!(restored[0].group.id, invented[0].group.id);

    relaunched.stop_all().await;
}
