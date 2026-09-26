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
      ${unsubUrl ? `<a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline">Unsubscribe</a> &nbsp;·&nbsp; ` : ''}<a href="${esc(site)}" style="color:${C.muted};text-decoration:underline">seventhboar.com</a><br>
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

// =====================================================================
// Project requests ("orders")
// =====================================================================

// The stages of each kind of project, in order. Keep in sync with REQUEST_STAGES in assets/js/data.js.
// "declined" can happen from the start and isn't part of the tracker.
export const STAGES = {
  website: [
    { key: 'received', label: 'Received', text: "We've got your request and will look at it shortly." },
    { key: 'accepted', label: 'Accepted', text: "We've accepted your project and will be in touch about next steps." },
    { key: 'design', label: 'Design', text: "We're designing your website." },
    { key: 'build', label: 'Build', text: "We're building your website." },
    { key: 'review', label: 'Review', text: "Your website is ready for you to look over." },
    { key: 'launched', label: 'Launched', text: 'Your website is live.' },
  ],
  app: [
    { key: 'received', label: 'Received', text: "We've got your request and will look at it shortly." },
    { key: 'accepted', label: 'Accepted', text: "We've accepted your project and will be in touch about next steps." },
    { key: 'planning', label: 'Planning', text: "We're planning and scoping your app." },
    { key: 'development', label: 'Development', text: "We're building your app." },
    { key: 'testing', label: 'Testing', text: "Your app is being tested." },
    { key: 'released', label: 'Released', text: 'Your app is out.' },
  ],
};
export const stageInfo = (kind, key) => (STAGES[kind] || STAGES.website).find(s => s.key === key);
export const orderNo = r => `SB-${r.number}`;
const kindWord = kind => (kind === 'app' ? 'app' : 'website');

