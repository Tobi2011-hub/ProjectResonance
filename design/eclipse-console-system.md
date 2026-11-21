# Eclipse Console — visual system

## Art direction and mood board

An orbital observatory sits at the edge of the void: dark mineral glass, fine instrument lines, quiet concentric orbits, distant cyan signal light, and a restrained violet eclipse. The atmosphere is spacious and precise, with luminous color reserved for active state, pickups, and danger. Existing character frames and pixel animation remain recognizable; weapon glints, invulnerability rim light, and console framing bring them into the new world without changing their gameplay silhouettes.

The original vector backdrop at `public/game/bg/eclipse-console.svg` is the mood-board anchor. It combines a black-blue void, a thin eclipse corona, orbital paths, a star field, and a receding observatory grid. No external artwork or sprite packs are used.

## Tokens

| Role | Color |
| --- | --- |
| Void / page | `#07111D` |
| Deep panel | `#0B1B29` |
| Raised glass | `#102535` |
| Fine borders | `#254151` |
| Signal / focus | `#56EFD9` |
| Echo / secondary | `#BC9AFF` |
| Hazard | `#FF796F` |
| Reward | `#FFD98A` |
| Primary text | `#E4F3F4` |
| Muted text | `#9DB6BE` |

Typography uses Rajdhani for display and interface text with a restrained mono face for instrumentation. Use 8px spacing increments, 10px minimum compact mobile labels and 12px for general mobile copy, 44px minimum control hit areas, fine 1px rules, and softly rounded 10–16px glass panels. Cyan denotes active/focus, violet denotes navigation/secondary data, coral denotes danger, and gold denotes rewards. Do not use hue as the only state cue; pair it with icons, text, or shape.

## Layout and readability

- Desktop content uses a centered 1200px rail; compact screens use 12–20px gutters and fluid `clamp()` sizing.
- Keep the playfield center free of persistent interface. HUD stays at the top edge and touch controls at the lower corners, padded by safe-area insets.
- Preserve button focus rings, visible pressed states, and reduced-motion support. Keep decorative layers pointer-transparent.
- Text and controls sit on opaque or blurred dark surfaces. Important copy targets WCAG AA contrast (4.5:1 for body text and 3:1 for large text and controls).
- Gameplay colors remain legible against each zone: platforms use a bright top edge and a darker body; hazards retain warm coral/red; collectibles retain warm gold; characters receive a cyan rim light.

## Screen coverage

The shared shell system covers Title and save/settings panels, Campaign and Challenge maps, Shop, Customization, Arcade setup/results, stage intro/results, the in-game HUD, pause/tutorial overlays, and responsive touch controls. Campaign, Challenge, Arcade, and trials inherit the same glass console framing; per-zone colors and silhouettes remain distinct. No level geometry, physics, or progression rules are changed by this visual system.

### Delivery checklist

- [x] Main menu branding, menu, save slot, settings, and save/load panels
- [x] Campaign map and stage details
- [x] Shop and customization/loadout screens
- [x] In-game HUD, pause menu, tutorial/narrative, and stage results
- [x] Challenge ladder, trial-stage intro, results, and Arcade setup/results
- [x] Campaign and trial scene atmosphere, retaining per-zone identity and all existing geometry
- [x] Desktop and mobile framing, safe-area padding, thumb controls, button states, and readable compact labels
- [x] Logo/favicon, shared typography, surfaces, focus treatment, and transitions
- [ ] New character sprite sheets: existing licensed/project sprites retained; no external sprite pack added
- [ ] New music or sound effects: audio was outside the visual-only scope

## Delivery notes

- Artwork: original SVG created for this project; no third-party artwork or sprite licensing dependencies.
- Typefaces: existing Google Fonts imports (Rajdhani and Press Start 2P); no additional font files.
- Implementation: shared CSS tokens and CSS/SVG atmosphere; existing sprite sheets and game geometry retained.
- Accessibility: reduced-motion rules retained, keyboard focus remains visible, hazards retain warm color coding, and high-contrast canvas mode remains supported.

## Changelog

- Replaced the previous magenta arcade-shell palette with Eclipse Console void, signal, and echo tokens.
- Added an original responsive vector eclipse observatory backdrop and reused it behind menus and maps.
- Restyled shared panels, buttons, focus and pressed states, title treatment, HUD surfaces, touch controls, and mobile spacing.
- Added a low-opacity orbital instrument treatment to each canvas scene without changing world geometry.
- Added slow observatory drift, a passing signal sweep, orbit breathing, panel arrival, and responsive hover movement; all are disabled or reduced for `prefers-reduced-motion`.
