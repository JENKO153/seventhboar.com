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
      if (link.classList.contains("nav-cta") && activeGroup !== "contact") {
        link.classList.remove("is-current");
      }
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
    const projectType = formData.get("projectType") || "";
    const timeframe = formData.get("timeframe") || "";
    const subject = formData.get("subject") || "New project inquiry";
    const message = formData.get("message") || "";

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Project type: ${projectType}`,
      `Timeframe: ${timeframe}`,
      "",
      message
    ].join("\n");

    const mailto = `mailto:hello@seventhboar.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
}
