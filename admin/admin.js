/* =========================================================
   ADMIN PANEL LOGIC
   Depends on: js/supabase-config.js, js/supabase-client.js
   (loaded before this file — provides window.db)
========================================================= */

const SECTOR_LABELS_ADMIN = {
  "digital-marketing": "Digital Marketing",
  "seo": "SEO",
  "graphic-design": "Graphic Design",
  "website-design": "Website Design"
};

// Sector-specific fields shown in the "Sector-Specific Details" fieldset.
// type: "text" | "textarea" | "list" (comma-separated -> array) | "url"
const METRIC_FIELD_CONFIG = {
  "seo": [
    ["keywords", "Target Keywords", "list"],
    ["ranking_before", "Ranking — Before", "text"],
    ["ranking_after", "Ranking — After", "text"],
    ["organic_traffic_before", "Organic Traffic — Before", "text"],
    ["organic_traffic_after", "Organic Traffic — After", "text"],
    ["impressions_before", "Impressions — Before", "text"],
    ["impressions_after", "Impressions — After", "text"],
    ["ctr_before", "CTR — Before", "text"],
    ["ctr_after", "CTR — After", "text"],
    ["gsc_notes", "Google Search Console Notes", "textarea"],
    ["ga4_notes", "GA4 Notes", "textarea"]
  ],
  "digital-marketing": [
    ["platform", "Platform", "text"],
    ["campaign_objective", "Campaign Objective", "text"],
    ["target_audience", "Target Audience", "text"],
    ["ad_type", "Ad Type", "text"],
    ["budget", "Budget", "text"],
    ["leads", "Leads", "text"],
    ["conversions", "Conversions", "text"],
    ["roas", "ROAS", "text"],
    ["cpa", "CPA", "text"],
    ["ctr", "CTR", "text"]
  ],
  "graphic-design": [
    ["design_type", "Design Type", "text"],
    ["creative_brief", "Creative Brief", "textarea"],
    ["deliverables", "Deliverables", "textarea"],
    ["design_process", "Design Process", "textarea"]
  ],
  "website-design": [
    ["technology", "Technology Used", "list"],
    ["features", "Features", "list"],
    ["website_type", "Website Type", "text"],
    ["live_url", "Live URL", "url"]
  ]
};

let currentProjects = [];  // cached list for dashboard/table
let editingId = null;      // null = creating a new project
let uploadedImages = { main_image: "", gallery: [], before_image: "", after_image: "" };

/* ---------------------------------------------------------
   AUTH + AUTHORIZATION
--------------------------------------------------------- */
function showLogin(message) {
  document.getElementById("loginView").hidden = false;
  document.getElementById("appView").hidden = true;
  if (message) document.getElementById("loginError").textContent = message;
}

async function showApp(user) {
  document.getElementById("loginView").hidden = true;
  document.getElementById("appView").hidden = false;
  document.getElementById("adminEmail").textContent = user.email;
  await loadDashboard();
}

async function checkAdminAndEnter(session) {
  if (!session || !session.user) {
    showLogin();
    return;
  }
  try {
    const { data: isAdmin, error } = await window.db.rpc("is_admin");
    if (error) throw error;

    if (!isAdmin) {
      await window.db.auth.signOut();
      showLogin("This account is signed in but is not authorized as an admin. Ask the site owner to add your user ID to admin_users.");
      return;
    }
    showApp(session.user);
  } catch (err) {
    console.error("Authorization check failed:", err);
    showLogin("Could not verify admin access. Check your Supabase configuration in js/supabase-config.js.");
  }
}

function initAuth() {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginSubmit = document.getElementById("loginSubmit");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Logging in…";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const { data, error } = await window.db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await checkAdminAndEnter(data.session);
    } catch (err) {
      loginError.textContent = err.message || "Login failed. Check your email and password.";
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Log In";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await window.db.auth.signOut();
    showLogin();
  });

  window.db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") showLogin();
  });
}

