/**
 * COLLECTIBLES — coins, ammo crates and randomized fruit powerups.
 * Drawn on the canvas; the engine owns collection, ammo and buff state.
 */

export const FRUIT_POWERUPS = [
  { id: "apple", name: "Apple", color: "#ff5a6e", accent: "#7a0f25", effect: "heal", value: 40, description: "Small heal" },
  { id: "banana", name: "Banana", color: "#ffd166", accent: "#b7791f", effect: "speed", value: 8, description: "Speed boost" },
  { id: "cherry", name: "Cherry", color: "#ff3d8b", accent: "#7a0f3d", effect: "damage", value: 10, description: "Damage boost" },
  { id: "kiwi", name: "Kiwi", color: "#7af6c8", accent: "#207a52", effect: "shield", value: 10, description: "Shield" },
  { id: "melon", name: "Melon", color: "#5ae17d", accent: "#1b7a39", effect: "full-heal", value: 100, description: "Full heal" },
  { id: "orange", name: "Orange", color: "#ff9f43", accent: "#b75b00", effect: "fire-rate", value: 8, description: "Rapid fire" },
  { id: "pineapple", name: "Pineapple", color: "#ffd166", accent: "#d97706", effect: "invuln", value: 3.5, description: "Invincibility" },
  { id: "strawberry", name: "Strawberry", color: "#ff5d8f", accent: "#7a1232", effect: "regen", value: 7, description: "Regen" },
];

export function randomFruitPowerup() {
  return FRUIT_POWERUPS[Math.floor(Math.random() * FRUIT_POWERUPS.length)];
}

export function drawFruit(ctx, engine) {
  const { camera, time, fruitEntities } = engine;
  if (!fruitEntities) return;
  fruitEntities.forEach((fruitEntity) => {
    if (!fruitEntity || fruitEntity.taken) return;
    const bob = Math.sin(time * 3.2 + fruitEntity.i) * 2.2;
    const x = Math.round(fruitEntity.x - camera.x);
    const y = Math.round(fruitEntity.y + bob);
    const pw = 12;
    const ph = 12;
    const fruit = fruitEntity.powerup;
    if (!fruit) return;

    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    glow.addColorStop(0, fruit.color);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fruit.accent;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = fruit.color;
    ctx.fillRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, ph - 4);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(-pw / 2 + 3, -ph / 2 + 3, 2, 2);
    ctx.fillRect(-pw / 2 + 7, -ph / 2 + 3, 2, 2);
    ctx.fillStyle = fruit.accent;
    ctx.fillRect(-1, -ph / 2 - 4, 2, 3);
    ctx.fillRect(-4, -ph / 2 - 1, 8, 2);
    ctx.restore();
  });
}

export function drawCoins(ctx, engine) {
  const { camera, time, coinEntities } = engine;
  if (!coinEntities) return;
  coinEntities.forEach((coin) => {
    if (coin.taken) return;
    const bob = Math.sin(time * 3.4 + coin.i) * 2;
    const x = Math.round(coin.x - camera.x);
    const y = Math.round(coin.y + bob);
    const w = 4 + Math.abs(Math.cos(time * 3 + coin.i)) * 7;
    ctx.save();
    ctx.globalAlpha = 0.35;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
    glow.addColorStop(0, "#ffd166");
    glow.addColorStop(1, "rgba(255,209,102,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05060d";
    ctx.fillRect(x - w / 2 - 1, y - 7, w + 2, 14);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(x - w / 2, y - 6, w, 12);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - w / 2, y - 6, Math.max(1, w * 0.4), 12);
    ctx.fillStyle = "#fff6c9";
    ctx.fillRect(x - 0.5, y - 3, 1, 6);
    ctx.restore();
  });
}

export function drawAmmo(ctx, engine) {
  const { camera, time, ammoEntities } = engine;
  if (!ammoEntities) return;
  ammoEntities.forEach((crate) => {
    if (crate.taken) return;
    const bob = Math.sin(time * 2.2 + crate.i) * 1.5;
    const x = Math.round(crate.x - camera.x - 8);
    const y = Math.round(crate.y - 18 + bob);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#05060d";
    ctx.fillRect(x - 2, y - 2, 20, 20);
    ctx.fillStyle = "#2a3352";
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = "#4be3ff";
    ctx.fillRect(x, y, 16, 2);
    ctx.fillRect(x, y, 2, 16);
    ctx.fillStyle = "#7af6c8";
    ctx.fillRect(x + 5, y + 5, 6, 6);
    ctx.globalAlpha = 0.25 + Math.sin(time * 4 + crate.i) * 0.15;
    ctx.strokeStyle = "#4be3ff";
    ctx.strokeRect(x - 1.5, y - 1.5, 19, 19);
    ctx.restore();
  });
}