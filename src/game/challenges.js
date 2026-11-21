import { ROWS } from "./core";

// Six purpose built routes. Heights and gaps are tile counts; each row below
// describes a distinct rhythm instead of asking the campaign generator to
// repeat a world-map stage with a different stat sheet.
export const CHALLENGES = [
  {
    id: 1, title: "Signal Run", subtitle: "Learn the route. Keep your momentum through measured gaps.",
    damage: 0.9, incoming: 1.05, health: 0.9, speed: 0.96, enemy: 1,
    segments: 30, enemyEvery: 5, hazardEvery: 6, upperEvery: 5,
    heights: [15, 14, 13, 14, 12, 13, 15, 14, 12, 13], gaps: [2, 2, 3, 2, 2, 3, 2, 2, 3, 0],
    code: "NOVA-01", accent: "#4be3ff", theme: "blue", lives: 3,
  },
  {
    id: 2, title: "Crossfire", subtitle: "Dash is sealed. Read each landing before you commit.",
    damage: 0.84, incoming: 1.15, health: 0.82, speed: 0.92, enemy: 1.08, disableDash: true,
    segments: 34, enemyEvery: 4, hazardEvery: 5, upperEvery: 4,
    heights: [15, 13, 12, 14, 11, 13, 15, 12, 10, 13, 14], gaps: [2, 3, 2, 3, 2, 2, 3, 2, 3, 2, 0],
    code: "ECHO-22", accent: "#7af6c8", theme: "green", lives: 3,
  },
  {
    id: 3, title: "Thin Ice", subtitle: "Limited ammunition. Save shots for threats that block your route.",
    damage: 0.8, incoming: 1.2, health: 0.78, speed: 0.9, enemy: 1.12, ammo: 0.65, disableReload: true,
    segments: 36, enemyEvery: 4, hazardEvery: 4, upperEvery: 4,
    heights: [15, 14, 11, 12, 14, 10, 13, 15, 12, 11, 14, 13], gaps: [3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 0],
    code: "VOLT-33", accent: "#ffd166", theme: "blue", lives: 3,
  },
  {
    id: 4, title: "No Safe Ground", subtitle: "Weapon swap is locked. Wall-kick between the rising shelves.",
    damage: 0.76, incoming: 1.25, health: 0.72, speed: 0.86, enemy: 1.16, disableSwap: true,
    segments: 38, enemyEvery: 3, hazardEvery: 5, upperEvery: 3,
    heights: [15, 12, 10, 13, 9, 12, 15, 11, 8, 12, 14, 10], gaps: [3, 3, 2, 3, 2, 3, 3, 2, 3, 2, 0],
    code: "RIFT-44", accent: "#a78bfa", theme: "purple", lives: 2,
  },
  {
    id: 5, title: "Overload", subtitle: "Your abilities are offline. Route choice and timing matter.",
    damage: 0.72, incoming: 1.35, health: 0.66, speed: 0.84, enemy: 1.22, noAbilities: true,
    segments: 40, enemyEvery: 3, hazardEvery: 4, upperEvery: 3,
    heights: [15, 12, 9, 11, 14, 10, 8, 12, 15, 11, 9, 13, 10], gaps: [3, 2, 3, 3, 2, 3, 2, 3, 3, 2, 0],
    code: "FLUX-55", accent: "#ff8a3d", theme: "yellow", lives: 2,
  },
  {
    id: 6, title: "Last Resonance", subtitle: "One final push: no dash, no abilities, and a narrow margin for error.",
    damage: 0.68, incoming: 1.5, health: 0.58, speed: 0.82, enemy: 1.28,
    disableDash: true, noAbilities: true, ammo: 0.55,
    segments: 44, enemyEvery: 3, hazardEvery: 3, upperEvery: 3,
    heights: [15, 12, 9, 13, 10, 8, 12, 15, 11, 9, 13, 10, 8, 12], gaps: [3, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 0],
    code: "ZENITH-66", accent: "#ff3d8b", theme: "pink", lives: 2,
  },
];

const ENEMY_TYPES = ["standard", "shielded", "armored", "gunner", "flyer", "exo"];

export function getChallengeLevel(id) {
  const trial = CHALLENGES.find((item) => item.id === Number(id));
  if (!trial) return null;

  const platforms = [[0, 15, 8, ROWS - 15]];
  const enemies = [];
  const spikes = [];
  const trapSpikes = [];
  const saws = [];
  const movers = [];
  const checkpoints = [];
  const ammo = [];
  const fruits = [];
  let x = 8;

  for (let index = 0; index < trial.segments; index += 1) {
    const patternIndex = index % trial.heights.length;
    const y = trial.heights[patternIndex];
    const length = 8 + ((trial.id + index) % 3);
    platforms.push([x, y, length, ROWS - y]);

    // Checkpoints sit on quiet platforms and split the route into fair runs.
    const checkpointEvery = 10;
    const checkpoint = index > 0 && index % checkpointEvery === 0;
    if (checkpoint) checkpoints.push([x + 2, y]);

    if (!checkpoint && index > 1 && index % trial.enemyEvery === trial.id % trial.enemyEvery) {
      const poolSize = trial.id < 4 ? 4 : ENEMY_TYPES.length;
      const variant = ENEMY_TYPES[(trial.id + index * 2) % poolSize];
      enemies.push({ x: x + Math.floor(length / 2), y, minX: x + 1, maxX: x + length - 1, variant });
    }

    if (!checkpoint && index > 2 && index % trial.hazardEvery === 0) {
      const hazardX = x + 3;
      if ((trial.id + index) % 3 === 0) {
        trapSpikes.push({ x: hazardX, y: y - 1, w: 2, period: 1.55, onFrac: 0.42, phase: index * 0.41 });
      } else {
        spikes.push([hazardX, y - 1, 2]);
      }
    }

    if (!checkpoint && index > 4 && index % 7 === 0) {
      saws.push({ x: x + length - 2, y: Math.max(6, y - 3), r: 12 });
    }

    if (index > 0 && index % trial.upperEvery === 0) {
      const shelfY = Math.max(5, y - (trial.id >= 4 ? 4 : 3));
      platforms.push([x + 2, shelfY, 3, 1]);
      if (trial.id >= 3 && index % 2 === 0) {
        movers.push({ x: x + length, y: Math.max(7, shelfY), w: 2, axis: "y", range: 2, speed: 34 + trial.id * 2, phase: index * 0.55 });
      }
    }

    if (trial.ammo && index > 0 && index % 8 === 0) ammo.push([x + 2, y - 1]);
    if (index > 0 && index % 12 === 6) fruits.push([x + 2, y - 1]);

    const gap = trial.gaps[patternIndex] || 0;
    if (gap && index % 3 === 1 && trial.id >= 3) {
      movers.push({ x: x + length, y: Math.max(7, y - 1), w: 2, axis: "y", range: 2, speed: 38 + trial.id * 2, phase: index * 0.7 });
    }
    x += length + gap;
  }

  const finalY = trial.heights[(trial.segments - 1) % trial.heights.length];
  platforms.push([x, finalY, 10, ROWS - finalY]);
  return {
    id: trial.id,
    name: trial.title,
    theme: trial.theme,
    width: x + 10,
    spawn: [2, 15],
    platforms,
    movers,
    trapSpikes,
    spikes,
    saws,
    enemies,
    stars: [],
    coins: [],
    ammo,
    fruits,
    checkpoints,
    exit: [x + 6, finalY],
    accent: trial.accent,
    tutorials: [],
    challenge: true,
    boss: null,
    secretOf: null,
    starOf: null,
  };
}
