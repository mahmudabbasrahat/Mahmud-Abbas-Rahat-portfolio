/* =========================================================
   PROJECT CASE STUDY — renders project.html for a single
   project, loaded by ?slug=your-project-slug
========================================================= */

const METRIC_FIELDS = {
  "seo": [
    ["keywords", "Target Keywords"],
    ["ranking_before", "Keyword Ranking — Before"],
    ["ranking_after", "Keyword Ranking — After"],
    ["organic_traffic_before", "Organic Traffic — Before"],
    ["organic_traffic_after", "Organic Traffic — After"],
    ["impressions_before", "Impressions — Before"],
    ["impressions_after", "Impressions — After"],
    ["ctr_before", "CTR — Before"],
    ["ctr_after", "CTR — After"]
  ],
  "digital-marketing": [
    ["platform", "Platform"],
    ["campaign_objective", "Campaign Objective"],
    ["target_audience", "Target Audience"],
    ["ad_type", "Ad Type"],
    ["budget", "Budget"],
    ["leads", "Leads"],
    ["conversions", "Conversions"],
    ["roas", "ROAS"],
    ["cpa", "CPA"],
    ["ctr", "CTR"]
  ],
  "graphic-design": [
    ["design_type", "Design Type"],
    ["creative_brief", "Creative Brief"],
    ["deliverables", "Deliverables"],
    ["design_process", "Design Process"]
  ],
  "website-design": [
    ["technology", "Technology Used"],
    ["features", "Features"],
    ["website_type", "Website Type"],
    ["live_url", "Live URL"]
  ]
};

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  return String(value);
}

function renderMetricsSection(project) {
  const fields = METRIC_FIELDS[project.sector] || [];
  const metrics = project.metrics || {};

  const rows = fields.map(([key, label]) => {
    const formatted = formatMetricValue(metrics[key]);
    const value = formatted || "Data not added yet";
    const placeholderClass = formatted ? "" : " is-placeholder";
    return `<div class="metric-row${placeholderClass}"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`;
  }).join("");

  if (!rows) return "";

  return `
    <div class="case-section">
      <h4>06 — Performance / Results</h4>
      <div class="metrics-grid">${rows}</div>
    </div>
  `;
}

function renderTextSection(number, title, value) {
  if (!value) return "";
  return `
    <div class="case-section">
      <h4>${number} — ${escapeHtml(title)}</h4>
      <p>${escapeHtml(value)}</p>
    </div>
  `;
}

function renderGallerySection(project) {
  const gallery = Array.isArray(project.gallery) ? project.gallery : [];
  if (gallery.length === 0) return "";
  const imgs = gallery.map(src =>
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(project.title)} — screenshot" loading="lazy">`
  ).join("");
  return `
    <div class="case-section">
      <h4>08 — Screenshots</h4>
      <div class="case-gallery">${imgs}</div>
    </div>
  `;
}

