/**
 * DIALOGUE — the training banter shown at the start of each stage.
 * {JUMP}/{FIRE}/{DASH}/{SWAP} are replaced with the player's own keys.
 */
const T = (title, text) => ({ title, text });

export const TUTORIALS = {
  1: [
    T("LEGS: DETECTED", "Left and right move you. Gravity does the rest, and it never takes a day off."),
    T("DASH BRRR", "Press the dash button to cross a gap . Works mid air too, but only once."),
    T("PEW PEW", "Fire shoots. Swap flips your two weapons. Ammo runs dry — punch crates or kill bots to refill."),
  ],
  2: [
    T("WALL ETIQUETTE", "Slide down a wall, then jump to kick off it. Walls hate this one trick."),
    T("GRAVITY IS A SUGGESTION", "Tap jump for a hop, hold it for a proper jump. The floor is not your friend."),
    T("SHARD HUNTER", "Five resonance shards hide in every stage. Find all five in one run and reality opens a side door."),
  ],
  3: [
    T("TRAP TIMING", "Those spikes breathe. Watch the blink, move on the exhale."),
    T("CHECKPOINT CULTURE", "Flags save your spot. Dying teleports you there instead of the beginning, which is generous."),
    T("WEAPON SCIENCE", "Blade: instant. Plasma: explodes. Buster: pierces. Scatter: three chances to miss."),
  ],
  4: [
    T("THREE ROADS", "There is always a low road, a middle road and a smug high road. All three reach the exit."),
    T("ELEVATORS EXIST", "Moving platforms shut off. Stand on one and enjoy a free ride."),
    T("HIDDEN SHARDS", "Resonance shards love alcoves, roofs, shafts and anything with the word 'unnecessary' in it."),
  ],
  5: [
    T("LIVES, PLURAL", "You get three tries per stage. Run out and the whole stage restarts, no hard feelings."),
    T("FLAWLESS", "Clear a stage without dying and earn the flawless shard. It is smug about it."),
    T("COIN RUSH", "Stages 1, 3 and 5 hide ten coins. Take every one in a run to earn a weapon."),
  ],
  6: [
    T("UP AND OVER", "Stacked platforms mean the high route is usually faster and usually meaner."),
    T("NO FALL DAMAGE", "Falling does not hurt. Landing on a saw does. Physics is fair like that."),
    T("MAGNETISM", "Nearby pickups drift toward you once you own the right ability."),
  ],
  7: [
    T("SPEEDRUNNERS", "The dash has a cooldown. Chain ground dashes for distance, save the air dash for panic."),
    T("THE HIGH ROAD", "Shards sit above the obvious path. Look up. Then jump up."),
    T("OVERDRIVE", "Upgrades live in the rift stages. They apply to every stage on this save."),
  ],
  8: [
    T("ALMOST THERE", "Two stages to the Void Core. The platforms get ruder from here."),
    T("BOSS MANNERS", "The Void Core flashes before every attack. That flash is the polite part."),
    T("PHASE TWO", "Chip half its health and it changes everything. Teleports, orbital rain, aimed fans."),
  ],
  9: [
    T("FINAL APPROACH", "Everything you learned, all at once, on smaller platforms. Lovely."),
    T("RIFT DOORS", "Rift stages appear on the map once you collect all five shards in one run."),
    T("FLAWLESS VAULTS", "Perfect a stage and a vault opens. Vaults pay orbs by the handful."),
  ],
  10: [
    T("VOID CORE", "The door seals. Dash under the leap, jump the shockwave, keep shooting. Then it gets angry."),
  ],
  11: [T("RIFT: ASCENT", "Nothing below but sky. Aerial Leap is waiting at the top of this tower.")],
  12: [T("RIFT: GLASS", "Saws, timed spikes, and narrow ledges. Phase Dash cuts through all of it.")],
  13: [T("RIFT: WINDWARD", "Long gaps, drifting platforms. Featherfall turns a fall into a plan.")],
  14: [T("RIFT: DEEP VAULT", "A maze with teeth. Shard Magnet makes the secrets come to you.")],
  15: [T("RIFT: FOUNDRY", "Everything at once. Finish it and Overdrive is yours forever.")],
  16: [T("VAULT: SHARD SHRINE", "Six resonance shards on Stage 2 opened this. Orbs, oodles of them.")],
  17: [T("VAULT: ECHO HOLLOW", "Six resonance shards on Stage 4. Echoes of every jump you ever missed.")],
  18: [T("VAULT: RESONANCE DEEP", "Six resonance shards on Stage 6. The deepest room in the project.")],
  19: [T("ASHEN CAUSEWAY", "Keep your pace steady. The route gets rougher beyond the next rise.")],
  20: [T("PRISM BREAK", "Watch the footing. The safest path may not be the fastest one.")],
  21: [T("TEMPEST CROWN", "Use the upper route when the ground becomes dangerous.")],
  22: [T("GILDED UNDERTOW", "Read each landing before committing to the next jump.")],
  23: [T("FROSTLINE COLLAPSE", "The hazards are close together here. Keep moving between them.")],
  24: [T("DUSK ENGINE", "Save your strongest attacks for the reinforced guards.")],
  25: [T("SOLAR RUPTURE", "One last long route. Keep your focus to the exit.")],
  26: [T("ECLIPSE HEART", "The core is unstable. Stay mobile while it changes its attack pattern.")],
};
