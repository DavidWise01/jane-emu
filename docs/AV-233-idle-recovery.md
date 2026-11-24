# AV-233 — Bounded idle recovery

At 360 advancing NES frames without an active action, when running and autoplay are true and pausedByHuman is false, bring the original nextActionFrame forward to the current frame. Cooldown 360 frames. Reset idle counters on cartridge/actor/clock changes. No controller dispatch, game reset, evidence promotion, or pause override. Stopped clocks require manual PLAY. Browser verification pending.
