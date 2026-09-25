// Seventh Boar email templates.
// Plain JavaScript on purpose: the Supabase email functions import this file, and so does
// tools/email-preview.html, so the preview is exactly what subscribers receive.
//
// Each template takes { site, accent, unsubUrl, ... } and returns { subject, html, text }.
// Built from tables with inline styles, because that is what email apps reliably understand.
// Dark by design, to match the site.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

// ---- palette (matches the site) ----
const C = { bg: '#0A0A0A', card: '#121212', panel: '#1A1A1A', line: '#2A2A2A', bone: '#F2F2EE', text: '#CFCFC8', muted: '#8E8E88' };
const HEAD = "'Big Shoulders Stencil Display', Impact, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
const NAME = 'Seventh Boar Development';

// ---- the accent colour: a fill, a lighter tint for small text, and a colour to put on the fill ----
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const lin = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex2 = n => Math.round(n).toString(16).padStart(2, '0');
function tint(hex) {                       // lighten (keeping the hue) until it reads on black
  if (ratio(rgb(hex), [10, 10, 10]) >= 4.6) return hex;
  let [r, g, b] = rgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0, l = (max + min) / 2;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  const back = (h, s, l) => {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  };
  while (ratio(back(h, s, l).map(Math.round), [10, 10, 10]) < 4.6 && l < 0.95) l += 0.01;
  return '#' + back(h, s, l).map(hex2).join('');
}
const palette = accent => {
  const fill = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent : '#97292A';
  return { fill, text: tint(fill), on: ratio(rgb(fill), [255, 255, 255]) >= ratio(rgb(fill), [10, 10, 10]) ? '#FFFFFF' : '#0A0A0A' };
};

const abs = (site, u) => (!u ? '' : /^https:\/\//.test(u) ? u : `${site}/${String(u).replace(/^\//, '')}`);

// ---- building blocks ----
function button(href, label, p) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 8px 10px 0"><tr>
    <td style="background:${p.fill};border:2px solid ${p.fill}">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 24px;font:700 13px/1 ${BODY};letter-spacing:.14em;text-transform:uppercase;color:${p.on};text-decoration:none">${esc(label)}</a>
    </td></tr></table>`;
}
const eyebrow = (text, p) => `<div style="font:500 12px/1.4 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${p.text};margin:0 0 12px">${esc(text)}</div>`;

// The frame every email sits in: logo, content, and a footer with the unsubscribe link.
function shell({ site, p, preheader, body, unsubUrl, why }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<style>@media only screen and (max-width:620px){.wrap{width:100%!important}.pad{padding:24px 20px!important}.h1{font-size:34px!important}}</style></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.text}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${C.card};border:1px solid ${C.line};border-top:4px solid ${p.fill}">
    <tr><td class="pad" style="padding:26px 36px 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="${esc(site)}/assets/images/seventh-boar-mark-inverted.png" width="40" height="40" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:12px">
          <div style="font:900 22px/1 ${HEAD};letter-spacing:.05em;text-transform:uppercase;color:${C.bone}">Seventh Boar</div>
          <div style="font:500 9px/1 ${MONO};letter-spacing:.3em;text-transform:uppercase;color:${p.text};margin-top:5px">Development</div>
        </td></tr></table>
    </td></tr>
    <tr><td class="pad" style="padding:30px 36px 36px">${body}</td></tr>
    <tr><td class="pad" style="padding:20px 36px 28px;border-top:1px solid ${C.line};font:400 12px/1.7 ${BODY};color:${C.muted}">
      ${esc(why)}<br>
      <a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline">Unsubscribe</a> &nbsp;·&nbsp; <a href="${esc(site)}" style="color:${C.muted};text-decoration:underline">seventhboar.com</a><br>
      ${NAME}, Australia
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

// ---- 1. "You're on the list" ----
export function welcomeEmail({ site, unsubUrl, accent }) {
  const p = palette(accent);
  const subject = "You're on the list";
  const html = shell({
    site, p, unsubUrl,
    preheader: "Thanks for following along. You'll hear from us when there's a new devlog entry.",
    why: "You're getting this because you signed up for updates on seventhboar.com.",
    body: `${eyebrow('Welcome aboard', p)}
      <h1 class="h1" style="margin:0 0 16px;font:900 44px/.95 ${HEAD};letter-spacing:.01em;text-transform:uppercase;color:${C.bone}">You're on <span style="color:${p.text}">the list.</span></h1>
      <p style="margin:0 0 22px;font:400 16px/1.7 ${BODY};color:${C.text}">Thanks for following Seventh Boar Development. When there's a new devlog entry, you'll get an email straight away: what changed, what we learned, and what's next. No spam, ever.</p>
      ${button(`${site}/devlog/`, 'Read the devlog', p)}${button(`${site}/work/`, 'See the work', { ...p, fill: C.panel, on: C.bone })}`,
  });
  const text = `You're on the list.\n\nThanks for following Seventh Boar Development. When there's a new devlog entry, you'll get an email straight away.\n\nDevlog: ${site}/devlog/\nWork: ${site}/work/\n\nUnsubscribe: ${unsubUrl}\n${NAME}, Australia\n`;
  return { subject, html, text };
}

// ---- 2. "New devlog entry" ----
export function newPostEmail({ site, unsubUrl, accent, post }) {
  const p = palette(accent);
  const url = `${site}/post/?id=${encodeURIComponent(post.slug)}`;
  const img = abs(site, post.card_image_url || post.image_url);
  const subject = `New devlog: ${post.title}`;
  const html = shell({
    site, p, unsubUrl,
    preheader: post.excerpt || post.title,
    why: "You're getting this because you signed up for updates on seventhboar.com.",
    body: `${eyebrow(`New ${post.category || 'devlog'} entry`, p)}
      <h1 class="h1" style="margin:0 0 16px;font:900 40px/.95 ${HEAD};letter-spacing:.01em;text-transform:uppercase;color:${C.bone}">${esc(post.title)}</h1>
      ${img ? `<a href="${esc(url)}"><img src="${esc(img)}" width="528" alt="" style="display:block;width:100%;max-width:528px;height:auto;margin:0 0 20px;border:0;background:${C.panel}"></a>` : ''}
      ${post.excerpt ? `<p style="margin:0 0 24px;font:400 16px/1.7 ${BODY};color:${C.text}">${esc(post.excerpt)}</p>` : ''}
      ${button(url, 'Read the entry', p)}`,
  });
  const text = `New ${post.category || 'devlog'} entry: ${post.title}\n\n${post.excerpt || ''}\n\nRead it: ${url}\n\nUnsubscribe: ${unsubUrl}\n${NAME}, Australia\n`;
  return { subject, html, text };
}
