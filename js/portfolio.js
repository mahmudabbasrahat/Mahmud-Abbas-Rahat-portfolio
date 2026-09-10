/* =========================================================
   PORTFOLIO — shared, data-driven rendering
   Used by: index.html (Featured Work), digital-marketing.html,
   seo.html, graphic-design.html, website-design.html.
   All project data comes from Supabase — nothing is hard-coded.
========================================================= */

const SECTOR_LABELS = {
  "digital-marketing": "Digital Marketing",
  "seo": "SEO",
  "graphic-design": "Graphic Design",
  "website-design": "Website Design"
};

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------
   DATA FETCHING
--------------------------------------------------------- */
async function fetchFeaturedProjects(limit = 6) {
  if (!window.db) return { data: [], error: new Error("Supabase not configured") };
  return window.db
    .from("projects")
    .select("*")
    .eq("published", true)
    .eq("featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
}

async function fetchProjectsBySector(sector) {
  if (!window.db) return { data: [], error: new Error("Supabase not configured") };
  return window.db
    .from("projects")
    .select("*")
    .eq("published", true)
    .eq("sector", sector)
    .order("sort_order", { ascending: true });
}

async function fetchProjectBySlug(slug) {
  if (!window.db) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await window.db
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return { data, error };
}

/* ---------------------------------------------------------
   RENDERING — project cards (matches existing .proj-card design)
--------------------------------------------------------- */
function renderProjectCard(project) {
  const img = project.main_image || (Array.isArray(project.gallery) && project.gallery[0]) || "";
  const alt = project.alt_text || project.title;
  const category = project.category || SECTOR_LABELS[project.sector] || "";

  return `
    <article class="proj-card" data-category="${escapeHtml(category)}" tabindex="0" role="link"
      aria-label="View case study: ${escapeHtml(project.title)}"
      onclick="window.location.href='project.html?slug=${encodeURIComponent(project.slug)}'"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location.href='project.html?slug=${encodeURIComponent(project.slug)}';}">
      <div class="proj-thumb">
        ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(alt)}" loading="lazy">` : `<div class="proj-thumb-placeholder"></div>`}
        <span class="proj-cat">${escapeHtml(category)}</span>
      </div>
      <div class="proj-body">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.short_description || "Data not added yet")}</p>
        <span class="proj-view">View Case Study
          <svg viewBox="0 0 16 16" width="13" height="13"><path d="M2 8h11M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        </span>
      </div>
    </article>
  `;
}

function renderSkeletonCards(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <article class="proj-card skeleton-card" aria-hidden="true">
        <div class="proj-thumb skeleton-block"></div>
        <div class="proj-body">
          <div class="skeleton-line" style="width:70%"></div>
          <div class="skeleton-line" style="width:100%"></div>
          <div class="skeleton-line" style="width:40%"></div>
        </div>
      </article>
    `;
  }
  return html;
}

function renderEmptyState(message) {
  return `
    <div class="portfolio-empty">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderErrorState() {
  return `
    <div class="portfolio-empty portfolio-error">
      <p>We couldn't load projects right now. Please refresh, or check back shortly.</p>
    </div>
  `;
}

/* ---------------------------------------------------------
   FILTER BAR — built dynamically from whatever categories
   actually exist among the loaded (published) projects.
--------------------------------------------------------- */
function buildFilterBar(filterBarEl, gridEl, projects) {
  if (!filterBarEl) return;
  const categories = ["All", ...new Set(projects.map(p => p.category).filter(Boolean))];

  if (categories.length <= 1) {
    filterBarEl.style.display = "none";
    return;
  }

  filterBarEl.innerHTML = "";
  categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (i === 0 ? " active" : "");
    btn.textContent = cat;
    btn.dataset.filter = cat;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    filterBarEl.appendChild(btn);
  });

  filterBarEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    filterBarEl.querySelectorAll(".filter-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");

    const filter = btn.dataset.filter;
    const cards = gridEl.querySelectorAll(".proj-card");

    cards.forEach(card => {
      const match = filter === "All" || card.dataset.category === filter;
      if (match) {
        card.classList.remove("is-hidden");
        card.classList.remove("is-filtering");
        void card.offsetWidth; // restart animation
        card.classList.add("is-filtering");
      } else {
        card.classList.add("is-hidden");
      }
    });
  });
}

/* ---------------------------------------------------------
   PUBLIC ENTRY POINTS
--------------------------------------------------------- */

// Homepage — Featured Work section
async function initFeaturedWork({ gridId, emptyMessage }) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = renderSkeletonCards(3);

  try {
    const { data, error } = await fetchFeaturedProjects(6);
    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = renderEmptyState(emptyMessage || "Featured projects will be added soon.");
      return;
    }

    grid.innerHTML = data.map(renderProjectCard).join("");
  } catch (err) {
    console.error("Featured Work load error:", err);
    grid.innerHTML = renderErrorState();
  }
}

// Sector pages — full published list for one sector, with filters
async function initSectorPortfolio({ sector, gridId, filterBarId, emptyMessage }) {
  const grid = document.getElementById(gridId);
  const filterBar = document.getElementById(filterBarId);
  if (!grid) return;

  grid.innerHTML = renderSkeletonCards(6);
  if (filterBar) filterBar.innerHTML = "";

  try {
    const { data, error } = await fetchProjectsBySector(sector);
    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = renderEmptyState(emptyMessage || "No projects added to this category yet.");
      return;
    }

    grid.innerHTML = data.map(renderProjectCard).join("");
    buildFilterBar(filterBar, grid, data);
  } catch (err) {
    console.error(`Sector portfolio (${sector}) load error:`, err);
    grid.innerHTML = renderErrorState();
  }
}
