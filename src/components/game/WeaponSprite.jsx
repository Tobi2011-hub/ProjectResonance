const SHEET_URL = "/game/weapons-fantasy.png";

export default function WeaponSprite({ sprite, size = 24, label = "Weapon art", className = "" }) {
  if (!sprite) return null;
  const [col, row] = sprite;
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${SHEET_URL}")`,
        backgroundPosition: `${-col * size}px ${-row * size}px`,
        backgroundSize: `${size * 10}px ${size * 5}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}
