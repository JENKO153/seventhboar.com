if (
  /^https?:$/.test(window.location.protocol) &&
  /\/index\.html$/.test(window.location.pathname)
) {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  const normalizedPath = cleanPath || "/";
  const nextUrl = `${normalizedPath}${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

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

    const mailto = `mailto:Admin@seventhboar.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
}