/* ---------------------------------------------------------
   NAVIGATION BETWEEN VIEWS
--------------------------------------------------------- */
function switchView(viewId) {
  document.querySelectorAll(".admin-view").forEach(v => v.hidden = true);
  document.getElementById(viewId).hidden = false;
  document.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
}

function initNav() {
  document.querySelectorAll(".admin-nav-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "addProjectNavBtn") openForm(null);
      else switchView(btn.dataset.view);
    });
  });
  document.getElementById("addProjectBtn").addEventListener("click", () => openForm(null));
  document.getElementById("cancelFormBtn").addEventListener("click", () => switchView("dashboardView"));
  document.getElementById("cancelFormBtn2").addEventListener("click", () => switchView("dashboardView"));
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
async function loadDashboard() {
  const tbody = document.getElementById("adminTableBody");
  tbody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;

  const { data, error } = await window.db
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7">Couldn't load projects: ${escapeHtmlAdmin(error.message)}</td></tr>`;
    return;
  }

  currentProjects = data || [];
  renderStats(currentProjects);
  renderTable(currentProjects);
}

function renderStats(projects) {
  const total = projects.length;
  const published = projects.filter(p => p.published).length;
  const draft = total - published;
  const featured = projects.filter(p => p.featured).length;

  const bySector = ["digital-marketing", "seo", "graphic-design", "website-design"]
    .map(s => `${SECTOR_LABELS_ADMIN[s]}: ${projects.filter(p => p.sector === s).length}`)
    .join(" &middot; ");

  document.getElementById("adminStats").innerHTML = `
    <div class="admin-stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total Projects</div></div>
    <div class="admin-stat-card"><div class="stat-num">${published}</div><div class="stat-label">Published</div></div>
    <div class="admin-stat-card"><div class="stat-num">${draft}</div><div class="stat-label">Drafts</div></div>
    <div class="admin-stat-card"><div class="stat-num">${featured}</div><div class="stat-label">Featured</div></div>
    <div class="admin-stat-card" style="grid-column:1/-1;"><div class="stat-label">${bySector}</div></div>
  `;
}

function renderTable(projects) {
  const tbody = document.getElementById("adminTableBody");
  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No projects yet. Click "+ Add New Project" to create your first one.</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td class="wrap">${escapeHtmlAdmin(p.title)}</td>
      <td>${escapeHtmlAdmin(SECTOR_LABELS_ADMIN[p.sector] || p.sector)}</td>
      <td>${escapeHtmlAdmin(p.category || "—")}</td>
      <td>${p.sort_order}</td>
      <td><span class="admin-badge ${p.featured ? "yes" : "no"}">${p.featured ? "Yes" : "No"}</span></td>
      <td><span class="admin-badge ${p.published ? "yes" : "no"}">${p.published ? "Published" : "Draft"}</span></td>
      <td>
        <div class="admin-row-actions">
          <button type="button" data-edit="${p.id}">Edit</button>
          <button type="button" data-toggle-featured="${p.id}">${p.featured ? "Unfeature" : "Feature"}</button>
          <button type="button" data-toggle-published="${p.id}">${p.published ? "Unpublish" : "Publish"}</button>
          <button type="button" class="danger" data-delete="${p.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => openForm(btn.dataset.edit)));
  tbody.querySelectorAll("[data-toggle-featured]").forEach(btn =>
    btn.addEventListener("click", () => toggleField(btn.dataset.toggleFeatured, "featured")));
  tbody.querySelectorAll("[data-toggle-published]").forEach(btn =>
    btn.addEventListener("click", () => toggleField(btn.dataset.togglePublished, "published")));
  tbody.querySelectorAll("[data-delete]").forEach(btn =>
    btn.addEventListener("click", () => deleteProject(btn.dataset.delete)));
}

async function toggleField(id, field) {
  const project = currentProjects.find(p => p.id === id);
  if (!project) return;
  const { error } = await window.db.from("projects").update({ [field]: !project[field] }).eq("id", id);
  if (error) { showToast(error.message, true); return; }
  showToast("Updated.");
  loadDashboard();
}

