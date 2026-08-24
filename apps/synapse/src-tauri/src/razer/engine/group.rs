//! Groups: who shows which ambience.
//!
//! A group is a set of participants and one ambience across them. Which is
//! almost exactly what an `Engine` already is — one ambience, a set of runners
//! — so a group at rest is its configuration, and a group running is an
//! `Engine` built from it.
//!
//! **A participant belongs to at most one group.** Two engines painting one
//! device would each keep undoing the other, and both dirty-row memories would
//! be wrong. The `Conductor` refuses rather than allowing it quietly.
//!
//! A third state is legitimate and has to be visible: **unassigned**. Not
//! driven, not broken — left to whatever hardware effect it was showing. That
//! is what ignoring a keyboard means.
//!
//! Everything here is configuration and rules, with no bus and no device. Only
//! `start` needs a backend.

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};

use openrazer::backend::DeviceBackend;

use crate::capability::TwinklyPool;

use super::ambience::Ambience;
use super::cadence::Cadence;
use super::{DeviceStatus, Engine, Skipped};

pub type GroupId = u32;

/// A participant's identifier.
///
/// A `String`, and deliberately opaque: today every one is an OpenRazer serial,
/// and tomorrow a Govee strip or a Hue bulb will need something that is not.
/// Nothing here may assume its shape.
pub type ParticipantId = String;

/// A group at rest: what it is, not what it is doing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: GroupId,
    pub name: String,
    pub members: Vec<ParticipantId>,
    pub ambience: Ambience,
    pub cadence: Cadence,
    /// Whether it should be drawing. Kept here rather than inferred from a
    /// running engine, so a group can be prepared and left off — an evening
    /// ambience set up in the afternoon.
    pub started: bool,
}

/// A group, and how it is going if it is running.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupStatus {
    pub group: Group,
    pub devices: Vec<DeviceStatus>,
    pub skipped: Vec<Skipped>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum GroupError {
    UnknownGroup {
        id: GroupId,
    },
    /// The rule that keeps two engines off one device.
    #[serde(rename_all = "camelCase")]
    AlreadyTaken {
        participant: ParticipantId,
        by: GroupId,
    },
}

impl std::fmt::Display for GroupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownGroup { id } => write!(f, "no group {id}"),
            Self::AlreadyTaken { participant, by } => {
                write!(f, "{participant} already belongs to group {by}")
            }
        }
    }
}

impl std::error::Error for GroupError {}

/// Owns the groups and the engines running them.
#[derive(Default)]
pub struct Conductor {
    groups: Vec<Group>,
    running: HashMap<GroupId, Engine>,
    next_id: GroupId,
}

impl Conductor {
    /// What a machine looks like the first time the app opens: everything in
    /// one group, and that group drawing.
    ///
    /// ⚠️ This does light the hardware without being asked, overwriting
    /// whatever effect was on it. That is the deliberate choice — an
    /// application that opens on an empty page teaches nothing — and it is
    /// reversible in one click, because `started` is a state the user owns.
    pub fn with_everything(participants: Vec<ParticipantId>, ambience: Ambience) -> Self {
        let mut conductor = Self::default();
        let id = conductor.next_id();
        conductor.groups.push(Group {
            id,
            name: "All devices".into(),
            members: participants,
            ambience,
            cadence: Cadence::default(),
            started: true,
        });
        conductor
    }

    /// Rebuilds from a saved file. Nothing is running until `start_marked`.
    pub fn restore(groups: Vec<Group>, next_id: GroupId) -> Self {
        Self {
            groups,
            running: HashMap::new(),
            next_id,
        }
    }

    /// The next id that would be handed out. Saved, so that ids are never
    /// reused across runs — a stale reference held by the interface must not
    /// quietly address a different group.
    pub fn next_id_value(&self) -> GroupId {
        self.next_id
    }

