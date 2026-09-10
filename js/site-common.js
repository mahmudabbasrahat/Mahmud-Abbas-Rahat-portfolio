/* =========================================================
   SITE-WIDE UI BEHAVIOR
   Shared by every public page: mobile menu, scroll progress
   bar, navbar shadow, scroll-reveal animation, back-to-top.
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  /* MOBILE MENU */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* NAVBAR SCROLL + PROGRESS BAR */
  const siteNav = document.getElementById("siteNav");
  const progressBar = document.getElementById("progressBar");
  const backToTop = document.getElementById("backToTop");

  function onScroll() {
    const scrollY = window.scrollY;
    if (siteNav) siteNav.classList.toggle("scrolled", scrollY > 12);
    if (backToTop) backToTop.classList.toggle("show", scrollY > 500);

    if (progressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      progressBar.style.width = progress + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* SCROLL REVEAL */
  const revealEls = document.querySelectorAll("[data-reveal]");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  revealEls.forEach(el => revealObserver.observe(el));
});
