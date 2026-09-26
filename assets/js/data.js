/* =========================================================
   Seventh Boar Development — brand constants + default content
   The live site reads everything from Supabase (see cms.js).
   This file is only used as: (1) the fixed brand constants,
   (2) the default homepage settings before the admin has
   edited them, and (3) the starting content in demo mode.
   ========================================================= */

const SITE = Object.freeze({
  name: 'Seventh Boar Development',
  short: 'Seventh Boar',
  tagline: 'Built with purpose. Made with bite.',
  email: 'Admin@seventhboar.com',
  url: 'https://seventhboar.com',
  est: 2026,
  brand: {
    mark: '/assets/images/seventh-boar-mark-inverted.png',   // white boar, for the dark site
    markDark: '/assets/images/seventh-boar-mark.png',        // black boar, for light browser tabs
    giant: '/assets/images/seventh-boar-logo.png',           // transparent: used as the giant footer stencil
  },
});

// What kind of project it is. The keys are what's stored in the database.
const PROJECT_TYPES = Object.freeze([
  { key: 'website', label: 'Websites', one: 'Website' },
  { key: 'game', label: 'Games', one: 'Game' },
  { key: 'app', label: 'Apps', one: 'App' },
  { key: 'prototype', label: 'Prototypes', one: 'Prototype' },
]);
const typeLabel = (key, plural = false) => {
  const t = PROJECT_TYPES.find(x => x.key === key);
  return t ? (plural ? t.label : t.one) : String(key || '').replace(/^./, c => c.toUpperCase());
};

// The stages of a project request ("order"), in order. Keep in sync with STAGES in
// supabase/functions/_shared/templates.js (the emails). "declined" can happen from the start.
const REQUEST_STAGES = Object.freeze({
  website: [
    { key: 'received', label: 'Received', text: "We've got your request and will look at it shortly." },
    { key: 'accepted', label: 'Accepted', text: "We've accepted your project and will be in touch about next steps." },
    { key: 'design', label: 'Design', text: "We're designing your website." },
    { key: 'build', label: 'Build', text: "We're building your website." },
    { key: 'review', label: 'Review', text: 'Your website is ready for you to look over.' },
    { key: 'launched', label: 'Launched', text: 'Your website is live.' },
  ],
  app: [
    { key: 'received', label: 'Received', text: "We've got your request and will look at it shortly." },
    { key: 'accepted', label: 'Accepted', text: "We've accepted your project and will be in touch about next steps." },
    { key: 'planning', label: 'Planning', text: "We're planning and scoping your app." },
    { key: 'development', label: 'Development', text: "We're building your app." },
    { key: 'testing', label: 'Testing', text: 'Your app is being tested.' },
    { key: 'released', label: 'Released', text: 'Your app is out.' },
  ],
});
const stagesFor = kind => REQUEST_STAGES[kind === 'app' ? 'app' : 'website'];
const stageLabel = (kind, key) => (key === 'declined' ? 'Declined' : (stagesFor(kind).find(s => s.key === key) || { label: key }).label);
const requestNo = r => `SB-${r.number}`;

// Accent colours offered in Admin -> Customise. The site derives a readable text tint and a
// button text colour from whichever one is picked (see accent.js).
const ACCENTS = [
  ['Boar maroon', '#97292A'], ['Signal red', '#C8202A'], ['Ember', '#D9541E'], ['Amber', '#E0A020'],
  ['Hi-vis lime', '#D4FF1F'], ['Moss', '#5E8C4A'], ['Teal', '#1F9C93'], ['Electric blue', '#3D8BFF'],
  ['Violet', '#8E63E8'], ['Hot pink', '#E03E92'], ['Bone white', '#F2F2EE'],
];

