const content = window.seventhBoarContent || { projects: [], posts: [] };

if (
  /^https?:$/.test(window.location.protocol) &&
  /\/index\.html$/.test(window.location.pathname)
) {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  const normalizedPath = cleanPath || "/";
  const nextUrl = `${normalizedPath}${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
};

const sortByDateDesc = (items) =>
  [...items].sort((left, right) => {
    const leftDate = Date.parse(left.date || "");
    const rightDate = Date.parse(right.date || "");

    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
      return 0;
    }

    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    return rightDate - leftDate;
  });

const projectCardMarkup = (project) => `
  <article class="card project-card reveal" data-category="${(project.categories || []).join(" ")}">
    <div class="project-visual">
      <div class="visual-stack">
        <div class="visual-pane">
          <div>
            <strong>${project.title}</strong>
            <span>${project.summary}</span>
          </div>
          <span class="visual-token">${project.type}</span>
        </div>
      </div>
    </div>
    <div class="meta">
      <span class="chip">${project.badge}</span>
      ${(project.tags || []).map((tag) => `<span class="chip ink">${tag}</span>`).join("")}
    </div>
    <h3>${project.title}</h3>
    <p>${project.summary}</p>
    <footer><a class="text-link" href="${project.href}">View project</a></footer>
  </article>
`;

const projectDirectoryMarkup = (project) => `
  <article class="directory-row reveal" data-category="${(project.categories || []).join(" ")}">
    <div>
      <h3>${project.title}</h3>
      <div class="directory-meta">
        <span class="chip">${project.type}</span>
        ${(project.tags || []).map((tag) => `<span class="chip ink">${tag}</span>`).join("")}
      </div>
    </div>
    <div class="directory-copy">
      <p>${project.summary}</p>
      ${project.date ? `<p class="microcopy">Published ${formatDate(project.date)}</p>` : ""}
    </div>
    <div class="directory-cta">
      <a class="text-link" href="${project.href}">View details</a>
    </div>
  </article>
`;

const postCardMarkup = (post) => `
  <article class="card article-card reveal">
    <div class="meta">
      <span class="chip">Journal</span>
      <span class="chip ink">${post.category}</span>
    </div>
    <h3>${post.title}</h3>
    <p>${post.summary}</p>
    <footer>
      <a class="text-link" href="${post.href}">Read post</a>
    </footer>
  </article>
`;

const postDirectoryMarkup = (post) => `
  <article class="directory-row reveal">
    <div>
      <h3>${post.title}</h3>
      <div class="directory-meta">
        <span class="chip">Journal</span>
        <span class="chip ink">${post.category}</span>
      </div>
    </div>
    <div class="directory-copy">
      <p>${post.summary}</p>
      <p class="microcopy">Published ${formatDate(post.date)}</p>
    </div>
    <div class="directory-cta">
      <a class="text-link" href="${post.href}">Read post</a>
    </div>
  </article>
`;

const renderContent = () => {
  const orderedProjects = sortByDateDesc(content.projects);
  const orderedPosts = sortByDateDesc(content.posts);
  const featuredProjects = orderedProjects.filter((project) => project.featured);
  const archiveProjects = orderedProjects.filter((project) => !project.featured);
  const latestProjects = orderedProjects.slice(0, 3);
  const latestPosts = orderedPosts;
  const featuredPost = orderedPosts.find((post) => post.featured) || orderedPosts[0];

  const homeProjects = document.querySelector("[data-home-projects]");
  if (homeProjects) {
    homeProjects.innerHTML = latestProjects.map(projectCardMarkup).join("");
  }

  const homePosts = document.querySelector("[data-home-posts]");
  if (homePosts) {
    homePosts.innerHTML = latestPosts.slice(0, 2).map(postCardMarkup).join("");
  }

  const featuredProjectsTarget = document.querySelector("[data-featured-projects]");
  if (featuredProjectsTarget) {
    featuredProjectsTarget.innerHTML = featuredProjects.map(projectCardMarkup).join("");
  }

  const projectDirectoryTarget = document.querySelector("[data-project-directory]");
  if (projectDirectoryTarget) {
    projectDirectoryTarget.innerHTML = archiveProjects.map(projectDirectoryMarkup).join("");
  }

  const featuredPostTarget = document.querySelector("[data-featured-post]");
  if (featuredPostTarget && featuredPost) {
    featuredPostTarget.innerHTML = `
      <div class="meta">
        <span class="chip">Featured Article</span>
        <span class="chip ink">${featuredPost.category}</span>
      </div>
      <h2 class="section-title">${featuredPost.title}</h2>
      <p class="section-copy">${featuredPost.summary}</p>
      <p class="microcopy">Published ${formatDate(featuredPost.date)}</p>
      <div class="hero-actions">
        <a class="button" href="${featuredPost.href}">Read featured article</a>
      </div>
    `;
  }

  const postArchiveTarget = document.querySelector("[data-post-archive]");
  if (postArchiveTarget) {
    postArchiveTarget.innerHTML = latestPosts.map(postDirectoryMarkup).join("");
  }
};

renderContent();

const navToggle = document.querySelector("[data-nav-toggle]");
const navPanel = document.querySelector("[data-nav-panel]");

if (navToggle && navPanel) {
  navToggle.addEventListener("click", () => {
    const isOpen = navPanel.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const activeGroup = document.body.dataset.nav;

if (activeGroup) {
  document.querySelectorAll("[data-page]").forEach((link) => {
    if (link.dataset.page === activeGroup) {
      link.classList.add("is-current");
    }
  });
}

const yearTarget = document.querySelector("[data-year]");

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const filterButtons = document.querySelectorAll("[data-filter-button]");
const filterItems = document.querySelectorAll("[data-category]");

if (filterButtons.length && filterItems.length) {
  const setFilter = (value) => {
    filterButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.filterButton === value);
    });

    filterItems.forEach((item) => {
      const categories = item.dataset.category.split(" ");
      const shouldShow = value === "all" || categories.includes(value);
      item.classList.toggle("is-hidden", !shouldShow);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setFilter(button.dataset.filterButton);
    });
  });

  setFilter("all");
}

const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name") || "";
    const email = formData.get("email") || "";
    const company = formData.get("company") || "";
    const reason = formData.get("reason") || "";
    const subject = formData.get("subject") || "Website contact";
    const message = formData.get("message") || "";

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : "",
      reason ? `Reason: ${reason}` : "",
      "",
      message
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:hello@seventhboar.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
}
