/* Seventh Boar Development — the matrix layer. Falling binary code behind the hero, page heads,
   welcome page, newsletter, footer and coming-soon curtain.

   Drop-in: it finds those sections on its own and adds one <canvas class="matrix"> to each
   (styles.css places and fades it). Only sections on screen animate, it pauses in background
   tabs, and with "reduce motion" switched on it draws one still frame instead.
   To remove it: delete the matrix.js <script> line from the pages (and the .matrix rules in styles.css). */
(function () {
  const TARGETS = '.hero, .page-head, .wl-hero, .wl-connect, .newsletter, .event, .footer, body.soon';
  const STEP = 18;            // column width in CSS pixels
  const FPS = 22;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = new Set();

  function color() {
    return getComputedStyle(document.documentElement).getPropertyValue('--code').trim() || '#F2F2EE';
  }

  function attach(host) {
    if (host.querySelector(':scope > canvas.matrix')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'matrix';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const layer = { canvas, ctx, cols: [], visible: true, w: 0, h: 0 };

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h || (w === layer.w && h === layer.h)) return;
      layer.w = w; layer.h = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `500 ${STEP - 4}px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.textBaseline = 'top';
      // Each column: where its head is, how fast it falls, and whether it's running at all.
      layer.cols = Array.from({ length: Math.ceil(w / STEP) }, () => ({
        y: Math.random() * -h, speed: 0.5 + Math.random() * 0.9, on: Math.random() < 0.55,
      }));
      if (reduce) still(layer);
    }
    layer.size = size;
    new ResizeObserver(size).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { layer.visible = e.isIntersecting; }).observe(host === document.body ? document.documentElement : host);
    }
    layers.add(layer);
    size();
  }

  // One frame: fade what's there a little, then draw each running column's next digit.
  function frame(layer) {
    const { ctx, cols, w, h } = layer;
    if (!w) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.09)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const c = color();
    cols.forEach((col, i) => {
      if (!col.on) { if (Math.random() < 0.004) col.on = true; return; }
      col.y += STEP * col.speed;
      ctx.fillStyle = c;
      ctx.globalAlpha = Math.random() < 0.08 ? 1 : 0.75;
      ctx.fillText(Math.random() < 0.5 ? '0' : '1', i * STEP + 2, col.y);
      if (col.y > h + STEP * 4) { col.y = Math.random() * -h * 0.5; col.speed = 0.5 + Math.random() * 0.9; col.on = Math.random() < 0.7; }
    });
    ctx.globalAlpha = 1;
  }

  // Reduced motion: a single frozen moment of the rain.
  function still(layer) {
    const { ctx, w, h } = layer;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color();
    for (let x = 0; x < w; x += STEP) {
      if (Math.random() < 0.45) continue;
      const len = 4 + Math.floor(Math.random() * 18), top = Math.random() * h;
      for (let k = 0; k < len; k++) {
        ctx.globalAlpha = 0.08 + 0.8 * ((k + 1) / len) ** 2;
        ctx.fillText(Math.random() < 0.5 ? '0' : '1', x + 2, top + k * STEP);
      }
    }
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (document.hidden || t - last < 1000 / FPS) return;
    last = t;
    layers.forEach(l => {
      if (!l.canvas.isConnected) layers.delete(l);      // its section was redrawn
      else if (l.visible) frame(l);
    });
  }

  function scan() { document.querySelectorAll(TARGETS).forEach(attach); }

  // The header/footer and the coming-soon curtain are drawn by site.js after load, so look again
  // whenever the page's sections change.
  function start() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    if (!reduce) requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.sbMatrix = { scan };
})();
