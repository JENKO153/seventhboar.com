/* Seventh Boar — applies the brand accent colour (Admin -> Customise) before the page draws, so
   nothing flashes the default first. Loaded in <head>. The colour is remembered from the last time
   this browser loaded it; each page then confirms it against the database.

   One accent drives four CSS variables:
     --hot       the fill colour (buttons, badges, strips, borders)
     --hot-text  a lighter tint of it that stays readable as small text on the near-black site
     --on-hot    white or near-black, whichever reads better on top of the fill
     --hot-2     a slightly darker hover shade */
(function () {
  const KEY = 'sb_accent';
  const BG = '#0A0A0A';
  const ok = hex => /^#[0-9a-f]{6}$/i.test(hex || '');
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const lin = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hex2 = n => Math.round(n).toString(16).padStart(2, '0');
  const toHex = ([r, g, b]) => '#' + hex2(r) + hex2(g) + hex2(b);

  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return [0, 0, l];
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function fromHsl([h, s, l]) {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }

  // Contrast of the accent against the site's near-black background.
  const contrast = hex => ratio(rgb(hex), rgb(BG));
  // Too close to the background and buttons/strips would vanish.
  const valid = hex => ok(hex) && contrast(hex) >= 1.8;
  // The same hue, lightened until small text in it reads clearly on black (4.6:1).
  function text(hex) {
    if (contrast(hex) >= 4.6) return hex.toUpperCase();
    const hsl = toHsl(rgb(hex));
    while (ratio(fromHsl(hsl).map(Math.round), rgb(BG)) < 4.6 && hsl[2] < 0.95) hsl[2] += 0.01;
    return toHex(fromHsl(hsl));
  }
  // Text colour to put on top of the accent.
  const on = hex => (ratio(rgb(hex), [255, 255, 255]) >= ratio(rgb(hex), rgb(BG)) ? '#FFFFFF' : '#0A0A0A');
  const darker = hex => toHex(rgb(hex).map(v => v * 0.82));

  const root = document.documentElement;
  const VARS = ['--hot', '--hot-text', '--on-hot', '--hot-2'];
  function set(hex) {
    if (ok(hex)) {
      root.style.setProperty('--hot', hex);
      root.style.setProperty('--hot-text', text(hex));
      root.style.setProperty('--on-hot', on(hex));
      root.style.setProperty('--hot-2', darker(hex));
    } else VARS.forEach(v => root.style.removeProperty(v));
  }

  window.sbAccent = {
    ok, valid, contrast, text, on,
    apply(hex) {
      const good = valid(hex);
      set(good ? hex : null);
      try { good ? localStorage.setItem(KEY, hex) : localStorage.removeItem(KEY); } catch { /* private mode */ }
    },
  };
  try { const saved = localStorage.getItem(KEY); if (valid(saved)) set(saved); } catch { /* private mode */ }
})();
