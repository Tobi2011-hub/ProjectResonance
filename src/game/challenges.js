import { ROWS } from "./core";

export const CHALLENGES = [
  { id: 1, title: "Signal Run", subtitle: "A precision route under reduced power.", damage: 0.64, incoming: 1.05, health: 0.9, speed: 0.94, enemy: 1.12, code: "NOVA-01", accent: "#4be3ff", heights: [15, 14, 15, 13, 14, 12, 14, 15, 13, 12, 14], gaps: [2, 2, 2, 3, 2, 2, 3, 2, 2, 2, 0] },
  { id: 2, title: "Crossfire", subtitle: "No dash. Thread through the guard posts.", damage: 0.58, incoming: 1.2, health: 0.82, speed: 0.92, enemy: 1.28, disableDash: true, code: "ECHO-22", accent: "#7af6c8", heights: [15, 13, 14, 12, 15, 13, 11, 14, 12, 15, 13, 11], gaps: [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 2, 0] },
  { id: 3, title: "Thin Ice", subtitle: "Half ammo and no field reloads.", damage: 0.52, incoming: 1.35, health: 0.74, speed: 0.9, enemy: 1.48, ammo: 0.5, disableReload: true, code: "VOLT-33", accent: "#ffd166", heights: [15, 14, 12, 15, 13, 11, 14, 12, 15, 13, 11, 13, 12], gaps: [3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 2, 2, 0] },
  { id: 4, title: "No Safe Ground", subtitle: "Slow movement, no weapon swapping.", damage: 0.46, incoming: 1.5, health: 0.68, speed: 0.72, enemy: 1.68, disableSwap: true, code: "RIFT-44", accent: "#a78bfa", heights: [15, 12, 14, 11, 14, 12, 15, 12, 10, 13, 11, 14, 12], gaps: [3, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 2, 0] },
  { id: 5, title: "Overload", subtitle: "Low health and sealed abilities.", damage: 0.4, incoming: 1.7, health: 0.54, speed: 0.88, enemy: 1.92, noAbilities: true, code: "FLUX-55", accent: "#ff8a3d", heights: [15, 13, 11, 14, 12, 10, 13, 11, 14, 12, 10, 13, 11, 13], gaps: [3, 3, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 2, 0] },
  { id: 6, title: "Last Resonance", subtitle: "No dash, no abilities, one fragile frame.", damage: 0.32, incoming: 2, health: 0.42, speed: 0.82, enemy: 2.2, disableDash: true, noAbilities: true, ammo: 0.6, code: "ZENITH-66", accent: "#ff3d8b", heights: [15, 12, 10, 13, 11, 14, 10, 12, 15, 11, 9, 12, 10, 14, 11], gaps: [3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 2, 2, 0] },
  { id: 7, title: "Dead Channel", subtitle: "A long-range run with scarce ammo and no reloads.", damage: 0.3, incoming: 2.05, health: 0.42, speed: 0.86, enemy: 2.35, ammo: 0.4, disableReload: true, code: "DARK-77", accent: "#ff8a3d" },
  { id: 8, title: "Glass Horizon", subtitle: "Fragile frame. Every landing is under fire.", damage: 0.28, incoming: 2.2, health: 0.34, speed: 0.88, enemy: 2.5, disableDash: true, code: "GLASS-88", accent: "#a78bfa" },
  { id: 9, title: "Lockstep", subtitle: "No weapon swapping; plan every encounter ahead.", damage: 0.26, incoming: 2.3, health: 0.32, speed: 0.78, enemy: 2.65, disableSwap: true, code: "STEP-99", accent: "#4be3ff" },
  { id: 10, title: "Null Circuit", subtitle: "Abilities sealed, dash disabled, enemies reinforced.", damage: 0.24, incoming: 2.45, health: 0.3, speed: 0.82, enemy: 2.8, noAbilities: true, disableDash: true, code: "NULL-10", accent: "#7af6c8" },
  { id: 11, title: "Redline", subtitle: "Survive a fast route with a sliver of health.", damage: 0.22, incoming: 2.6, health: 0.25, speed: 0.92, enemy: 3, ammo: 0.45, code: "RED-11", accent: "#ff3d8b" },
  { id: 12, title: "Silent Arsenal", subtitle: "No abilities or reloads. Ammunition is your timer.", damage: 0.2, incoming: 2.8, health: 0.26, speed: 0.8, enemy: 3.15, ammo: 0.35, noAbilities: true, disableReload: true, code: "HUSH-12", accent: "#ffd166" },
  { id: 13, title: "Broken Compass", subtitle: "Heavy fire and unstable footing, with no dash.", damage: 0.18, incoming: 3, health: 0.24, speed: 0.76, enemy: 3.35, disableDash: true, code: "LOST-13", accent: "#a78bfa" },
  { id: 14, title: "Twin Suns", subtitle: "A long dual-route gauntlet against elite guards.", damage: 0.17, incoming: 3.15, health: 0.23, speed: 0.82, enemy: 3.5, disableSwap: true, code: "DUAL-14", accent: "#ff8a3d" },
  { id: 15, title: "No Return", subtitle: "No abilities, no reloads, no room for a mistake.", damage: 0.16, incoming: 3.35, health: 0.21, speed: 0.8, enemy: 3.7, ammo: 0.3, noAbilities: true, disableReload: true, code: "VOID-15", accent: "#4be3ff" },
  { id: 16, title: "Red Shift", subtitle: "Move carefully through a relentless stream of fire.", damage: 0.15, incoming: 3.55, health: 0.2, speed: 0.74, enemy: 3.9, disableDash: true, disableSwap: true, code: "SHIFT-16", accent: "#ff3d8b" },
  { id: 17, title: "Zero Signal", subtitle: "A marathon with sealed abilities and critical ammo.", damage: 0.14, incoming: 3.8, health: 0.18, speed: 0.78, enemy: 4.15, ammo: 0.25, noAbilities: true, disableReload: true, code: "ZERO-17", accent: "#7af6c8" },
  { id: 18, title: "The Long Dark", subtitle: "The final trial: one frame, one life, endless pressure.", damage: 0.12, incoming: 4, health: 0.16, speed: 0.72, enemy: 4.4, ammo: 0.25, noAbilities: true, disableDash: true, disableSwap: true, disableReload: true, code: "DARK-18", accent: "#ffd166" },
];