// Icons for the social / client links (24x24 paths).
const SOCIAL_ICON_PATHS = Object.freeze({
  website: 'M12 2a10 10 0 100 20 10 10 0 000-20zm7.94 9h-3.05a15.9 15.9 0 00-1.14-5.26A8.03 8.03 0 0119.94 11zM12 4c.9 1.02 1.94 3 2.25 7H9.75C10.06 7 11.1 5.02 12 4zM4.06 11a8.03 8.03 0 015.19-6.26A15.9 15.9 0 008.11 11H4.06zm0 2h4.05a15.9 15.9 0 001.14 5.26A8.03 8.03 0 014.06 13zM12 20c-.9-1.02-1.94-3-2.25-7h4.5c-.31 4-1.35 5.98-2.25 7zm2.81-1.26A15.9 15.9 0 0015.95 13h4.05a8.03 8.03 0 01-5.19 6.26z',
  instagram: 'M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.89 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.7 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.53c.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.25-3.5a1.17 1.17 0 1 0 0 2.33 1.17 1.17 0 0 0 0-2.33z',
  twitter: 'M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H2l8.1-9.3L1.5 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z',
  facebook: 'M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.1c0-.96.27-1.62 1.65-1.62H17V3.5A22 22 0 0014.5 3.3c-2.5 0-4.2 1.53-4.2 4.34v2.63H7.5v3.3h2.8V22h3.2z',
  tiktok: 'M16.6 5.82c-.9-.83-1.4-2-1.4-3.32h-3.13v13.4c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .58.05.85.13V9.9a6.1 6.1 0 0 0-.85-.06 6.1 6.1 0 1 0 6.1 6.1V9.03a8.2 8.2 0 0 0 4.83 1.55V7.45c-1.2 0-2.3-.4-3.5-1.63z',
  youtube: 'M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.5v-7l6.3 3.5-6.3 3.5z',
  linkedin: 'M4.98 3.5a2.5 2.5 0 11-.02 5.01A2.5 2.5 0 014.98 3.5zM.5 21.5h4.4V8.9H.5v12.6zM8.3 8.9h4.2v1.72h.06c.59-1.1 2.02-2.26 4.16-2.26 4.44 0 5.26 2.92 5.26 6.72v6.42h-4.4v-5.69c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.19 1.48-2.19 3v5.79H8.3V8.9z',
});
// Which icon a labelled link (footer / contact) should wear.
const iconFor = (label, url) => {
  const s = `${label} ${url}`.toLowerCase();
  if (/instagram/.test(s)) return 'instagram';
  if (/tiktok/.test(s)) return 'tiktok';
  if (/youtube|youtu\.be/.test(s)) return 'youtube';
  if (/facebook/.test(s)) return 'facebook';
  if (/linkedin/.test(s)) return 'linkedin';
  if (/twitter|x\.com|\bx\b/.test(s)) return 'twitter';
  return 'website';
};

