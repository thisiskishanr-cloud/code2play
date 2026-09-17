# Architecture

One page, one canvas, one game loop. No framework, no bundler, no state library.

## Load order

`index.html` loads seven plain scripts in sequence. They are not ES modules, so
they share one global lexical scope and the game runs from `file://` as well as
from a server. Order is a real dependency: `core` declares `S`, `P`, `keys` and
the collision helpers that everything else reads.

```
core → audio → world → ui → missions → render → main
```

`main.js` starts `requestAnimationFrame(loop)` at the bottom, so nothing runs
until every other file has been parsed.

## The loop

```js
loop(now)
  raw = clamped delta
  update(raw * S.timeScale)   // world simulation, slowed during impact beats
  tickHUD(raw)                // HUD numbers count up in real time, never slowed
  draw()
```

`S.timeScale` is what `hitStop()` manipulates, which is why the HUD is ticked
with the unscaled delta — the slow-motion should not slow the payout counter.

## Rendering

`draw()` does one `save()` / `restore()` pair. Inside it, the transform is
`translate(centre + shake) → scale(cam.z) → translate(-cam)`, so all world
drawing is in world coordinates. Screen-space work (rain, darkening, payout
flash, off-screen objective arrow) happens after the `restore()`.

Draw order is back to front: ground, roads, crosswalks, park, lot, light pools,
props, vehicles, ambulance, buildings, markers, people sorted by `y`, player,
particles.

## People

Two groups, drawn together and sorted by `y`:

- `crowd` — twenty routed pedestrians plus five standing figures. Each has a
  `mode` (`walk`, `pause`, `stand`, `flee`, `gather`) and a fixed route from
  `ROUTES`. The state machine is about forty lines in `update()`.
- `NPC` — the five named characters the story needs: `owner`, `fighter`,
  `carOwn`, `kid`, `cop`. These are positioned by script, not by routes.

## Missions

Each is an `async` function that owns the player's attention while it runs.
`tryInteract()` sets `S.busy = true`, awaits the mission, then clears it.
`S.busy` gates player input, the interaction prompt, and further interactions.

Helpers a mission composes from: `banner()`, `say()`, `keypress()`, `choices()`,
`reward()`, `pop()`, `burst()`, `focusOn()` / `releaseCam()`, `hitStop()`,
`alarm()`, `actCard()`, `fadeOut()` / `fadeIn()`.

To add one:

1. Write the `async function`.
2. Add a marker position to `markerDefs`.
3. Add a line to `interactables()` gated on `S.act` and `S.mission`.
4. Set a flag in `S.flags` if the world should remember it.
5. Read that flag in `render.js` to change how the place looks later.

## Acts

`S.act` (1, 2, 3) and `S.mission` (a number, incremented as the player
progresses) decide which markers exist and how the city is drawn. The act
transitions are `act2Intro()`, `revealSequence()` and `act3Intro()` in
`missions.js`. `jumpToAct(n)` fakes the state a player would have arrived with,
for demo purposes.

## Audio

`js/audio.js` synthesises everything from oscillators: the reward arpeggio, hit
transients, the Act I music loop (a `setInterval` walking a note array), the low
drone after the reveal, the heartbeat, the siren, the glitch. There are no files
to load and no latency on first play beyond the `AudioContext` unlock, which
happens on the title screen's start button.