const themes = ["green", "blue", "yellow", "purple", "brown", "pink"];
const enemyTypes = ["standard", "shielded", "armored", "gunner", "flyer", "exo"];

export function getChallengeLevel(id) {
  const trial = CHALLENGES.find((item) => item.id === Number(id));
  if (!trial) return null;
  const platforms = [[0, 15, 8, ROWS - 15]];
  const enemies = [];
  const spikes = [];
  const trapSpikes = [];
  const saws = [];
  const movers = [];
  const defaultHeights = [15, 13, 11, 14, 12, 10, 13, 11, 14, 12, 10, 13, 11, 14, 12];
  const defaultGaps = [2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 0];
  const heights = trial.heights || defaultHeights;
  const gaps = trial.gaps || defaultGaps;
  let x = 8;
  // Each trial is a long-form gauntlet: the later trials add more rooms as
  // well as stronger enemies and more restrictive player conditions.
  const segmentCount = 48 + trial.id * 2;
  for (let index = 0; index < segmentCount; index += 1) {
    const patternIndex = index % heights.length;
    const y = heights[patternIndex];
    const length = 7 + ((trial.id + index) % 3);
    platforms.push([x, y, length, ROWS - y]);
    if (index > 0) {
      const type = enemyTypes[(trial.id + index * 2) % enemyTypes.length];
      enemies.push({ x: x + Math.floor(length / 2), y, minX: x + 1, maxX: x + length - 1, variant: type });
    }
    if (index > 1 && index % 2 === 0) {
      const hazardX = x + 2;
      if ((trial.id + index) % 3 === 0) trapSpikes.push({ x: hazardX, y: y - 1, w: 2, period: 1.3, onFrac: 0.54, phase: index * 0.37 });
      else spikes.push([hazardX, y - 1, 2]);
    }
    if (index > 2 && index % 4 === 0) saws.push({ x: x + length - 2, y: Math.max(6, y - 3), r: 13 });
    const gap = gaps[patternIndex] || 0;
    if (gap) {
      if (index % 3 === 1) movers.push({ x: x + length, y: Math.max(7, y - 1), w: 2, axis: "y", range: 2, speed: 38 + trial.id * 3, phase: index * 0.7 });
      x += length + gap;
    } else x += length;
  }
  // Floating upper lines create optional routes and force vertical movement.
  for (let i = 0; i < Math.ceil(segmentCount / 4); i += 1) {
    const px = 18 + Math.floor((i * segmentCount) / Math.ceil(segmentCount / 4)) * 10;
    const py = 7 + ((i + trial.id) % 3);
    platforms.push([px, py, 3, 1]);
    if (i % 2 === 0) enemies.push({ x: px + 1, y: py, minX: px, maxX: px + 2, variant: i % 3 ? "shielded" : "flyer" });
  }
  const width = x + 8;
  const lastY = heights[(segmentCount - 1) % heights.length];
  platforms.push([x, lastY, 8, ROWS - lastY]);
  return {
    id: trial.id, name: trial.title, theme: themes[(trial.id - 1) % themes.length], width,
    spawn: [2, 15], platforms, movers, trapSpikes, spikes, saws, enemies,
    stars: [], coins: [], ammo: [], fruits: [], checkpoints: [],
    exit: [width - 4, lastY], accent: trial.accent, tutorials: [],
    challenge: true, boss: null, secretOf: null, starOf: null,
  };
}
