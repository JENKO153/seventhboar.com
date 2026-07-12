/*
  Seventh Boar content source

  To add a new project:
  1. Duplicate an existing file in /projects or create a new project page.
  2. Add the new project object below.

  To add a new journal post:
  1. Duplicate /journal/post-template.html into a new file in /journal.
  2. Update the new post page content.
  3. Add the new post object below.

  The Home, Work, and Journal pages will update automatically.
*/

window.seventhBoarContent = {
  projects: [
    {
      title: "Ashes of the Hollow",
      href: "projects/ashes-of-the-hollow.html",
      type: "Game",
      categories: ["game"],
      tags: ["Narrative", "Systems Design"],
      summary:
        "A project page built around atmosphere, worldbuilding, and the structure behind a stronger player experience.",
      badge: "Featured",
      featured: true,
      latest: true
    },
    {
      title: "Not Another Monday",
      href: "projects/not-another-monday.html",
      type: "App",
      categories: ["app"],
      tags: ["Mobile UX", "Product Design"],
      summary:
        "An app-focused case study showing calmer UX direction, better flow, and a more deliberate product presentation.",
      badge: "Latest",
      featured: true,
      latest: true
    },
    {
      title: "HexShift",
      href: "projects/hexshift.html",
      type: "Prototype",
      categories: ["prototype", "game"],
      tags: ["R&D", "Rapid Iteration"],
      summary:
        "A prototype story about fast iteration, strategic clarity, and documenting experimental work professionally.",
      badge: "R&D",
      featured: true,
      latest: true
    },
    {
      title: "My Care Circle",
      href: "work.html",
      type: "App",
      categories: ["app"],
      tags: ["Pipeline", "Healthcare UX"],
      summary:
        "Reserved space for future product work once more app case studies are ready to be published.",
      badge: "Coming Soon",
      featured: false,
      latest: false
    },
    {
      title: "Deadlock",
      href: "work.html",
      type: "Game",
      categories: ["game", "prototype"],
      tags: ["Roadmap", "Design Engineering"],
      summary:
        "A future space for systems-heavy work, technical storytelling, and more engineering-facing project notes.",
      badge: "Pipeline",
      featured: false,
      latest: false
    },
    {
      title: "Trade Wars",
      href: "work.html",
      type: "Prototype",
      categories: ["prototype"],
      tags: ["Lab", "Experiment"],
      summary:
        "An expandable archive slot for smaller experiments, prototypes, and supporting development work.",
      badge: "Archive",
      featured: false,
      latest: false
    }
  ],
  posts: [
    {
      title: "Building systems that survive first contact",
      href: "journal/building-systems-that-survive-first-contact.html",
      category: "Game Design",
      summary:
        "Why the first real user session tells the truth about whether a system is robust or only elegant in theory.",
      date: "2026-06-22",
      featured: true
    },
    {
      title: "From prototype to production without losing the spark",
      href: "journal/from-prototype-to-production.html",
      category: "Production",
      summary:
        "Keeping the strongest part of an idea alive while hardening the structure around it for real use.",
      date: "2026-05-30",
      featured: false
    }
  ]
};
