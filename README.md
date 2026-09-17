# +500

A short narrative crime game. Act I rewards robbery, violence and theft with cash,
XP and reputation. Act II connects every one of those rewards to a person. Act III
makes you keep playing in the city you changed.

Hackathon prototype, theme: *The Unexpected Consequence*.

## Run it

No build step, no install, no backend. Two options:

**Open directly** — double-click `index.html`. Everything works from `file://`
because the scripts are plain `<script>` tags rather than ES modules.

**Serve it locally** (recommended while developing):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or, if you prefer Node:

```bash
npx serve .
```

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Move |
| `Shift` | Sprint |
| `E` | Interact, advance dialogue, throw a punch |
| `1` `2` `3` | Jump straight to Act I / II / III |
| `R` | Restart |

`1` `2` `3` exist for the live pitch: they set the money, XP and crime flags a
player would have at that point, so you can rehearse the reveal without
replaying Act I.

## Project layout

```
index.html        markup: canvas, HUD, overlays
css/style.css     all styling and UI animation
js/core.js        canvas sizing, game state (S), input, collision
js/audio.js       Web Audio synthesis — every sound is generated, no audio files
js/world.js       city geometry, props, entities, pedestrians, camera, crowd reactions
js/ui.js          HUD, banners, reward pops, dialogue, choices, overlays, particles
js/missions.js    mission logic, the three acts, the reveal, presenter jumps
js/render.js      per-frame canvas drawing
js/main.js        update loop
assets/fonts/     empty — see the README in there if you want offline fonts
docs/             the original design document and an architecture note
```

Script order in `index.html` matters: `core` → `audio` → `world` → `ui` →
`missions` → `render` → `main`. They share top-level `const`/`let` bindings
rather than importing from each other.

## Assets

There are none, by design. Every visual is drawn procedurally with Canvas 2D
rectangles, arcs and gradients; every sound is synthesised at runtime with
oscillators. Nothing is fetched at runtime except the two webfonts, and the
game degrades to system fonts without them.

## Where the game state lives

`S` in `js/core.js` is the whole game. The part that matters for the story is
`S.flags`:

```js
S.flags = { robbedStore, npcInjured, carStolen, policeAttention, finalChoice, walkedAway }
```

These are set during Act I crimes and never shown to the player. Act II and III
read them to change the world: the store's windows go dark and a CLOSED card
appears, an ambulance blinks at the alley, a dashed outline marks the empty
parking space. If you add a crime, set a flag for it and read that flag when
drawing the later acts — that is the entire consequence system.

## Things worth knowing before you extend it

- `alarm(x, y, kind)` in `js/world.js` is how a crime makes the block react:
  nearby pedestrians flee, mid-distance ones gather, police attention rises and
  a siren answers a beat later. Call it from any new crime.
- `focusOn(x, y, zoom)` / `releaseCam()` push the camera into an interaction and
  let it go again. `hitStop(scale, ms)` is the slow-motion beat on impacts.
- Pedestrian routes in `ROUTES` are fixed loops on purpose. Random wandering
  eventually strands someone inside a wall, which is not something you want
  happening two minutes into a pitch.
- Mission sequences are `async` functions that `await` short waits and
  keypresses. Adding a mission means writing one of those and registering a
  marker in `interactables()` in `js/missions.js`.
