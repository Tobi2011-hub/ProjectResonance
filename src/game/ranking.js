import { RUN_SPEED, TILE } from "./core";

const RANKS = [
  { grade: "S", color: "#ff3d8b", floor: 90 },
  { grade: "A", color: "#4be3ff", floor: 75 },
  { grade: "B", color: "#7af6c8", floor: 60 },
  { grade: "C", color: "#ffd166", floor: 45 },
  { grade: "D", color: "#c6d2f2", floor: 0 },
];

/** Grade story clears against stage length, elapsed time, and deaths. */
export function rankStoryRun(seconds, deaths, levelWidth) {
  const expectedSeconds = Math.max(90, (levelWidth * TILE / RUN_SPEED) * 2.8);
  const pace = Math.max(0, seconds / expectedSeconds - 0.72);
  const points = Math.max(0, Math.round(100 - pace * 70 - deaths * 20));
  return { ...RANKS.find((rank) => points >= rank.floor), points, expectedSeconds };
}
