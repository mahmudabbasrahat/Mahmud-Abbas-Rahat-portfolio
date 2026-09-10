/* =========================================================
   HOMEPAGE-SPECIFIC SCRIPT
   Shared UI (nav, scroll reveal, back-to-top, progress bar)
   now lives in js/site-common.js and is used on every page.
   This file only handles the contact form on index.html.
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     CONTACT FORM VALIDATION
     NOTE: This performs front-end validation only.
     Connect it to Formspree, EmailJS, a custom
     backend, or another email service to enable
     actual email delivery.
  ========================================= */
  const contactForm = document.getElementById("contactForm");
  const formSuccess = document.getElementById("formSuccess");
  if (!contactForm) return;

  const validators = {
    fullName: (v) => v.trim().length >= 2 || "Please enter your full name.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email address.",
    subject: (v) => v.trim().length >= 3 || "Please enter a subject.",
    message: (v) => v.trim().length >= 10 || "Message should be at least 10 characters."
  };

  function validateField(field) {
    const input = document.getElementById(field);
    const errorEl = document.getElementById("err-" + field);
    const result = validators[field](input.value);
    const row = input.closest(".form-row");

    if (result === true) {
      row.classList.remove("invalid");
      errorEl.textContent = "";
      return true;
    } else {
      row.classList.add("invalid");
      errorEl.textContent = result;
      return false;
    }
  }

  Object.keys(validators).forEach(field => {
    const input = document.getElementById(field);
    if (input) input.addEventListener("blur", () => validateField(field));
  });

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    formSuccess.textContent = "";

    let allValid = true;
    Object.keys(validators).forEach(field => {
      if (!validateField(field)) allValid = false;
    });

    if (!allValid) return;

    // Front-end only: no email service is connected yet.
    formSuccess.textContent = "Thanks — your message looks good. Connect a form service (Formspree, EmailJS, etc.) to enable delivery.";
    contactForm.reset();
  });

});
