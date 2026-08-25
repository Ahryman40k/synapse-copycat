//! Starting up with no daemon at all.
//!
//! Its own test binary, so it gets its own process and can point
//! `DBUS_SESSION_BUS_ADDRESS` at nothing without disturbing the tests in
//! `dbus_backend.rs`, which need a real one.
//!
//! Unlike those, this one is **not** `#[ignore]`: needing no daemon is the
//! whole point, so it must run everywhere, every time.
#![cfg(target_os = "linux")]

use app_lib::razer::state::RazerState;
use openrazer::backend::BackendError;

/// `RazerState::new` used to return a `Result` that `lib.rs` unwrapped, so a
/// machine without OpenRazer got a panic and no window — which is most machines
/// that will ever install this. Construction has to succeed even when there is
/// nothing to connect to.
#[tokio::test]
async fn starts_without_a_daemon() {
    std::env::set_var(
        "DBUS_SESSION_BUS_ADDRESS",
        "unix:path=/nonexistent/openrazer-test-bus",
    );

    // The assertion is that this line returns at all.
    let state = RazerState::new().await;

    let refused = state.backend();
    assert!(refused.is_err(), "there is no daemon to find");
}

/// And it has to say *which* failure it is. An empty device list would read as
/// "no peripherals plugged in"; a transport error would read as a glitch worth
/// retrying. Neither is true — there is no daemon, and only the frontend can
/// tell the user to install one.
#[tokio::test]
async fn names_the_missing_daemon_rather_than_blaming_the_transport() {
    std::env::set_var(
        "DBUS_SESSION_BUS_ADDRESS",
        "unix:path=/nonexistent/openrazer-test-bus",
    );

    let state = RazerState::new().await;

    match state.backend() {
        Err(BackendError::DaemonUnavailable(reason)) => {
            assert!(!reason.is_empty(), "the reason is what the user is shown");
        }
        // `&dyn DeviceBackend` is not `Debug`, so the Ok arm cannot print it.
        Ok(_) => panic!("expected no backend at all"),
        Err(other) => panic!("expected DaemonUnavailable, got {other:?}"),
    }
}

/// The groups are the application's own, not the daemon's.
///
/// ⚠️ This is what broke a dashboard on a machine with a Twinkly and no Razer
/// hardware. `unassigned_participants` refused because there was no daemon to
/// list, and the frontend read it alongside the groups — so a refusal about
/// hardware nobody owns hid the groups, and nothing could be created or filled.
#[tokio::test]
async fn groups_survive_a_missing_daemon() {
    let state = RazerState::new().await;

    // Answers, rather than refusing: no daemon means no Razer devices, and a
    // participant found over the network is not the daemon's business.
    let unassigned = state.unassigned().await;
    assert!(
        unassigned.is_ok(),
        "a missing daemon must not hide the groups: {unassigned:?}"
    );

    // Nothing in the list, because nothing was found — which is a different
    // answer from refusing to say.
    assert_eq!(unassigned.unwrap(), Vec::<String>::new());
}

/// A group can run on a machine with no OpenRazer daemon.
///
/// ⚠️ The defect this covers, reported from a real machine: a light string in a
/// group, the group stopped, the string lit — and pressing Run changed nothing.
/// `start_group` took the backend or failed, so a group holding nothing the
/// daemon knows could never start at all. Nothing could ever light the strip,
/// and nothing could ever stop it either.
///
/// A Razer member with no daemon is reported as one participant that could not
/// be driven, which is what the interface already knows how to show — instead
/// of the whole group refusing.
#[tokio::test]
async fn a_group_starts_without_a_daemon() {
    let temporary = std::env::temp_dir().join(format!("synapse-nodaemon-{}", std::process::id()));
    std::fs::create_dir_all(&temporary).unwrap();
    std::env::set_var("XDG_CONFIG_HOME", &temporary);

    let state = RazerState::new().await;

    let id = state
        .with_groups(|conductor| {
            conductor.create(
                "G3",
                vec!["twinkly-000000000000".to_owned()],
                app_lib::razer::engine::ambience::Ambience::still(
                    app_lib::razer::engine::frame::Rgb::new(255, 0, 0),
                ),
            )
        })
        .await
        .unwrap();

    // Answers rather than refusing. The strip is not on this network either, so
    // it lands in `skipped` — which is a report, not a refusal.
    let started = state.start_group(id).await;
    assert!(started.is_ok(), "a group must start without a daemon: {started:?}");

    let status = state
        .groups()
        .await
        .into_iter()
        .find(|status| status.group.id == id)
        .expect("the group");

    assert!(status.group.started, "it should be running");
    assert_eq!(status.skipped.len(), 1, "{status:?}");

    let _ = std::fs::remove_dir_all(&temporary);
}
