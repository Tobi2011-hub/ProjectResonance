const GLYPHS = {
  A: "Letter A.png",
  B: "Letter B.png",
  C: "Letter C.png",
  D: "Letter D.png",
  E: "Letter E.png",
  F: "Letter F.png",
  G: "Letter G.png",
  H: "Letter H.png",
  I: "Letter I.png",
  J: "Letter J.png",
  K: "Letter K.png",
  L: "Letter L.png",
  M: "Letter M.png",
  N: "Letter N.png",
  O: "Letter O.png",
  P: "Letter P.png",
  Q: "Letter Q.png",
  R: "Letter R.png",
  S: "Letter S.png",
  T: "Letter T.png",
  U: "Letter U.png",
  V: "Letter V.png",
  W: "Letter W.png",
  X: "Letter X.png",
  Y: "Letter Y.png",
  Z: "Letter Z.png",
  0: "Number 0.png",
  1: "Number 1.png",
  2: "Number 2.png",
  3: "Number 3.png",
  4: "Number 4.png",
  5: "Number 5.png",
  6: "Number 6.png",
  7: "Number 7.png",
  8: "Number 8.png",
  9: "Number 9.png",
  "!": "Symbol !.png",
  "'": "Symbol Apostrophe.png",
  '"': "Symbol Quote.png",
  "(": "Symbol Backet Left.png",
  ")": "Symbol Backet Right.png",
  "\\": "Symbol Backslash.png",
  ":": "Symbol Colon.png",
  ",": "Symbol Comma.png",
  "-": "Symbol Dash.png",
  ".": "Symbol Fullstop.png",
  "+": "Symbol Plus.png",
  "?": "Symbol Question Mark.png",
  ";": "Symbol Semicolon.png",
  "/": "Symbol Slash.png",
  "_": "Symbol Underscore.png",
  "←": "Symbol Arrow Left.png",
  "→": "Symbol Arrow Right.png",
};

function getGlyphSrc(char) {
  const key = char.toUpperCase?.() ?? char;
  const fileName = GLYPHS[key] || GLYPHS[char] || null;
  if (!fileName) return null;
  return `/game/fonts/The Fonts/${encodeURIComponent(fileName)}`;
}

export default function PixelFontText({ text = "", className = "", uppercase = true, spacing = 0.08, style, ...props }) {
  const normalized = uppercase ? String(text).toUpperCase() : String(text);
  const chars = Array.from(normalized);

  return (
    <span
      className={`pixel-font-text ${className}`.trim()}
      style={{
        ...style,
        letterSpacing: `${spacing}em`,
      }}
      {...props}
    >
      {chars.map((char, index) => {
        const src = getGlyphSrc(char);
        if (!src) {
          return char === " " ? <span key={`${char}-${index}`} className="pixel-font-text__space" aria-hidden="true" /> : <span key={`${char}-${index}`} className="pixel-font-text__fallback" aria-hidden="true">{char}</span>;
        }

        return (
          <img
            key={`${char}-${index}`}
            src={src}
            alt={char}
            className="pixel-font-text__glyph"
            draggable={false}
          />
        );
      })}
    </span>
  );
}
