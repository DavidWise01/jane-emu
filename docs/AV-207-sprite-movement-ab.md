# AV-207 — Real NES sprite movement and A/B gameplay

**Phase 7:** 3 of 8 implementation turns (37.5%), with **0 independently verified live-browser gameplay gates**. Phase 6 freeze remains unchanged.

## Concrete gameplay implementation

AV-207 adds `dashboard/av207_sprite_mechanics.js`, a small state-closed-loop play policy. Only while the original AV-201 homebrew loss cartridge is loaded, its observer is armed for the identical session root/ROM, and real NES RAM $0005 reports mode 1 (playing), the production `chooseAction()` loop asks AV-207 what controller action to execute.

The policy's repeatable actions are:
- RIGHT until real NES RAM X ($0002) reaches 136
- A until real NES RAM palette ($0004) becomes $16
- LEFT until X reaches 104
- B until palette becomes $2A

Each step advances **only on measured RAM changes**, never on the action offer itself. The existing JSNES input dispatcher performs the actual held keypress; AV-207 never writes emulated RAM or creates a second controller. A change of run root, cartridge, active player, or frame rewind resets the local gameplay goal. All other cartridges retain existing gameplay and coaching strategies.

## Verification

- `tests/av207_sprite_mechanics.test.cjs` passed a controlled-input functional test covering directional goals, A/B palette goals, completed laps, defeat gating, owner change, and root reset.
- All **183** inline scripts in `dashboard/arena.html` parsed without error.
- `tests/av207_browser_sprite_actions.test.cjs` loads the real AV-201 cartridge into the original Chromium NES and verifies the actual 256×240 canvas still exists, x position changes at least 16 pixels, actual palette RAM changes, and the four mechanical offers occur during an observed gameplay lap. It is wired to GitHub Actions as **nonblocking diagnostic**, because its result has NOT been independently confirmed.
- The deterministic unit check is a blocking CI step.

**Not verified:** actual Chromium gameplay acceptance, the newest Pages deployment, commercial ROM gameplay or real Punch-Out win/loss transitions. Do not treat green workflow status as gameplay proof.

## Next natural bound — AV-208

Inspect Chromium outcomes and improve real button selection with goal-driven decisions rather than a fixed repeating demonstration. Confirm the resulting visible NES effects in the live browser, keeping the full play area, the existing PLAY/LEARN/VERIFY tools, and Jane→Toph→Patricia controller ownership.

`.dlw`
