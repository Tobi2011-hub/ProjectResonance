# CyberPulse Dash — code guide

Everything in this folder is plain JavaScript and CSS. Nothing is hidden and
nothing is generated at runtime except the graphics you see on the canvas.

The project was deliberately condensed: the game engine and the screens live in
a handful of files with clearly marked sections instead of dozens of tiny ones.

---

## 1. Get the code into VS Code

**Easiest (built for you):** open the published app and add
`/game-code.zip` to the address, e.g.
`https://amiable-cyber-pulse-dash.base44.app/game-code.zip`.
Download it, unzip it, then in VS Code: **File → Open Folder** → pick the
unzipped folder. (Click **Publish** in the editor once if the file is not
there yet, so the new build is live.)

**Alternative (recommended for long-term work):** in the editor's top bar,
**More actions → GitHub connection** links this app to a GitHub repository.
You can then clone it in VS Code and changes sync both ways.

**If you only want to read one file:** the editor's **More actions → See all
files** shows the same source online.

## 2. Run it locally

```bash
npm install
npm run dev        # opens http://localhost:5173
```

The project is a standard Vite + React app. `npm run build` produces the
production bundle in `dist/`.

Note: the app normally gets its login/database from Base44's SDK. The game
itself (title screen, world map, stages, save data) runs entirely in the
browser, so you can play it locally without any backend setup.

---

## 3. Where things are

Only four files make up the game itself:

```
src/game/
  core.js        ★ ALL the tuning numbers + physics + input + sound + effects
                 + the save file. Sections are numbered 1–6 in the file.
  entities.js    weapons, the player, enemy variants, the Void Core boss
                 (sections 1–4)
  world.js       image assets, sprite drawing, the stage generator and all
                 canvas rendering (sections 1–4)
  engine.js      the frame loop that ties everything together: camera, shards,
                 lives, checkpoints, boss trigger, win/lose
```

The screens are four pages, each with the UI pieces it needs:

```
src/pages/
  Title.jsx      title screen, new game / load / settings / exit
  WorldMap.jsx   stage select, rifts, shard counter, and per-stage progress briefing
  Customize.jsx  character, colours and weapon loadout with save confirmation
  Stage.jsx      stage-entry briefing and the gameplay canvas

src/components/
  game/GameUI.jsx             backdrop, canvas host, HUD, tutorial box, clear card
  title/TitlePanels.jsx       logo, menu, pop-up frame, Load / Settings / Confirm / Exit
  customize/CustomizePieces.jsx  sprite preview, frame picker, armour, weapons

public/game/            image assets (characters, tiles, backgrounds)
docs/GAME_GUIDE.md      this file
```

## 4. The numbers you will actually want to change

All of these are in **`src/game/core.js`, section 1 (TUNING)**, each with an
inline comment:

| Feel | Values |
| --- | --- |
| Slippery / sticky movement | `ACCEL`, `AIR_ACCEL`, `TURN_ACCEL`, `FRICTION` |
| Speed and weight | `RUN_SPEED`, `GRAVITY`, `MAX_FALL` |
| Jump height and forgiveness | `JUMP_V`, `JUMP_CUT`, `COYOTE`, `JUMP_BUFFER` |
| Dash distance and frequency | `DASH_SPEED`, `DASH_TIME`, `DASH_COOLDOWN` |
| Wall behaviour | `WALL_SLIDE_SPEED`, `WALL_JUMP_VX`, `WALL_JUMP_VY` |
| Difficulty | `MAX_HEALTH`, `PLAYER_DAMAGE_MULTIPLIER`, `START_LIVES`, `ENEMY_DAMAGE`, `BOSS_DAMAGE`, `SPIKE_DAMAGE` |
| Resonance shards | `STARS_COLLECTIBLE`, `STARS_TOTAL` (legacy save-compatible names) |

Rule of thumb: higher acceleration and friction = less slippery. Higher gravity
and lower jump velocity = tighter, heavier platforming.

## 5. Common changes

**Unlock level select.** Collect all five standard shards in every stage except
Stage 10, where the Void Core drops one Grand Gem, and collect all 30 hidden
coins across coin-challenge stages 1, 3 and 5. Coin progress saves per pickup.
The title-screen Level Select then opens all main and secret stages.