// Everything here is editable in the admin (Homepage & settings, and Team & clients).
// These are only the starting values, used before anything has been saved.
const DEFAULT_SETTINGS = {
  theme: { accent: '#97292A' },  // Admin -> Customise
  status: 'Independent Australian studio',
  // The "coming soon" curtain (Admin -> Homepage & settings). The switch itself lives in the database.
  comingSoon: {
    eyebrow: 'Seventh Boar Development',
    title: 'Something\'s coming.',
    text: "We're building it right now. Drop your email and you'll be first through the gate when it opens.",
    showEmail: true,
  },
  socials: [
    { label: 'Instagram', url: 'https://instagram.com/seventhboardevelopment' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@seventhboardevelopment' },
    { label: 'X', url: 'https://x.com/seventhboar' },
  ],
  hero: {
    eyebrow: 'Independent // Australia',
    line1: 'Built with purpose.',
    line2: 'Made with bite.',
    subtitle: 'Seventh Boar Development is an independent Australian studio building custom websites for businesses and brands. Small team, no fluff. Apps are built on request.',
    cta: 'Start a website',
    ctaUrl: '/request/',
    cta2: 'See the work',
    cta2Url: '/work/',
    image: '/assets/images/Home_Page_Banner.jpg',
    // The four short promises under the hero.
    bar: ['Custom websites', 'Mobile-first', 'Apps on request', 'Made in Australia'],
  },
  // What the studio sells. Websites are the main service; apps are built on request.
  servicesSection: {
    show: true, eyebrow: 'Sec. 01 // Services', title: 'What we build for you',
    intro: 'Websites are what we build for clients right now. Apps are built on request.',
    items: [
      { tag: 'Main service', title: 'Websites', text: 'Custom websites for businesses and brands, designed around what your customers need to see and do, and built to look sharp on every screen.',
        bullets: ['Designed and built from scratch', 'Looks and works great on phones', 'Fast, clean and easy to find on search', 'Straightforward, honest communication'],
        ctaText: 'Start a website', ctaUrl: '/request/' },
      { tag: 'On request', title: 'Apps', text: 'Have an app idea? We build apps for iOS and Android on request. Tell us what you have in mind and we\'ll work out if it\'s a fit.',
        bullets: ['iOS and Android', 'Built around real, daily use', 'Scoped with you before we start'],
        ctaText: 'Ask about an app', ctaUrl: '/request/?type=app' },
    ],
  },
  // The pricing guide: shown on the Services page and emailed to everyone who sends a request. Add your
  // tiers in Admin -> Homepage & settings -> Pricing guide. Nothing shows (or is emailed) until you do.
  pricing: {
    eyebrow: 'Sec. 03 // Pricing', title: 'Pricing guide',
    intro: 'Every project is different, so treat these as starting points. Send a request and we\'ll confirm what yours would involve.',
    footnote: '',
    items: [],   // { kind: 'website' | 'app' | '' (both), tag, title, price, text, bullets[] }
  },
  typesSection: { eyebrow: 'Sec. 02 // Our work', title: 'Websites, apps & games', link: 'See all work' },
  latestSection: { eyebrow: 'Sec. 03 // Latest work', title: 'Fresh off the build', intro: 'Websites, apps and games shaped with care, restraint and a clear sense of purpose.' },
  teamSection: {
    eyebrow: 'Sec. 04 // The studio', title: 'Meet the studio',
    intro: 'A small team that cares how things feel to use.',
    ctaText: 'Work with us', ctaUrl: '/contact/',
  },
  devlogSection: { eyebrow: 'Sec. 06 // From the devlog', title: 'Latest entries' },
  build: {
    show: true,
    eyebrow: 'Sec. 07 // How we build', title: 'Built to last',
    intro: 'Clean design, considered features, and sites that feel straightforward on the surface even when the build underneath is complex.',
    cta: 'See the work', ctaUrl: '/work/',
    images: ['/assets/images/Devlog_Page_Banner.png', '/assets/images/Generic_Banner.png', '/assets/images/Home_Page_Banner.jpg'],
    specs: [
      { label: 'Websites', value: 'Custom design and build' },
      { label: 'Apps', value: 'On request, iOS and Android' },
      { label: 'Games', value: 'In-house projects' },
      { label: 'Approach', value: 'Small team, clear communication' },
      { label: 'Based in', value: 'Australia' },
    ],
  },
  reportsSection: { eyebrow: 'Sec. 08 // Client words', title: 'Kind words' },
  cta: {
    show: true, title: 'Need a website?',
    text: 'Tell us about your business and what you need. We\'ll come back with a plan.',
    ctaText: 'Start your website', ctaUrl: '/request/',
  },
  newsletter: {
    show: true, eyebrow: 'Sec. 09 // Follow along', title: 'Follow the build',
    text: 'Devlog updates and release news, straight to your inbox.',
    fine: 'Unsubscribe any time. No spam, ever.',
    thanks: "You're on the list. Welcome aboard.",
  },
  footer: {
    tagline: 'Built with purpose. Made with bite.',
    blurb: 'An independent Australian studio building custom websites for businesses and brands, with apps built on request.',
    email: 'Admin@seventhboar.com',
  },
  // The countdown block: a game or app release, or an event. Hidden until it's switched on.
  release: {
    show: false,
    kind: 'release',        // 'release' (a drop date) or 'event' (date + doors + venue)
    name: 'Where We Return',
    round: 'In development',
    place: '',
    date: '',
    blurb: 'The next thing on the bench. Follow the devlog to watch it come together.',
    image: '',
    ctaText: 'Follow the devlog', ctaUrl: '/devlog/',
  },
  // The people. Empty until you add someone; the section stays hidden while it is.
  team: [],
  reports: [
    {
      quote: "Working with the Seventh Boar Team on Not Another Monday has been bloody brilliant. I came to them with a head full of ideas, half-finished thoughts, and a very clear opinion on how I wanted the app to feel. Somehow, they took all of that and turned it into an actual product.",
      name: 'Chooky Chasing Life', meta: 'Not Another Monday // Commissioned app', stars: 5, verified: true,
    },
  ],
  ig: [],
};

// A tidy list of demo content, used only when the site runs in demo mode on localhost.
const DEMO_SEED = (() => {
  const ago = d => new Date(Date.now() - d * 86400e3).toISOString();
  const blocks = (...b) => b.map(([style, text, image]) => (image ? { style, text, image } : { style, text }));
  return {
    posts: [
      { slug: 'devlog-003-fire-ghosts-and-one-very-stubborn-shader', title: 'Where We Return DEVLOG #003: Fire, Ghosts, and One Very Stubborn Shader', category: 'Devlog',
        excerpt: 'The most frustrating placement ghost bug, and the campfire that finally works.', image_url: '/assets/images/Home_Page_Banner.jpg', card_image_url: null, author: 'Seventh Boar', published_at: ago(11), status: 'published',
        content: blocks(['paragraph-lg', 'Building things is supposed to be the fun part. This week it was mostly the shader.'], ['title', 'The ghost bug'], ['paragraph', 'Placement previews kept leaving a ghost behind. It looked haunted. It was not haunted, it was a sorting order problem.'], ['bullets', 'Fixed the ghost preview\nCampfire light now flickers properly\nShader no longer eats the framerate'], ['photo', 'The campfire, finally behaving.', '/assets/images/Devlog_Page_Banner.png']) },
      { slug: 'devlog-002-polish-is-key', title: 'Where We Return DEVLOG #002: Polish Is Key', category: 'Devlog',
        excerpt: 'Polish is the main objective.', image_url: '/assets/images/Devlog_Page_Banner.png', card_image_url: null, author: 'Seventh Boar', published_at: ago(20), status: 'published',
        content: blocks(['paragraph-lg', 'Polish is the main objective.'], ['paragraph', 'A short look at where the time went this fortnight.']) },
      { slug: 'studio-notes-what-we-are-building', title: 'Studio Notes: What We Are Building', category: 'Studio',
        excerpt: 'A quick note on the studio, the tools and what comes next.', image_url: '/assets/images/Generic_Banner.png', card_image_url: null, author: 'Seventh Boar', published_at: ago(34), status: 'published',
        content: blocks(['paragraph-lg', 'A quick note on where the studio is at.'], ['paragraph', 'Apps, games and the odd website, all built with the same care.']) },
      { slug: 'upcoming-post-draft', title: 'A Draft Only You Can See', category: 'Devlog',
        excerpt: 'Drafts stay hidden from the public until you set them live.', image_url: '/assets/images/Generic_Banner.png', card_image_url: null, author: 'Seventh Boar', published_at: ago(0), status: 'draft',
        content: blocks(['paragraph', 'Nothing to see here yet.']) },
    ],
    projects: [
      { slug: 'sample-business-website', title: 'Sample Business Website', categories: ['website'], platforms: ['Custom build', 'Mobile-first'], client: 'Example Co', tagline: 'A clean, fast site for a local business.',
        icon_url: null, banner_url: '/assets/images/Generic_Banner.png', card_banner_url: null, featured: true, published_at: ago(15), status: 'published', client_logo_url: null, client_links: [],
        brief: blocks(['paragraph-lg', 'A placeholder website project to show how client work appears.'], ['paragraph', 'Replace this with a real project from the admin.']) },
      { slug: 'where-we-return', title: 'Where We Return', categories: ['game'], platforms: ['PC'], client: null, tagline: 'A moody pixel-art survival game about finding your way back.',
        icon_url: null, banner_url: '/assets/images/Home_Page_Banner.jpg', card_banner_url: null, featured: true, published_at: ago(60), status: 'published', client_logo_url: null, client_links: [],
        brief: blocks(['paragraph-lg', 'A quiet, atmospheric survival game with a campfire at its heart.'], ['title', 'The idea'], ['paragraph', 'Every night you make it back to camp is a small victory.'], ['bullets', 'Pixel art with real lighting\nPlacement-based building\nThe devlog follows every step'], ['photo', 'Camp at night.', '/assets/images/Devlog_Page_Banner.png']) },
      { slug: 'not-another-monday', title: 'Not Another Monday', categories: ['app'], platforms: ['iOS', 'Android'], client: 'Chooky Chasing Life', tagline: 'A weekly planning app that makes Mondays bearable.',
        icon_url: '/assets/images/not-another-monday-icon.png', banner_url: '/assets/images/Generic_Banner.png', card_banner_url: null, featured: false, published_at: ago(90), status: 'published',
        client_logo_url: '/assets/images/chooky-chasing-life.png', client_links: [{ platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/' }, { platform: 'website', label: 'Website', url: 'https://example.com/' }],
        brief: blocks(['paragraph-lg', 'The first paid commissioned app build from the studio.'], ['paragraph', 'A calm, useful planner shaped around real daily life.']) },
      { slug: 'picket-list', title: 'Picket List', categories: ['app'], platforms: ['iOS'], client: null, tagline: 'A duty roster app built for the way shifts actually work.',
        icon_url: '/assets/images/picket-list-icon.png', banner_url: '/assets/images/Devlog_Page_Banner.png', card_banner_url: null, featured: false, published_at: ago(120), status: 'published', client_logo_url: null, client_links: [],
        brief: blocks(['paragraph-lg', 'Rosters, without the spreadsheet.'], ['paragraph', 'Simple, quick and made to be used one-handed.']) },
    ],
    comments: [
      { id: 'c-1', post_slug: 'devlog-003-fire-ghosts-and-one-very-stubborn-shader', author_name: 'Sam', body: 'That campfire looks great. Keep going!', likes: 3, approved: true, created_at: ago(9) },
      { id: 'c-2', post_slug: 'devlog-003-fire-ghosts-and-one-very-stubborn-shader', author_name: 'Alex', body: 'Any idea on a release window?', likes: 0, approved: false, created_at: ago(1) },
    ],
    requests: [
      { id: 'r-demo-1', number: 1002, kind: 'website', stage: 'received', name: 'Jamie Carter', email: 'jamie@example.com', phone: '0400 000 000', company: 'Carter Plumbing',
        current_site: '', budget: 'Around $3k', timeline: 'Live before December', brief: 'We need a simple site to show our services, service area and a quote form. We currently only have a Facebook page.',
        links: 'https://example.com/inspiration', access_key: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234', admin_notes: '', history: [{ stage: 'received', at: ago(1), note: '' }], created_at: ago(1), updated_at: ago(1), decided_at: null },
      { id: 'r-demo-2', number: 1001, kind: 'website', stage: 'build', name: 'Sam Nguyen', email: 'sam@example.com', phone: '', company: 'Nguyen Bakery',
        current_site: 'https://example.com', budget: '', timeline: '', brief: 'Redesign of our bakery website with online ordering info and opening hours.', links: '',
        access_key: 'ffeeddccbbaa99887766554433221100abcd', admin_notes: 'Wants a warm colour palette.', history: [{ stage: 'received', at: ago(20), note: '' }, { stage: 'accepted', at: ago(18), note: 'Happy to take this on.' }, { stage: 'design', at: ago(14), note: '' }, { stage: 'build', at: ago(6), note: 'Design signed off, now building.' }],
        created_at: ago(20), updated_at: ago(6), decided_at: ago(18) },
    ],
    subscribers: [
      { email: 'sam@example.com', at: ago(3) }, { email: 'jordan@example.com', at: ago(8) },
    ],
  };
})();