async function deleteProject(id) {
  const project = currentProjects.find(p => p.id === id);
  if (!project) return;
  if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;

  await cleanupStorageForProject(project);

  const { error } = await window.db.from("projects").delete().eq("id", id);
  if (error) { showToast(error.message, true); return; }
  showToast("Project deleted.");
  loadDashboard();
}

async function cleanupStorageForProject(project) {
  const bucket = "portfolio-images";
  const marker = `/storage/v1/object/public/${bucket}/`;
  const urls = [project.main_image, project.before_image, project.after_image, ...(project.gallery || [])].filter(Boolean);

  const paths = urls
    .filter(url => url.includes(marker))
    .map(url => url.split(marker)[1]);

  if (paths.length === 0) return; // nothing uploaded to our bucket (e.g. legacy /assets paths)

  try {
    await window.db.storage.from(bucket).remove(paths);
  } catch (err) {
    console.warn("Storage cleanup skipped some files:", err);
  }
}

/* ---------------------------------------------------------
   FORM: OPEN / RESET / SECTOR-SPECIFIC FIELDS
--------------------------------------------------------- */
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderMetricsFields(sector, existingMetrics) {
  const container = document.getElementById("metricsFields");
  const fields = METRIC_FIELD_CONFIG[sector] || [];
  const metrics = existingMetrics || {};

  if (fields.length === 0) {
    container.innerHTML = `<p class="admin-hint">Select a sector above to see its specific fields.</p>`;
    return;
  }

  container.innerHTML = fields.map(([key, label, type]) => {
    const raw = metrics[key];
    const value = Array.isArray(raw) ? raw.join(", ") : (raw || "");
    const id = "metric_" + key;
    if (type === "textarea") {
      return `<div class="form-row" style="grid-column:1/-1;"><label for="${id}">${label}</label><textarea id="${id}" rows="2">${escapeHtmlAdmin(value)}</textarea></div>`;
    }
    return `<div class="form-row"><label for="${id}">${label}${type === "list" ? " <span>(comma-separated)</span>" : ""}</label><input type="${type === "url" ? "url" : "text"}" id="${id}" value="${escapeHtmlAdmin(value)}"></div>`;
  }).join("");
}

function resetForm() {
  document.getElementById("projectForm").reset();
  document.getElementById("projectId").value = "";
  document.getElementById("formError").textContent = "";
  document.getElementById("uploadStatus").textContent = "";
  editingId = null;
  uploadedImages = { main_image: "", gallery: [], before_image: "", after_image: "" };
  ["mainImagePreview", "galleryPreview", "beforeImagePreview", "afterImagePreview"].forEach(id => {
    document.getElementById(id).innerHTML = "";
  });
  renderMetricsFields("", {});
}

function fillForm(project) {
  document.getElementById("projectId").value = project.id;
  document.getElementById("title").value = project.title || "";
  document.getElementById("slug").value = project.slug || "";
  document.getElementById("sector").value = project.sector || "";
  document.getElementById("category").value = project.category || "";
  document.getElementById("client").value = project.client || "";
  document.getElementById("website").value = project.website || "";
  document.getElementById("industry").value = project.industry || "";
  document.getElementById("duration").value = project.duration || "";
  document.getElementById("shortDescription").value = project.short_description || "";
  document.getElementById("description").value = project.description || "";
  document.getElementById("role").value = project.role || "";
  document.getElementById("problem").value = project.problem || "";
  document.getElementById("strategy").value = project.strategy || "";
  document.getElementById("workDone").value = project.work_done || "";
  document.getElementById("result").value = project.result || "";
  document.getElementById("tools").value = (project.tools || []).join(", ");
  document.getElementById("services").value = (project.services || []).join(", ");
  document.getElementById("tags").value = (project.tags || []).join(", ");
  document.getElementById("featured").checked = !!project.featured;
  document.getElementById("published").checked = !!project.published;
  document.getElementById("sortOrder").value = project.sort_order ?? 0;
  document.getElementById("seoTitle").value = project.seo_title || "";
  document.getElementById("metaDescription").value = project.meta_description || "";
  document.getElementById("altText").value = project.alt_text || "";

  uploadedImages.main_image = project.main_image || "";
  uploadedImages.before_image = project.before_image || "";
  uploadedImages.after_image = project.after_image || "";
  uploadedImages.gallery = Array.isArray(project.gallery) ? [...project.gallery] : [];

  renderExistingPreview("mainImagePreview", uploadedImages.main_image ? [uploadedImages.main_image] : []);
  renderExistingPreview("beforeImagePreview", uploadedImages.before_image ? [uploadedImages.before_image] : []);
  renderExistingPreview("afterImagePreview", uploadedImages.after_image ? [uploadedImages.after_image] : []);
  renderGalleryPreview();

  renderMetricsFields(project.sector, project.metrics);
}

