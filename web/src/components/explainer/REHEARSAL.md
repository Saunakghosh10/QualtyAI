# Rehearsal: How Qualty works

**Gold:** `examples/hero-demo` (one window that runs off the stage edge, named targets, cursor beats) and
`examples/story` (one scene that changes state in place). Kept: the window crop, the `data-target` and
`data-cursor` beats, one state object per scene. Changed: four scenes with crossfades between them
instead of one dashboard, Qualty's tokens from `globals.css` mapped onto `--ss-*`, and Qualty's own copy
from ServiceStore, OrderRooms and local-store.

**Beats:**
1. Store: the port changes from All ports to Mundra, the Mundra Cargo Surveyors row arrives ($780 per inspection), and the cursor clicks Book now.
2. Pay: invoice INV-1042 for $780.00, a UTR reference is typed, I have paid, Waiting, then Payment confirmed. Chatroom opened.
3. Chatroom: Broken 4%, the seal photo and Moisture 13.2% arrive, then the flag "Broken 4% is above the booked 3%." (The compact layout keeps the first two posts and the flag.)
4. Certificate: COQ-2026-0001-7F3A with check code K7QD-M2XP, the code is typed into Check a certificate, then Verify.
The loop restarts at step 1. The step buttons jump to a step, and the loop carries on from there.

**Captured widths:** 1280 (wide stage 960×440) and 390 (compact stage 358×340, the window bleeds off the right and bottom).
**Looks:** light theme only. Dark comes from Qualty's `[data-theme="dark"]` tokens through the same variables and was not filmed.
**Reduced motion:** no loop and no cursor. Each step shows its settled still (`settled(scene)`), and the step buttons switch between stills.

**Gate:** `node scripts/film.mjs "<url>/#how-it-works" --select '#how-it-works .ss-stage' --width 1280|390 --gate`
printed `rehearsal passed` at both widths. Coverage is "inconclusive" because of sampling gaps over 27ms
in headless Chrome. The only console error is a 404 for `/favicon.ico`, which the app was already missing.

**Fresh eye:** I read every frame of both contact sheets. Fixed during review: the first post was cut off
by the chatroom header, the flag was below the fold in compact, the scene crossfade showed two scenes
at once, and the pay field stretched the full window width.

**Assumptions:** the reference UTR 4021 7733 9810, INV-1042 and K7QD-M2XP are sample values in Qualty's own formats.
**Unresolved:** on a cold load at 390, the kit's Stage renders the wide layout for one frame before
it measures and switches to compact (a jump at 0.05s). The gate does not count it as a never-intentional line.
**Not watched:** dark theme, and widths between 640 and 1280 (the stage scales down to fit them).