function renderBeforeAfter(project) {
  if (!project.before_image && !project.after_image) return "";
  return `
    <div class="case-section">
      <h4>05 — Before / After</h4>
      <div class="before-after-grid">
        <div>
          <span class="ba-label">Before</span>
          ${project.before_image
            ? `<img src="${escapeHtml(project.before_image)}" alt="${escapeHtml(project.title)} — before" loading="lazy">`
            : `<div class="ba-placeholder">Data not added yet</div>`}
        </div>
        <div>
          <span class="ba-label">After</span>
          ${project.after_image
            ? `<img src="${escapeHtml(project.after_image)}" alt="${escapeHtml(project.title)} — after" loading="lazy">`
            : `<div class="ba-placeholder">Data not added yet</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderToolsSection(project) {
  const tools = Array.isArray(project.tools) ? project.tools : [];
  if (tools.length === 0) return "";
  return `
    <div class="case-section">
      <h4>07 — Tools</h4>
      <div class="modal-tools">${tools.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>
    </div>
  `;
}

function renderProjectLink(project) {
  const url = project.website || (project.metrics && project.metrics.live_url) || "";
  if (!url) return "";
  return `
    <div class="case-section">
      <h4>10 — Project Link</h4>
      <a class="btn btn-primary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Visit Project</a>
    </div>
  `;
}

function renderCaseStudy(project) {
  const category = project.category || SECTOR_LABELS[project.sector] || "";
  const gallery = Array.isArray(project.gallery) && project.gallery.length
    ? project.gallery
    : (project.main_image ? [project.main_image] : []);

  const heroImgs = gallery.map(src =>
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(project.alt_text || project.title)}" loading="lazy">`
  ).join("");

  document.getElementById("caseStudy").innerHTML = `
    <div class="case-hero-gallery">${heroImgs || `<div class="proj-thumb-placeholder large"></div>`}</div>

    <div class="case-content">
      <p class="modal-cat">${escapeHtml(category)} &middot; ${escapeHtml(SECTOR_LABELS[project.sector] || "")}</p>
      <h1 class="case-title">${escapeHtml(project.title)}</h1>

      <div class="case-section">
        <h4>01 — Project Overview</h4>
        <div class="modal-meta case-meta">
          <div><span>Client</span><p>${escapeHtml(project.client || "Not provided")}</p></div>
          <div><span>Industry</span><p>${escapeHtml(project.industry || "Not provided")}</p></div>
          <div><span>Duration</span><p>${escapeHtml(project.duration || "Not provided")}</p></div>
          <div><span>Category</span><p>${escapeHtml(category || "Not provided")}</p></div>
          <div><span>Role</span><p>${escapeHtml(project.role || "Not provided")}</p></div>
          <div><span>Website</span><p>${project.website ? escapeHtml(project.website) : "Not provided"}</p></div>
        </div>
        ${project.description ? `<p class="case-description">${escapeHtml(project.description)}</p>` : ""}
      </div>

      ${renderTextSection("02", "Problem", project.problem)}
      ${renderTextSection("03", "Strategy", project.strategy)}
      ${renderTextSection("04", "Work Done", project.work_done)}
      ${renderBeforeAfter(project)}
      ${renderMetricsSection(project)}
      ${renderToolsSection(project)}
      ${renderGallerySection(project)}
      ${renderTextSection("09", "Final Result", project.result)}
      ${renderProjectLink(project)}

      <a href="${sectorPageFor(project.sector)}" class="back-link">&larr; Back to ${escapeHtml(SECTOR_LABELS[project.sector] || "Portfolio")}</a>
    </div>
  `;

  // SEO metadata for this specific project
  const title = project.seo_title || `${project.title} | Mahmud Abbas Rahat`;
  const description = project.meta_description || project.short_description || "Case study by Mahmud Abbas Rahat.";
  document.title = title;
  setMeta("description", description);
  setMeta("og:title", title, true);
  setMeta("og:description", description, true);
  if (project.main_image) setMeta("og:image", project.main_image, true);
}

function sectorPageFor(sector) {
  const map = {
    "digital-marketing": "digital-marketing.html",
    "seo": "seo.html",
    "graphic-design": "graphic-design.html",
    "website-design": "website-design.html"
  };
  return map[sector] || "index.html#portfolio";
}

function setMeta(name, content, isProperty) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function renderNotFound() {
  document.getElementById("caseStudy").innerHTML = `
    <div class="case-not-found">
      <h1>Project not found</h1>
      <p>This project may have been unpublished or the link is incorrect.</p>
      <a href="index.html" class="btn btn-primary">Back to Home</a>
    </div>
  `;
}

async function initProjectPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const caseStudyEl = document.getElementById("caseStudy");

  if (!slug) {
    renderNotFound();
    return;
  }

  caseStudyEl.innerHTML = `<div class="portfolio-empty"><p>Loading case study…</p></div>`;

  try {
    const { data, error } = await fetchProjectBySlug(slug);
    if (error) throw error;
    if (!data) {
      renderNotFound();
      return;
    }
    renderCaseStudy(data);
  } catch (err) {
    console.error("Project load error:", err);
    caseStudyEl.innerHTML = renderErrorState();
  }
}

document.addEventListener("DOMContentLoaded", initProjectPage);
