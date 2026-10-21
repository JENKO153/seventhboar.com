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
  // The addresses the public site shows. They are aliases of the admin mailbox, which is never shown:
  //   info@   general questions, help with an existing site, feedback, the footer
  //   sales@  new websites and apps: quotes, the welcome page, the request form's replies
  email: 'info@seventhboar.com',
  salesEmail: 'sales@seventhboar.com',
  // Where the Contact page form addresses its email, by the reason picked (options marked data-to="sales" or "support").
  supportEmail: 'info@seventhboar.com',
  url: 'https://seventhboar.com',
  est: 2026,
  brand: {
    mark: '/assets/images/seventh-boar-mark-inverted.png',   // white boar, for the dark site
    markDark: '/assets/images/seventh-boar-mark.png',        // black boar, for light browser tabs
    giant: '/assets/images/seventh-boar-logo.png',           // transparent: used as the giant footer stencil
  },
});

// The site's built-in pages that can be switched off in Admin -> Pages. Home can't be.
//   paths: every address that belongs to the page (hiding Work also hides each project page)
//   home:  homepage sections that go with it
//   note:  what hiding it does, shown in the admin
// The admin mailbox itself is never shown publicly: a saved footer address of Admin@ shows the general address instead.
const publicEmail = e => (!e || /^admin@seventhboar\.com$/i.test(e.trim()) ? SITE.email : e.trim());

const SITE_PAGES = Object.freeze([
  { key: 'work', label: 'Work', path: '/work/', paths: ['/work/', '/project/'], home: ['types', 'latest'],
    note: 'Also hides every project page and the work sections on the homepage.' },
  { key: 'services', label: 'Services', path: '/services/', paths: ['/services/'], home: [],
    note: 'The homepage services section stays; its "All services" link goes.' },
  { key: 'devlog', label: 'Devlog', path: '/devlog/', paths: ['/devlog/', '/post/'], home: ['devlog'],
    note: 'Also hides every entry, the RSS link and the homepage devlog section.' },
  { key: 'care', label: 'Care plans', path: '/care-plans/', paths: ['/care-plans/'], home: [], menu: false,
    note: 'Optional ongoing care. Also leaves the footer and the "interested in a care plan" choice on the request form.' },
  { key: 'about', label: 'About', path: '/about/', paths: ['/about/'], home: [], note: '' },
  { key: 'contact', label: 'Contact', path: '/contact/', paths: ['/contact/'], home: [],
    note: 'People can still reach you through the request form and your email.' },
]);
// Pages made in Admin -> Pages live at /p/?id=<slug>.
const customPageUrl = id => `/p/?id=${encodeURIComponent(id)}`;
// A page of your own that the built-in Care plans page replaces (the old starter copy may still be saved in the database).
const SUPERSEDED_PAGES = ['care-and-hosting-plans'];
// Where a page of your own is linked: 'both' (menu and footer), 'footer' or 'none' (reachable by its address
// and from other pages only). Older pages only have inNav.
const pageWhere = p => p.where || (p.inNav === false ? 'none' : 'both');