// A row of steps: done ones filled with the accent, the current one outlined, the rest grey.
function trackerBar(kind, stage, p) {
  const list = STAGES[kind] || STAGES.website;
  const at = list.findIndex(s => s.key === stage);
  const cells = list.map((s, i) => {
    const done = i < at, now = i === at;
    const bar = done ? p.fill : now ? p.text : C.line;
    return `<td style="padding:0 3px 0 0;vertical-align:top" width="${Math.floor(100 / list.length)}%">
      <div style="height:5px;background:${bar};font-size:0;line-height:0">&nbsp;</div>
      <div style="padding-top:8px;font:${now ? '700' : '500'} 10px/1.3 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${now ? p.text : done ? C.text : C.muted}">${esc(s.label)}</div></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 6px"><tr>${cells}</tr></table>`;
}

const row = (k, v) => v ? `<tr>
  <td style="padding:9px 14px 9px 0;border-bottom:1px solid ${C.line};font:500 11px/1.4 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${C.muted};vertical-align:top;white-space:nowrap">${esc(k)}</td>
  <td style="padding:9px 0;border-bottom:1px solid ${C.line};font:400 15px/1.5 ${BODY};color:${C.bone};vertical-align:top">${v}</td></tr>` : '';
const para = t => esc(t).replace(/\n/g, '<br>');

// ---- A. To you: "New request", with the details and buttons to review it ----
export function requestAdminEmail({ site, accent, r }) {
  const p = palette(accent);
  const base = `${site}/admin/dashboard/#request/${r.id}`;
  const subject = `New ${kindWord(r.kind)} request ${orderNo(r)} from ${r.name}`;
  const html = shell({
    site, p, unsubUrl: '',
    preheader: `${r.name}${r.company ? ` (${r.company})` : ''} sent a ${kindWord(r.kind)} request.`,
    why: 'You are getting this because someone submitted the request form on seventhboar.com. Reply to this email to reply to them.',
    body: `${eyebrow(`New ${kindWord(r.kind)} request`, p)}
      <h1 class="h1" style="margin:0 0 6px;font:900 40px/.95 ${HEAD};letter-spacing:.01em;text-transform:uppercase;color:${C.bone}">${esc(orderNo(r))}</h1>
      <div style="margin:0 0 22px;font:500 13px/1.4 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${esc(r.name)}${r.company ? ` · ${esc(r.company)}` : ''}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
        ${row('Name', esc(r.name))}${row('Email', `<a href="mailto:${esc(r.email)}" style="color:${p.text};text-decoration:none">${esc(r.email)}</a>`)}
        ${row('Phone', esc(r.phone))}${row('Business', esc(r.company))}${row('Current site', esc(r.current_site))}
        ${row('Budget', esc(r.budget))}${row('Timeline', esc(r.timeline))}${row('Links', para(r.links))}
      </table>
      <div style="font:500 11px/1.4 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${C.muted};margin:0 0 8px">The project</div>
      <div style="background:${C.panel};border-left:3px solid ${p.fill};padding:16px 18px;margin:0 0 26px;font:400 15px/1.7 ${BODY};color:${C.text}">${para(r.brief)}</div>
      ${button(`${base}/accept`, 'Accept', p)}${button(`${base}/decline`, 'Decline', { ...p, fill: C.panel, on: C.bone })}${button(base, 'Open request', { ...p, fill: C.panel, on: C.bone })}
      <p style="margin:14px 0 0;font:400 12px/1.6 ${BODY};color:${C.muted}">These open your admin panel. You'll sign in and confirm your password before anything changes, and the customer is only emailed once you do.</p>`,
  });
  const text = `New ${kindWord(r.kind)} request ${orderNo(r)}\n\nName: ${r.name}\nEmail: ${r.email}\n${r.phone ? `Phone: ${r.phone}\n` : ''}${r.company ? `Business: ${r.company}\n` : ''}${r.current_site ? `Current site: ${r.current_site}\n` : ''}${r.budget ? `Budget: ${r.budget}\n` : ''}${r.timeline ? `Timeline: ${r.timeline}\n` : ''}\n${r.brief}\n\n${r.links ? `Links: ${r.links}\n\n` : ''}Review it: ${base}\nAccept: ${base}/accept\nDecline: ${base}/decline\n`;
  return { subject, html, text };
}

// The pricing guide: one card per tier that applies to this kind of project. Empty until you add tiers
// in the admin, in which case the email simply leaves it out.
function pricingGuide(pricing, kind, p) {
  const tiers = ((pricing && pricing.items) || []).filter(t => t && t.title && (!t.kind || t.kind === kind));
  if (!tiers.length) return { html: '', text: '' };
  const cards = tiers.map(t => {
    const bullets = (t.bullets || []).filter(Boolean);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:${C.panel};border-left:3px solid ${p.fill}"><tr><td style="padding:16px 18px">
      ${t.tag ? `<div style="font:500 10px/1.4 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${p.text};margin:0 0 4px">${esc(t.tag)}</div>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font:900 22px/1.1 ${HEAD};letter-spacing:.03em;text-transform:uppercase;color:${C.bone}">${esc(t.title)}</td>
        <td align="right" style="font:900 22px/1.1 ${HEAD};letter-spacing:.02em;color:${p.text};white-space:nowrap;padding-left:12px">${esc(t.price)}</td></tr></table>
      ${t.text ? `<div style="margin:8px 0 0;font:400 14px/1.6 ${BODY};color:${C.text}">${esc(t.text)}</div>` : ''}
      ${bullets.length ? `<ul style="margin:10px 0 0;padding-left:18px;font:400 14px/1.7 ${BODY};color:${C.text}">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </td></tr></table>`;
  }).join('');
  const html = `<div style="margin:30px 0 0;padding-top:26px;border-top:1px solid ${C.line}">
      ${eyebrow('Pricing guide', p)}
      <div style="margin:0 0 6px;font:900 28px/1 ${HEAD};letter-spacing:.02em;text-transform:uppercase;color:${C.bone}">${esc(pricing.title || 'Pricing guide')}</div>
      ${pricing.intro ? `<p style="margin:10px 0 18px;font:400 15px/1.7 ${BODY};color:${C.text}">${esc(pricing.intro)}</p>` : '<div style="height:14px"></div>'}
      ${cards}
      ${pricing.footnote ? `<p style="margin:8px 0 0;font:400 12px/1.6 ${BODY};color:${C.muted}">${esc(pricing.footnote)}</p>` : ''}
    </div>`;
  const text = `\n${(pricing.title || 'Pricing guide').toUpperCase()}\n${pricing.intro ? pricing.intro + '\n' : ''}\n` +
    tiers.map(t => `- ${t.title}: ${t.price}${t.text ? `\n  ${t.text}` : ''}${(t.bullets || []).filter(Boolean).map(b => `\n  * ${b}`).join('')}`).join('\n\n') +
    `${pricing.footnote ? `\n\n${pricing.footnote}` : ''}\n`;
  return { html, text };
}

// ---- B. To the customer: "We've got your request" (with the pricing guide, once you've added one) ----
export function requestReceivedEmail({ site, accent, r, trackUrl, pricing }) {
  const p = palette(accent);
  const subject = `We've got your ${kindWord(r.kind)} request (${orderNo(r)})`;
  const guide = pricingGuide(pricing, r.kind, p);
  const html = shell({
    site, p, unsubUrl: '',
    preheader: `Your request ${orderNo(r)} is in. Here's your private tracking link.`,
    why: `You are getting this because you sent a request on seventhboar.com. Reply to this email if anything needs correcting.`,
    body: `${eyebrow(`Request ${orderNo(r)}`, p)}
      <h1 class="h1" style="margin:0 0 16px;font:900 42px/.95 ${HEAD};letter-spacing:.01em;text-transform:uppercase;color:${C.bone}">Got it, <span style="color:${p.text}">${esc(String(r.name).split(/\s+/)[0])}.</span></h1>
      <p style="margin:0 0 6px;font:400 16px/1.7 ${BODY};color:${C.text}">Thanks for sending your ${kindWord(r.kind)} request. We'll read it properly and come back to you soon to say whether it's a fit and what happens next. You'll get an email each time it moves forward.</p>
      ${trackerBar(r.kind, 'received', p)}
      <p style="margin:18px 0 22px;font:400 15px/1.7 ${BODY};color:${C.text}">You can follow it any time here. This link is private to you, so keep it handy.</p>
      ${button(trackUrl, 'Track my request', p)}
      ${guide.html}`,
  });
  const text = `Got it, ${String(r.name).split(/\s+/)[0]}.\n\nThanks for sending your ${kindWord(r.kind)} request (${orderNo(r)}). We'll come back to you soon. You'll get an email each time it moves forward.\n\nTrack it: ${trackUrl}\n${guide.text}\n${NAME}, Australia\n`;
  return { subject, html, text };
}

// ---- C. To the customer: accepted, declined, or "it's moved to the next stage" ----
export function requestUpdateEmail({ site, accent, r, stage, note, trackUrl }) {
  const p = palette(accent);
  const info = stageInfo(r.kind, stage);
  const first = String(r.name).split(/\s+/)[0];
  let subject, head, lead;
  if (stage === 'declined') {
    subject = `About your ${kindWord(r.kind)} request (${orderNo(r)})`;
    head = 'Thanks for asking.';
    lead = `Thank you for thinking of us for your ${kindWord(r.kind)}. We've had a good look and we aren't able to take this one on right now.`;
  } else if (stage === 'accepted') {
    subject = `Your ${kindWord(r.kind)} request is accepted (${orderNo(r)})`;
    head = `You're in, ${first}.`;
    lead = `Good news: we've accepted your ${kindWord(r.kind)} project. We'll be in touch about next steps, and you'll get an email each time it moves forward.`;
  } else {
    subject = `${info ? info.label : 'Update'}: your ${kindWord(r.kind)} (${orderNo(r)})`;
    head = info ? info.label : 'Update';
    lead = info ? info.text : 'Your project has moved forward.';
  }
  const showBar = stage !== 'declined';
  const html = shell({
    site, p, unsubUrl: '',
    preheader: lead,
    why: `You are getting this because you sent a request on seventhboar.com (${orderNo(r)}). Reply to this email to reach us.`,
    body: `${eyebrow(`Request ${orderNo(r)}`, p)}
      <h1 class="h1" style="margin:0 0 16px;font:900 42px/.95 ${HEAD};letter-spacing:.01em;text-transform:uppercase;color:${C.bone}">${esc(head)}</h1>
      <p style="margin:0 0 6px;font:400 16px/1.7 ${BODY};color:${C.text}">${esc(lead)}</p>
      ${showBar ? trackerBar(r.kind, stage, p) : ''}
      ${note ? `<div style="background:${C.panel};border-left:3px solid ${p.fill};padding:16px 18px;margin:20px 0 0;font:400 15px/1.7 ${BODY};color:${C.text}"><div style="font:500 11px/1.4 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${p.text};margin:0 0 6px">A note from us</div>${para(note)}</div>` : ''}
      ${showBar ? `<p style="margin:22px 0 20px;font:400 15px/1.7 ${BODY};color:${C.text}">Follow every step on your tracking page.</p>${button(trackUrl, 'Track my request', p)}` : ''}`,
  });
  const text = `${head}\n\n${lead}\n\n${note ? `A note from us:\n${note}\n\n` : ''}${showBar ? `Track it: ${trackUrl}\n` : ''}${NAME}, Australia\n`;
  return { subject, html, text };
}
