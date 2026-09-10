/* =========================================================
   SUPABASE CLIENT
   Creates one shared client (window.db) used by every public
   page and the admin panel. Depends on:
     1. The Supabase CDN <script> tag (loaded before this file)
     2. js/supabase-config.js (loaded before this file)
========================================================= */
(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const notConfigured = !cfg.url || !cfg.anonKey || cfg.url.includes("YOUR-PROJECT-REF");

  if (notConfigured) {
    console.warn(
      "[Supabase] Not configured yet. Edit js/supabase-config.js with your project URL and anon key. " +
      "See SETUP.md for step-by-step instructions."
    );
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[Supabase] Client library failed to load. Check the CDN <script> tag on this page.");
    window.db = null;
    window.SUPABASE_READY = false;
    return;
  }

  window.db = window.supabase.createClient(cfg.url, cfg.anonKey);
  window.SUPABASE_READY = !notConfigured;
})();