// The starter pages shown on a fresh site (FAQ, care plans, a cost guide, three local pages). They are ordinary
// pages: edit or delete them in Admin -> Pages, and the first save keeps whatever you decide. Written as plain JSON
// so scripts/build_sitemap.py can read the same list.
// STARTER_PAGES
const STARTER_PAGES = [
  {
    "id": "faq",
    "title": "Website FAQ",
    "navLabel": "FAQ",
    "intro": "Straight answers to the questions we get asked most about getting a website built.",
    "where": "both",
    "faq": true,
    "blocks": [
      {
        "style": "subtitle",
        "text": "How much does a website cost?"
      },
      {
        "style": "paragraph",
        "text": "It depends on what you need. As a guide: a one-page Lite landing page starts from $500, a Starter website (up to five pages) is $1,500 to $2,000, and a Business website with more pages and a way to update it yourself is $3,000 to $4,500. Bigger or more custom builds are quoted individually. All prices are in Australian dollars. Send a request and we'll confirm what yours would involve."
      },
      {
        "style": "subtitle",
        "text": "How long does it take?"
      },
      {
        "style": "paragraph",
        "text": "A one-page site is usually live within a week. A full website depends mostly on how quickly we get your text and photos and how many rounds of feedback it takes, so a typical small business site takes a few weeks. You'll get a clear timeline when we accept your request."
      },
      {
        "style": "subtitle",
        "text": "Who owns the website?"
      },
      {
        "style": "paragraph",
        "text": "You do. Your website, your content and your domain name are yours, with no lock-in. We'll explain exactly how hosting and handover work in your quote, so there are no surprises."
      },
      {
        "style": "subtitle",
        "text": "Do you do hosting?"
      },
      {
        "style": "paragraph",
        "text": "Yes. We can host your site and look after it after launch, or set it up on hosting you already have. Our care and hosting plans cover keeping it online, secure and up to date."
      },
      {
        "style": "subtitle",
        "text": "Can I update the website myself?"
      },
      {
        "style": "paragraph",
        "text": "Yes. The Business website includes an admin panel so you can change text and photos yourself, no developer needed. On smaller sites, send us what you'd like changed and we'll take care of it."
      },
      {
        "style": "subtitle",
        "text": "Will my website work on phones?"
      },
      {
        "style": "paragraph",
        "text": "Yes. Every site we build is designed mobile-first and checked on phones, tablets and desktops before it launches."
      },
      {
        "style": "subtitle",
        "text": "Will people be able to find my business on Google?"
      },
      {
        "style": "paragraph",
        "text": "We build every site with clean structure, fast loading and the basics of on-page SEO, which gives you a solid start. Ranking well also depends on your competition, your Google Business Profile and your reviews, and we can talk you through the next steps. We can't promise a ranking position, and anyone who does is guessing."
      },
      {
        "style": "subtitle",
        "text": "What do you need from me to get started?"
      },
      {
        "style": "paragraph",
        "text": "A short description of your business and what you want the site to do, any logo and photos you already have, and a few sites you like. Don't worry if you don't have it all: we'll help you work out the rest."
      },
      {
        "style": "subtitle",
        "text": "How do I see how my project is going?"
      },
      {
        "style": "paragraph",
        "text": "Every request gets a private tracking link, with no account or password needed. It shows exactly where your project is up to, from accepted through design and build to launch, and you get an email at each step."
      },
      {
        "style": "subtitle",
        "text": "Do you build apps too?"
      },
      {
        "style": "paragraph",
        "text": "Yes, on request. Websites are our main focus, but we build iOS and Android apps for the right projects. Tell us the idea and we'll tell you honestly whether it's a fit."
      },
      {
        "style": "subtitle",
        "text": "Where are you based?"
      },
      {
        "style": "paragraph",
        "text": "We're based in Brisbane, Queensland, and work with clients across Australia. Most of the work happens online, so you don't need to be local."
      },
      {
        "style": "subtitle",
        "text": "How do I get started?"
      },
      {
        "style": "paragraph",
        "text": "Send a project request. It takes about a minute, and we'll reply with a yes or no and what comes next."
      }
    ],
    "image": "",
    "inNav": true,
    "status": "published"
  },
  {
    "id": "how-much-does-a-website-cost-in-australia",
    "title": "How much does a small business website cost in Australia?",
    "navLabel": "Website costs",
    "intro": "A plain-English guide to what drives the price of a website, with our own starting prices.",
    "where": "footer",
    "blocks": [
      {
        "style": "paragraph-lg",
        "text": "Quotes for the same website can range from a few hundred dollars to tens of thousands. Here's what actually drives the price, and what you can expect to pay for a small business website in Australia."
      },
      {
        "style": "title",
        "text": "What changes the price"
      },
      {
        "style": "bullets",
        "text": "How many pages you need\nCustom design versus a reused template\nFeatures such as booking, enquiry forms, online payments or a login area\nWhether you can update it yourself or we do it for you\nHow much content (text and photos) we need to write or source"
      },
      {
        "style": "title",
        "text": "Our starting prices (AUD)"
      },
      {
        "style": "bullets",
        "text": "Lite landing page: from $500. One well-designed page to get you online fast.\nStarter website: $1,500 to $2,000. Up to five pages, designed and built from scratch.\nBusiness website: $3,000 to $4,500. More pages, forms, and an admin panel so you can update it yourself.\nCustom builds and apps: quoted individually."
      },
      {
        "style": "title",
        "text": "What to look for in any quote"
      },
      {
        "style": "bullets",
        "text": "Is the design made for your business, or a reused template?\nWho owns the site, the content and the domain name?\nIs hosting included, and what does it cost after the first year?\nWhat happens when you want a change: how fast, and what does it cost?\nWill it work properly on phones?"
      },
      {
        "style": "title",
        "text": "Costs after launch"
      },
      {
        "style": "paragraph",
        "text": "Beyond the build, there's a domain name (a modest yearly cost) and hosting, if it isn't included. A care plan is optional on top."
      },
      {
        "style": "title",
        "text": "Get a clear number"
      },
      {
        "style": "paragraph",
        "text": "Send us a quick request and we'll tell you what yours would involve and what it would cost. No obligation."
      }
    ],
    "image": "",
    "inNav": true,
    "status": "published"
  },
  {
    "id": "websites-for-tradies-brisbane",
    "title": "Websites for tradies in Brisbane",
    "navLabel": "Tradies",
    "intro": "A simple, fast website that turns \"who's a good sparky near me?\" into phone calls and quote requests.",
    "where": "none",
    "group": "industry",
    "blocks": [
      {
        "style": "paragraph-lg",
        "text": "When someone needs a plumber, electrician, builder or landscaper, they search on their phone, look at two or three sites, and call the first one that looks trustworthy. A good tradie website makes sure that's you."
      },
      {
        "style": "title",
        "text": "What a tradie website needs"
      },
      {
        "style": "bullets",
        "text": "Your services and the suburbs you cover, clearly listed\nA tap-to-call button and a quick quote request form\nPhotos of your real work\nYour licence number, insurance and reviews, front and centre\nFast loading on a phone with patchy signal"
      },
      {
        "style": "title",
        "text": "Where we'd start"
      },
      {
        "style": "paragraph",
        "text": "Most tradies are well served by our Lite landing page or Starter website: a handful of pages, built to be found on Google in the suburbs you work in, and live fast. If you'd like to update photos and jobs yourself, the Business website adds an admin panel."
      },
      {
        "style": "title",
        "text": "Found locally"
      },
      {
        "style": "paragraph",
        "text": "We set your site up for local search and show you how to get your Google Business Profile working alongside it, because that's where most tradie enquiries start."
      }
    ],
    "image": "",
    "inNav": false,
    "status": "published"
  },
  {
    "id": "websites-for-cafes-and-restaurants-brisbane",
    "title": "Websites for cafes and restaurants in Brisbane",
    "navLabel": "Cafes & restaurants",
    "intro": "Menus, hours and bookings that are easy to find, and a site that looks as good as the food.",
    "where": "none",
    "group": "industry",
    "blocks": [
      {
        "style": "paragraph-lg",
        "text": "Hungry people check three things: what's on the menu, whether you're open, and how to get a table. If they can't find those in a few seconds, they move on."
      },
      {
        "style": "title",
        "text": "What a hospitality website needs"
      },
      {
        "style": "bullets",
        "text": "A menu that's easy to read on a phone, not a PDF to pinch and zoom\nOpening hours and your address with a map link\nA booking or enquiry option for tables and events\nPhotos that make people hungry\nSpecials and news you can update quickly"
      },
      {
        "style": "title",
        "text": "Where we'd start"
      },
      {
        "style": "paragraph",
        "text": "A Starter website covers most cafes: home, menu, about and contact. If you want to change menus, hours and specials yourself without calling anyone, the Business website includes an admin panel for exactly that."
      }
    ],
    "image": "",
    "inNav": false,
    "status": "published"
  },
  {
    "id": "websites-for-small-business-and-sole-traders-brisbane",
    "title": "Websites for small businesses and sole traders in Brisbane",
    "navLabel": "Small business",
    "intro": "Look established, get found, and make it easy for customers to get in touch, without an agency-sized budget.",
    "where": "none",
    "group": "industry",
    "blocks": [
      {
        "style": "paragraph-lg",
        "text": "You don't need a huge site. You need one that explains what you do, shows you're the real thing, and makes the next step obvious."
      },
      {
        "style": "title",
        "text": "What a small business website needs"
      },
      {
        "style": "bullets",
        "text": "A clear one-line explanation of what you do and who it's for\nProof you're good: photos, reviews, past work\nAn easy way to get in touch: call, email or a short form\nSimple pages you can understand and keep current\nGood foundations for Google, so customers can find you"
      },
      {
        "style": "title",
        "text": "Where we'd start"
      },
      {
        "style": "paragraph",
        "text": "If you're starting out or need something online quickly, our Lite landing page from $500 gets you a proper presence, usually within a week. As you grow, we can build it up into a full website."
      },
      {
        "style": "title",
        "text": "Not sure what you need?"
      },
      {
        "style": "paragraph",
        "text": "Send a request and tell us about your business. We'll recommend the simplest option that does the job, even if that's the cheaper one."
      }
    ],
    "image": "",
    "inNav": false,
    "status": "published"
  }
];
// END STARTER_PAGES

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
  // Admin -> Pages: built-in pages switched off, and pages of your own
  //   custom: [{ id, title, navLabel, intro, image, blocks: [{ style, text, image }], where, group, faq, status }]
  pages: { hidden: [], custom: STARTER_PAGES },
  status: 'Independent Australian studio',
  // The "coming soon" curtain (Admin -> Homepage & settings). The switch itself lives in the database.
  comingSoon: {
    eyebrow: 'Seventh Boar Development',
    title: 'Something\'s coming.',
    text: "We're building it right now. Drop your email and you'll be first through the gate when it opens.",
    showEmail: true,
  },
  // Getting in touch (Admin -> Homepage & settings): the reply promise shown on the request and contact pages, and an
  // optional "book a call" link (a Google Calendar appointment page, Calendly...). The call button only shows once a link is set.
  reach: { promiseShow: true, promise: 'We reply within one business day.', callUrl: '', callLabel: 'Book a 15-minute call' },
  // Optional ongoing care (Admin -> Homepage & settings -> Care plans): shown on /care-plans/ and offered on the request form.
  care: {
    "eyebrow": "Care plans",
    "title": "Care & hosting plans",
    "intro": "Launching is the start, not the finish. A care plan is completely optional: add it when we quote your website, or any time later. Month to month, with 30 days' notice to stop.",
    "tiers": [
      {
        "name": "Essentials",
        "price": "$49",
        "per": "/month",
        "tag": "Keep it running",
        "text": "For sites that mostly sit there and do their job.",
        "bullets": [
          "Domain and hosting managed for you",
          "Uptime monitoring",
          "Security and software updates",
          "1 small content change a month (about 30 minutes)",
          "Email support, reply within 2 business days"
        ]
      },
      {
        "name": "Growth",
        "price": "$119",
        "per": "/month",
        "tag": "Most popular",
        "text": "For businesses that keep changing things.",
        "bullets": [
          "Everything in Essentials",
          "2 hours of changes a month: text, photos, new pages, forms",
          "Monthly report: visits and enquiries",
          "Google Business Profile help",
          "Reply within 1 business day"
        ]
      },
      {
        "name": "Partner",
        "price": "$249",
        "per": "/month",
        "tag": "",
        "text": "We act like your in-house web person.",
        "bullets": [
          "Everything in Growth",
          "5 hours of changes a month",
          "Quarterly review: what is working and what to change",
          "Priority: same or next business day"
        ]
      }
    ],
    "note": "Extra work outside your plan is $100 an hour, with a 30-minute minimum. Pay for a year up front and get 2 months free. Plan hours don't roll over. Prices are in Australian dollars (AUD).",
    "compare": {
      "eyebrow": "The maths",
      "title": "What a website costs over three years",
      "intro": "Renting a platform looks cheap each month, but the rent never stops. Here is the honest comparison for a small business site.",
      "items": [
        {
          "title": "Rent a platform yourself",
          "total": "About $1,500–$2,000",
          "text": "Shopify, Wix or Squarespace at roughly $42–$56 a month, plus apps and payment fees. You build it and look after it, and you rent it for as long as you use it."
        },
        {
          "title": "Starter website, no care plan",
          "total": "$1,500–$2,000 once",
          "text": "Custom-built and yours to keep. After launch you only pay for your domain name, so from year four it costs next to nothing."
        },
        {
          "title": "Starter website + Essentials",
          "total": "About $3,300–$3,800",
          "text": "The same custom site, plus someone who looks after it: hosting, updates, monitoring and changes, for $49 a month."
        }
      ],
      "note": "Estimates only. Platform prices and fees change, so check them before you decide. Need a real online store with payments, stock and shipping? Shopify may be the right tool, and we'll tell you honestly if it is."
    }
  },
  // The "why clients choose us" strip under the homepage hero.
  trust: {
    show: true, eyebrow: 'Why clients choose us', title: 'What you get with every project',
    items: [
      { title: 'A private progress tracker', text: 'Every request gets its own private link showing exactly where your project is up to, from accepted to launched. No chasing, no guessing.' },
      { title: 'You own your website', text: 'No lock-in. Your website, your content and your domain name are yours.' },
      { title: 'Brisbane-based, Australia-wide', text: 'A small independent studio you deal with directly, working with clients right across the country.' },
    ],
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
    eyebrow: 'Sec. 02 // Pricing', title: 'Pricing guide',
    intro: 'Every project is different, so treat these as starting points. Send a request and we\'ll confirm what yours would involve.',
    footnote: 'Prices are in Australian dollars (AUD).',
    trust: 'You own your website. No lock-in: your site, your content and your domain name are yours.',
    items: [
      { kind: 'website', tag: 'Quick & simple', title: 'Lite landing page', price: 'From $500',
        text: 'A single, well-designed page to get you online fast: a simple presence, a personal brand, or a "coming soon" while something bigger is built.',
        bullets: ['One page, built to scroll', 'Mobile-friendly', 'Your contact details or a simple enquiry form', 'Usually live within a week'] },
      { kind: 'website', tag: 'Most popular', title: 'Starter website', price: '$1,500\u2013$2,000',
        text: 'A custom-built website for a small business that needs a proper home online. Exact price depends on how many pages and features you need.',
        bullets: ['Up to 5 pages', 'Designed and built from scratch', 'Mobile-friendly, fast to load', 'Contact form', 'Basic on-page SEO'] },
      { kind: 'website', tag: '', title: 'Business website', price: '$3,000\u2013$4,500',
        text: 'For a business that needs more room to grow: more pages, a way to update it yourself, and forms that do more than say hello.',
        bullets: ['More pages, structured around your business', 'Update text and photos yourself, no developer needed', 'Quote, booking or enquiry forms', 'Deeper on-page SEO'] },
      { kind: 'website', tag: 'Bigger projects', title: 'Custom build', price: 'Custom quote',
        text: "Online stores, your own admin dashboard, booking systems, or anything else that needs custom features built from scratch.",
        bullets: ['Online store or payments', 'A custom admin area, like this site\'s own', 'Integrations with other tools you use', 'Scoped and quoted after a request'] },
      { kind: 'app', tag: 'On request', title: 'Apps', price: 'Custom quote',
        text: 'iOS and Android apps, scoped and quoted once we understand what you need.',
        bullets: ['iOS and Android', 'Built around real, daily use', 'Scoped with you before a quote'] },
    ],
  },
  typesSection: { eyebrow: 'Sec. 03 // Our work', title: 'Websites, apps & games', link: 'See all work' },
  latestSection: { eyebrow: 'Sec. 04 // Latest work', title: 'Fresh off the build', intro: 'Websites, apps and games shaped with care, restraint and a clear sense of purpose.' },
  teamSection: {
    eyebrow: 'Sec. 05 // The studio', title: 'Meet the studio',
    intro: 'A small team that cares how things feel to use.',
    ctaText: 'Work with us', ctaUrl: '/contact/',
  },
  devlogSection: { eyebrow: 'Sec. 07 // From the devlog', title: 'Latest entries' },
  build: {
    show: true,
    eyebrow: 'Sec. 08 // How we build', title: 'Built to last',
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
  reportsSection: { eyebrow: 'Sec. 09 // Client words', title: 'Kind words' },
  cta: {
    show: true, title: 'Need a website?',
    text: 'Tell us about your business and what you need. We\'ll come back with a plan.',
    ctaText: 'Start your website', ctaUrl: '/request/',
  },
  newsletter: {
    show: true, eyebrow: 'Sec. 10 // Follow along', title: 'Follow the build',
    text: 'Devlog updates and release news, straight to your inbox.',
    fine: 'Unsubscribe any time. No spam, ever.',
    thanks: "You're on the list. Welcome aboard.",
  },
  footer: {
    tagline: 'Built with purpose. Made with bite.',
    blurb: 'An independent Australian studio building custom websites for businesses and brands, with apps built on request.',
    email: 'info@seventhboar.com',
    abn: '',                              // shown in the footer when filled in (Admin -> Homepage & settings -> Footer)
    location: 'Brisbane, Queensland',
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