**Customize a loadout.** The title-screen Customization hub saves the selected
frame, Armor/Plate/Glow colors, primary and secondary weapons, and an
unrestricted list of equipped abilities. Ability ranks are selected separately;
rank 2 appears once unlocked. Permanent ranks remain in `save.abilities`, while
`save.abilityLoadout` controls what the player receives when a stage starts.

**Make a stage longer.** In `world.js`, find the `MAIN` table near the bottom of
the LEVELS section and raise that stage's `width` (in tiles). More width = more
ground, more gaps and more room for the generator to place platforms and shards.

**Make the boss harder.** In `entities.js`, section 4 (BOSS): raise
`phaseOneMaxHp` or the Phase 2 multiplier in `startPhaseTwo()`, and shorten
the timings in `beginAttack()` / `toIdle()`. In `world.js`, Level 10's generated
platforming approach is followed by the fixed Void Core arena. Its final
checkpoint sits on the ledge before the drop into the arena. The arena locks
its camera and invisible side bounds, and deaths during the fight reset the
boss to Phase 1.
Its Phase 2 adds reachable moving spike platforms and an exoshield that stays
active until its spawned enemies are defeated. The single Grand Gem appears
only after Phase 2 is defeated; Level 10 has no regular shards or no-death star.
`BOSS_DAMAGE` in core.js controls how much a touch costs the player.
Player reloads refresh on each death: one is available per life normally, and
two are available while the boss encounter is active.

**Change the dialogue.** `TUTORIALS` at the top of the LEVELS section in
`world.js`. The `{JUMP}`, `{FIRE}`, `{DASH}` and `{SWAP}` placeholders are
replaced with the player's current keys — keep the braces.

**Add a secret stage.** In `core.js` (section 6, SAVE), add an entry to
`SECRET_STAGES` and `SECRET_ABILITIES`, and an ability to `ABILITIES`. Then add
its level config to `SECRETS` in `world.js`.

Each character's `startingAbility` in `CHARACTERS` is granted to the save when
the character is selected. All saved abilities are passed to the player. When
a rift reward is already owned, its rank increases and the clear reward also
grants the new `wallcling` ability if it has not been acquired yet.

Character purchases are shared across save slots: the save that bought each
character records the unlock, and removing that save removes its unlock unless
another save also owns the character.

**Change stage colours.** `PALETTES` in `world.js`, section 4 (RENDER) — sky,
floor top/mid/deep, line and accent per theme.

**Change the starting key bindings.** `DEFAULT_CONTROLS` in `core.js`,
section 3 (INPUT). Players can still rebind everything in Settings.

**Change a weapon.** `COOLDOWN` and the numbers inside `fireWeapon()` in
`entities.js`, section 1 (WEAPONS).

**Change an enemy variant.** `ENEMY_VARIANTS` and the `Enemy` class in
`entities.js` define enemy stats, colours and abilities. Exo Guards have a
separate shield pool: attacks must deplete it before damaging their health.
`buildStage()` in `world.js` assigns variants to generated patrols;
`drawEnemies()` tints their shared sprites and shows shield status. The
Settings screen's **Field Manual** describes the controls, collectibles and
enemy abilities for players.

## 6. Things to be careful with

- **Do not rename exports** (`RUN_SPEED`, `LEVELS`, `Player`...). Other files
  import them by those exact names.
- **`SAVE_KEY` in `core.js`** is the localStorage name. Renaming it makes every
  existing save disappear (it is not deleted, just no longer found).
- **`index.css`** holds the retro styling tokens (`.pa-panel`, `.pa-pixel`);
  Tailwind classes used in components must appear literally in the source.
- Sprite positions are deliberately rounded to whole pixels in `world.js`
  (RENDER). Removing those `Math.round` calls is what causes shimmering.

## 7. Asset pack used / to be used

The Sci-fi Platformer pack you supplied is **free for non-commercial projects
only**, modifications are allowed, resale/redistribution is not, and credit to
**Ozzbit Games** is required. Keep `public/game/credit.txt` (or a line on the
title screen) if you ship it publicly.
