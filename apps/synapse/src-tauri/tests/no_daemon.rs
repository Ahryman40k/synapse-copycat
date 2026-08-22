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