    fn next_id(&mut self) -> GroupId {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    pub fn groups(&self) -> &[Group] {
        &self.groups
    }

    pub fn group(&self, id: GroupId) -> Option<&Group> {
        self.groups.iter().find(|group| group.id == id)
    }

    /// Which group holds this participant, if any.
    pub fn holder_of(&self, participant: &str) -> Option<GroupId> {
        self.groups
            .iter()
            .find(|group| group.members.iter().any(|m| m == participant))
            .map(|group| group.id)
    }

    /// Everything the daemon reports that no group has claimed.
    ///
    /// Worth showing rather than omitting: an unassigned device looks exactly
    /// like one the app failed to notice.
    pub fn unassigned<'a>(&self, all: &'a [ParticipantId]) -> Vec<&'a ParticipantId> {
        all.iter()
            .filter(|participant| self.holder_of(participant).is_none())
            .collect()
    }

    /// Creates a group. Fails if any participant already belongs to another.
    pub fn create(
        &mut self,
        name: impl Into<String>,
        members: Vec<ParticipantId>,
        ambience: Ambience,
    ) -> Result<GroupId, GroupError> {
        self.check_free(&members, None)?;
        let id = self.next_id();
        self.groups.push(Group {
            id,
            name: name.into(),
            members,
            ambience,
            cadence: Cadence::default(),
            started: false,
        });
        Ok(id)
    }

    /// Removes a group and stops it. Its participants become unassigned, and
    /// keep showing whatever was last drawn on them.
    pub async fn remove(&mut self, id: GroupId) -> Result<(), GroupError> {
        self.require(id)?;
        self.stop(id).await;
        self.groups.retain(|group| group.id != id);
        Ok(())
    }

    /// Replaces a group's membership. Fails if a participant belongs elsewhere.
    ///
    /// Does not restart a running group: the change takes effect on the next
    /// start, which is deliberate. Rebuilding the engine under a live ambience
    /// would blink every device in the group to change one of them.
    pub fn set_members(
        &mut self,
        id: GroupId,
        members: Vec<ParticipantId>,
    ) -> Result<(), GroupError> {
        self.require(id)?;
        self.check_free(&members, Some(id))?;
        self.group_mut(id).members = members;
        Ok(())
    }

    /// Changes what a group shows. Takes effect at once when it is running —
    /// this is the one change the engine can absorb without rebuilding.
    pub fn set_ambience(&mut self, id: GroupId, ambience: Ambience) -> Result<(), GroupError> {
        self.require(id)?;
        self.group_mut(id).ambience = ambience.clone();
        if let Some(engine) = self.running.get(&id) {
            engine.set_ambience(ambience);
        }
        Ok(())
    }

    /// Changes a group's rate. Applies on the next start: the cadence is the
    /// interval each runner ticks on, and there is no way to retune one that is
    /// already running.
    pub fn set_cadence(&mut self, id: GroupId, cadence: Cadence) -> Result<(), GroupError> {
        self.require(id)?;
        self.group_mut(id).cadence = cadence;
        Ok(())
    }

    pub fn rename(&mut self, id: GroupId, name: impl Into<String>) -> Result<(), GroupError> {
        self.require(id)?;
        self.group_mut(id).name = name.into();
        Ok(())
    }

    // ── running ───────────────────────────────────────────────────────────────

    pub fn is_running(&self, id: GroupId) -> bool {
        self.running.contains_key(&id)
    }

    /// Starts a group, replacing its engine if it was already running.
    pub async fn start(
        &mut self,
        id: GroupId,
        backend: Arc<dyn DeviceBackend>,
        strips: &TwinklyPool,
    ) -> Result<(), GroupError> {
        self.require(id)?;
        self.stop(id).await;

        let group = self.group(id).expect("checked").clone();
        let engine = Engine::start(
            backend,
            strips,
            &group.members,
            group.ambience,
            group.cadence,
        )
        .await;
        self.running.insert(id, engine);
        self.group_mut(id).started = true;
        Ok(())
    }

    /// Stops a group. The devices keep the last frame — stopping an ambience
    /// and going dark are two different requests.
    pub async fn stop(&mut self, id: GroupId) {
        if let Some(engine) = self.running.remove(&id) {
            engine.stop().await;
        }
        if self.group(id).is_some() {
            self.group_mut(id).started = false;
        }
    }

    /// Starts every group marked as started. What launch does, once there is a
    /// saved configuration to restore.
    pub async fn start_marked(&mut self, backend: Arc<dyn DeviceBackend>, strips: &TwinklyPool) {
        let wanted: Vec<GroupId> = self
            .groups
            .iter()
            .filter(|group| group.started)
            .map(|group| group.id)
            .collect();
        for id in wanted {
            let _ = self.start(id, backend.clone(), strips).await;
        }
    }

    pub async fn stop_all(&mut self) {
        let ids: Vec<GroupId> = self.running.keys().copied().collect();
        for id in ids {
            if let Some(engine) = self.running.remove(&id) {
                engine.stop().await;
            }
        }
    }

    pub fn status(&self) -> Vec<GroupStatus> {
        self.groups
            .iter()
            .map(|group| {
                let engine = self.running.get(&group.id);
                GroupStatus {
                    group: group.clone(),
                    devices: engine.map(Engine::statuses).unwrap_or_default(),
                    skipped: engine.map(|e| e.skipped().to_vec()).unwrap_or_default(),
                }
            })
            .collect()
    }

    // ── internals ─────────────────────────────────────────────────────────────

    fn require(&self, id: GroupId) -> Result<(), GroupError> {
        self.group(id)
            .map(|_| ())
            .ok_or(GroupError::UnknownGroup { id })
    }

    fn group_mut(&mut self, id: GroupId) -> &mut Group {
        self.groups
            .iter_mut()
            .find(|group| group.id == id)
            .expect("caller checked with `require`")
    }

    /// No participant may be claimed twice. `excluding` is the group being
    /// edited, which is allowed to keep the members it already has.
    fn check_free(
        &self,
        members: &[ParticipantId],
        excluding: Option<GroupId>,
    ) -> Result<(), GroupError> {
        for participant in members {
            if let Some(holder) = self.holder_of(participant) {
                if Some(holder) != excluding {
                    return Err(GroupError::AlreadyTaken {
                        participant: participant.clone(),
                        by: holder,
                    });
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::razer::engine::frame::Rgb;

    fn red() -> Ambience {
        Ambience::still(Rgb::new(255, 0, 0))
    }

    fn ids(names: &[&str]) -> Vec<ParticipantId> {
        names.iter().map(|n| (*n).to_string()).collect()
    }

    #[test]
    fn the_first_run_puts_everything_in_one_started_group() {
        let conductor = Conductor::with_everything(ids(&["kbd", "mouse"]), red());

        let group = &conductor.groups()[0];
        assert_eq!(group.members, ids(&["kbd", "mouse"]));
        assert!(group.started, "it draws from the first open");
        assert!(conductor.unassigned(&ids(&["kbd", "mouse"])).is_empty());
    }

    #[test]
    fn a_participant_cannot_be_claimed_twice() {
        let mut conductor = Conductor::default();
        let first = conductor
            .create("Desk", ids(&["kbd", "mouse"]), red())
            .unwrap();

        // Two engines on one device would each undo the other, and both
        // dirty-row memories would be wrong.
        let clash = conductor.create("Evening", ids(&["mouse"]), red());

        assert_eq!(
            clash,
            Err(GroupError::AlreadyTaken {
                participant: "mouse".into(),
                by: first,
            })
        );
    }

    #[test]
    fn editing_a_group_may_keep_its_own_members() {
        let mut conductor = Conductor::default();
        let id = conductor
            .create("Desk", ids(&["kbd", "mouse"]), red())
            .unwrap();

        // Adding one while keeping the others must not read as a clash with
        // itself.
        conductor
            .set_members(id, ids(&["kbd", "mouse", "mat"]))
            .expect("its own members are not taken from it");

        assert_eq!(conductor.group(id).unwrap().members.len(), 3);
    }

    #[test]
    fn what_no_group_claims_is_unassigned() {
        let mut conductor = Conductor::default();
        conductor.create("Desk", ids(&["kbd"]), red()).unwrap();

        let all = ids(&["kbd", "mouse", "mat"]);
        let loose = conductor.unassigned(&all);

        // Not driven and not broken — left to whatever it was showing. Shown
        // rather than omitted, or it reads as a device the app missed.
        assert_eq!(loose, vec![&"mouse".to_string(), &"mat".to_string()]);
    }

    #[test]
    fn a_group_starts_life_stopped() {
        let mut conductor = Conductor::default();
        let id = conductor.create("Evening", ids(&["kbd"]), red()).unwrap();

        // Prepared in the afternoon, run at night.
        assert!(!conductor.group(id).unwrap().started);
        assert!(!conductor.is_running(id));
    }

    #[test]
    fn changing_the_ambience_of_a_stopped_group_is_remembered() {
        let mut conductor = Conductor::default();
        let id = conductor.create("Evening", ids(&["kbd"]), red()).unwrap();
        let blue = Ambience::still(Rgb::new(0, 0, 255));

        conductor.set_ambience(id, blue.clone()).unwrap();

        assert_eq!(conductor.group(id).unwrap().ambience, blue);
    }

    #[test]
    fn operations_on_a_group_that_does_not_exist_say_so() {
        let mut conductor = Conductor::default();

        assert_eq!(
            conductor.rename(7, "x"),
            Err(GroupError::UnknownGroup { id: 7 })
        );
        assert_eq!(
            conductor.set_ambience(7, red()),
            Err(GroupError::UnknownGroup { id: 7 })
        );
        assert_eq!(
            conductor.set_cadence(7, Cadence::Slow),
            Err(GroupError::UnknownGroup { id: 7 })
        );
    }

    #[tokio::test]
    async fn removing_a_group_frees_its_participants() {
        let mut conductor = Conductor::default();
        let id = conductor.create("Desk", ids(&["kbd"]), red()).unwrap();

        conductor.remove(id).await.unwrap();

        assert!(conductor.groups().is_empty());
        // And the participant can join another group afterwards.
        conductor.create("Other", ids(&["kbd"]), red()).unwrap();
    }

    #[test]
    fn ids_are_not_reused_after_a_removal() {
        let mut conductor = Conductor::default();
        let first = conductor.create("A", ids(&["kbd"]), red()).unwrap();
        conductor.groups.retain(|g| g.id != first);
        let second = conductor.create("B", ids(&["kbd"]), red()).unwrap();

        // A stale id from the interface must not silently address a new group.
        assert_ne!(first, second);
    }
}