function openForm(id) {
  resetForm();
  if (id) {
    const project = currentProjects.find(p => p.id === id);
    if (project) {
      editingId = id;
      document.getElementById("formHeading").textContent = "Edit Project";
      fillForm(project);
    }
  } else {
    document.getElementById("formHeading").textContent = "Add New Project";
  }
  switchView("formView");
}

/* ---------------------------------------------------------
   IMAGE UPLOAD
--------------------------------------------------------- */
async function uploadFile(file, folder) {
  const bucket = "portfolio-images";
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `${folder}/${Date.now()}-${cleanName}`;

  const { error } = await window.db.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = window.db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function renderExistingPreview(containerId, urls) {
  const container = document.getElementById(containerId);
  container.innerHTML = urls.map(url => `<img src="${escapeHtmlAdmin(url)}" alt="">`).join("");
}

function renderGalleryPreview() {
  const container = document.getElementById("galleryPreview");
  container.innerHTML = uploadedImages.gallery.map((url, i) => `
    <div class="admin-preview-item">
      <img src="${escapeHtmlAdmin(url)}" alt="">
      <button type="button" class="admin-preview-remove" data-remove-gallery="${i}" aria-label="Remove image">&times;</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-remove-gallery]").forEach(btn => {
    btn.addEventListener("click", () => {
      uploadedImages.gallery.splice(Number(btn.dataset.removeGallery), 1);
      renderGalleryPreview();
    });
  });
}

function initImageUploads() {
  const status = document.getElementById("uploadStatus");

  document.getElementById("mainImageFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = "Uploading main image…";
    try {
      uploadedImages.main_image = await uploadFile(file, "main");
      renderExistingPreview("mainImagePreview", [uploadedImages.main_image]);
      status.textContent = "Main image uploaded.";
    } catch (err) {
      status.textContent = "Main image upload failed: " + err.message;
    }
  });

  document.getElementById("beforeImageFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = "Uploading before image…";
    try {
      uploadedImages.before_image = await uploadFile(file, "before");
      renderExistingPreview("beforeImagePreview", [uploadedImages.before_image]);
      status.textContent = "Before image uploaded.";
    } catch (err) {
      status.textContent = "Before image upload failed: " + err.message;
    }
  });

  document.getElementById("afterImageFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = "Uploading after image…";
    try {
      uploadedImages.after_image = await uploadFile(file, "after");
      renderExistingPreview("afterImagePreview", [uploadedImages.after_image]);
      status.textContent = "After image uploaded.";
    } catch (err) {
      status.textContent = "After image upload failed: " + err.message;
    }
  });

  document.getElementById("galleryFiles").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    status.textContent = `Uploading ${files.length} gallery image(s)…`;
    try {
      for (const file of files) {
        const url = await uploadFile(file, "gallery");
        uploadedImages.gallery.push(url);
      }
      renderGalleryPreview();
      status.textContent = "Gallery images uploaded.";
    } catch (err) {
      status.textContent = "Gallery upload failed: " + err.message;
    }
  });

  document.getElementById("sector").addEventListener("change", (e) => {
    renderMetricsFields(e.target.value, {});
  });

  document.getElementById("title").addEventListener("input", (e) => {
    const slugField = document.getElementById("slug");
    if (!editingId && !slugField.dataset.manuallyEdited) {
      slugField.value = slugify(e.target.value);
    }
  });
  document.getElementById("slug").addEventListener("input", (e) => {
    e.target.dataset.manuallyEdited = "true";
  });
}

/* ---------------------------------------------------------
   SAVE (INSERT / UPDATE)
--------------------------------------------------------- */
function collectListInput(id) {
  const raw = document.getElementById(id).value.trim();
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function collectMetrics(sector) {
  const fields = METRIC_FIELD_CONFIG[sector] || [];
  const metrics = {};
  fields.forEach(([key, , type]) => {
    const el = document.getElementById("metric_" + key);
    if (!el) return;
    const val = el.value.trim();
    if (!val) return;
    metrics[key] = type === "list" ? val.split(",").map(s => s.trim()).filter(Boolean) : val;
  });
  return metrics;
}

function initFormSubmit() {
  const form = document.getElementById("projectForm");
  const errorEl = document.getElementById("formError");
  const saveBtn = document.getElementById("saveProjectBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const title = document.getElementById("title").value.trim();
    const slug = document.getElementById("slug").value.trim();
    const sector = document.getElementById("sector").value;
    const category = document.getElementById("category").value.trim();
    const shortDescription = document.getElementById("shortDescription").value.trim();

    if (!title || !slug || !sector || !category || !shortDescription) {
      errorEl.textContent = "Please fill in Title, Slug, Sector, Category and Short Description.";
      return;
    }
    if (!uploadedImages.main_image) {
      errorEl.textContent = "Please upload a Main Project Image.";
      return;
    }

    const websiteVal = document.getElementById("website").value.trim();
    if (websiteVal && !/^https?:\/\//i.test(websiteVal)) {
      errorEl.textContent = "Website URL should start with http:// or https://";
      return;
    }

    const payload = {
      title, slug, sector, category,
      client: document.getElementById("client").value.trim() || null,
      website: websiteVal || null,
      industry: document.getElementById("industry").value.trim() || null,
      duration: document.getElementById("duration").value.trim() || null,
      short_description: shortDescription,
      description: document.getElementById("description").value.trim() || null,
      role: document.getElementById("role").value.trim() || null,
      problem: document.getElementById("problem").value.trim() || null,
      strategy: document.getElementById("strategy").value.trim() || null,
      work_done: document.getElementById("workDone").value.trim() || null,
      result: document.getElementById("result").value.trim() || null,
      tools: collectListInput("tools"),
      services: collectListInput("services"),
      tags: collectListInput("tags"),
      main_image: uploadedImages.main_image,
      gallery: uploadedImages.gallery,
      before_image: uploadedImages.before_image || null,
      after_image: uploadedImages.after_image || null,
      metrics: collectMetrics(sector),
      featured: document.getElementById("featured").checked,
      published: document.getElementById("published").checked,
      sort_order: parseInt(document.getElementById("sortOrder").value, 10) || 0,
      seo_title: document.getElementById("seoTitle").value.trim() || null,
      meta_description: document.getElementById("metaDescription").value.trim() || null,
      alt_text: document.getElementById("altText").value.trim() || null
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      let result;
      if (editingId) {
        result = await window.db.from("projects").update(payload).eq("id", editingId);
      } else {
        result = await window.db.from("projects").insert(payload);
      }
      if (result.error) throw result.error;

      showToast(editingId ? "Project updated." : "Project created.");
      switchView("dashboardView");
      loadDashboard();
    } catch (err) {
      errorEl.textContent = err.message.includes("duplicate")
        ? "That slug is already in use — please choose a unique slug."
        : (err.message || "Something went wrong while saving.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Project";
    }
  });
}

/* ---------------------------------------------------------
   UTILITIES
--------------------------------------------------------- */
function escapeHtmlAdmin(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer = null;
function showToast(message, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", !!isError);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.db) {
    showLogin("Supabase is not configured yet. Edit js/supabase-config.js, then reload this page.");
    return;
  }

  initAuth();
  initNav();
  initImageUploads();
  initFormSubmit();

  const { data: { session } } = await window.db.auth.getSession();
  await checkAdminAndEnter(session);
});
