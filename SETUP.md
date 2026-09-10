# Setup Guide — Mahmud Abbas Rahat Portfolio

This guide takes you from "just files on my computer" to a live, database-driven
website. Nothing has been connected automatically — **GitHub, Netlify, and
Supabase are not currently set up.** Follow the steps in order.

Total time: roughly 30–45 minutes the first time.

---

## Part 1 — Create your Supabase project

1. Go to **https://supabase.com** → **Start your project** → sign in (GitHub or email).
2. Click **New project**.
   - **Name:** anything, e.g. `mar-portfolio`
   - **Database password:** generate one and save it somewhere safe (a password manager). You won't need it for this setup, but keep it.
   - **Region:** pick the one closest to you or your audience.
3. Click **Create new project** and wait ~2 minutes while it provisions.

**Verify:** you land on a project dashboard with a sidebar (Table Editor, SQL Editor, Authentication, Storage, etc.).

---

## Part 2 — Run the database schema

1. In the left sidebar, click **SQL Editor**.
2. Click **+ New query**.
3. Open `supabase-schema.sql` from this project, select all, copy it.
4. Paste the entire file into the SQL Editor.
5. Click **Run** (or press Ctrl/Cmd + Enter). Run the **whole file at once** — it's written to be safe to run top to bottom in one go.

**What "success" looks like:** the bottom panel shows `Success. No rows returned` (or similar). If you see a red error, read it — most likely cause is pasting only part of the file. Copy the whole file again and re-run.

### Verify the table exists
- Left sidebar → **Table Editor** → you should see a `projects` table and an `admin_users` table.
- Click `projects` → you should see 13 rows already in it (your existing graphic design work, migrated automatically).

### Verify indexes
- SQL Editor → new query → run:
  ```sql
  select indexname from pg_indexes where tablename = 'projects';
  ```
  You should see `idx_projects_sector`, `idx_projects_featured`, `idx_projects_published`, `idx_projects_slug`, `idx_projects_sort_order` in the list.

### Verify Row Level Security is on
- Table Editor → click `projects` → the small shield icon near the top should say **RLS enabled**.
- Or run: `select relrowsecurity from pg_class where relname = 'projects';` — should return `t` (true).

### Verify the policies exist
- Run: `select policyname from pg_policies where tablename = 'projects';`
- You should see 5 policies: public read, admin read all, admin insert, admin update, admin delete.

---

## Part 3 — Create the image storage bucket

1. Left sidebar → **Storage**.
2. Click **New bucket**.
3. Name it exactly: `portfolio-images`
4. Toggle **Public bucket** → **ON** (this lets visitors view images; only admins can upload/delete, enforced by the storage policies already created by the SQL you ran).
5. Click **Create bucket**.

**Verify:** the storage policies were already created by `supabase-schema.sql` in Part 2. Confirm with:
```sql
select policyname from pg_policies where tablename = 'objects' and schemaname = 'storage';
```
You should see 4 policies mentioning "portfolio images".

---

## Part 4 — Turn on email/password login

1. Left sidebar → **Authentication** → **Providers**.
2. Confirm **Email** is enabled (it is by default).
3. Left sidebar → **Authentication** → **Settings** → for a personal admin panel, you can turn **off** "Confirm email" so your one admin account can log in immediately without clicking an email link (optional but simplest).

---

## Part 5 — Create your admin account

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email and a strong password (this is your admin login — never put it in any file).
3. Click **Create user**.
4. Click on the user you just created and **copy their User UID** (a long string like `a1b2c3d4-...`).

### Authorize that user as an admin
This is the important step — being a Supabase *user* is not the same as being an
*admin* of this site. Run this in **SQL Editor**, replacing the UID:

```sql
insert into public.admin_users (user_id) values ('paste-the-uid-here');
```

**Verify:**
```sql
select * from public.admin_users;
```
You should see one row with your UID.

---

## Part 6 — Connect the site to your Supabase project

1. Supabase Dashboard → **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key. (Never copy the `service_role` key — you won't need it anywhere in this project.)
3. Open `js/supabase-config.js` in this project and paste them in:

```js
window.SUPABASE_CONFIG = {
  url: "https://your-actual-ref.supabase.co",
  anonKey: "your-actual-anon-key"
};
```

4. Save the file.

These two values are safe to keep in the file and commit to GitHub — they are
public identifiers, not secrets. Your database is protected by the RLS
policies and the `admin_users` table, not by hiding this file.

---

## Part 7 — Test locally

You can't just double-click `index.html` for this part, because browsers block
some fetch behavior on `file://` pages. Serve the folder locally instead:

- **Easiest:** if you have VS Code, install the "Live Server" extension, right-click `index.html` → "Open with Live Server".
- **Or**, if you have Python installed, open a terminal in the project folder and run:
  ```
  python3 -m http.server 8080
  ```
  then visit `http://localhost:8080`.

### Test checklist
- [ ] `index.html` loads, and the **Featured Work** section either shows a graceful "Featured projects will be added soon." message, or shows real projects (none are featured yet by default).
- [ ] `graphic-design.html` loads and shows your 13 migrated projects with working category filters.
- [ ] `digital-marketing.html`, `seo.html`, `website-design.html` load and show "No projects added to this category yet." (correct — you haven't added any yet).
- [ ] Click a project card on `graphic-design.html` → it opens `project.html?slug=...` with the full case study.
- [ ] Go to `admin/index.html` → log in with the admin email/password from Part 5.
- [ ] After login, the Dashboard shows your project counts and the table of 13 projects.
- [ ] Try logging in with a **non-admin** Supabase user (if you create one) → you should be signed back out immediately with an authorization error. This confirms admin authorization is working, not just login.

---

## Part 8 — Push the project to GitHub

1. Go to **https://github.com** → sign in → **New repository**.
2. Name it (e.g. `mar-portfolio`), leave it **Public** or **Private** (either works with Netlify's free tier), don't initialize with a README.
3. On your computer, inside this project folder, run:
   ```
   git init
   git add .
   git commit -m "Initial portfolio with Supabase backend"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   (Replace the URL with the one GitHub shows you after creating the repo.)

**Verify:** refresh the GitHub repo page — you should see all your files, including `index.html`, `admin/`, `js/`, `assets/`, and `supabase-schema.sql`. Confirm `js/supabase-config.js` is there too (it's fine — it only contains public values).

---

## Part 9 — Deploy to Netlify

1. Go to **https://netlify.com** → sign in (GitHub is easiest) → **Add new site** → **Import an existing project**.
2. Choose **GitHub**, authorize it, and select your repository.
3. Build settings: leave **Build command** blank and **Publish directory** as `/` (this is a static site — nothing to build).
4. Click **Deploy site**.

No environment variables are required for this architecture, because
`js/supabase-config.js` already holds the public URL/anon key directly in the
repo (this is normal and safe for Supabase's anon key). If you later add a
build step and want to inject the values instead of committing them, you can
add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under **Site settings → Environment
variables** and generate `supabase-config.js` at build time — but this is
optional and not required to launch.

**Verify:** Netlify gives you a live `https://your-site-name.netlify.app` URL.
Open it and repeat the Part 7 test checklist against the live URL.

---

## Part 10 — Add your first real project

1. Go to `your-site.netlify.app/admin/` → log in.
2. Click **+ Add New Project**.
3. Fill in Title, Slug (auto-fills from title), Sector, Category, Short Description.
4. Fill in whatever sector-specific fields you actually have data for — leave the rest blank. The site will show "Data not added yet" instead of guessing.
5. Upload a **Main Project Image** (required) and any gallery/before/after images.
6. Toggle **Published** ON so it's publicly visible. Toggle **Featured** ON if you want it on the homepage.
7. Click **Save Project**.
8. Visit the matching sector page — your new project should appear immediately, no code editing required.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Supabase is not configured yet" warning in console | `js/supabase-config.js` still has placeholder values |
| Login says "not authorized as an admin" | You created the user but skipped the `insert into admin_users` step in Part 5 |
| Cards show but images are broken | Bucket isn't named exactly `portfolio-images`, or isn't set to Public |
| "No projects added to this category yet." on every sector page | Correct/expected until you publish projects in that sector |
| Everything blank + console error about fetch/CORS | You opened `index.html` via `file://` instead of a local server (see Part 7) |

---

## What was done automatically vs. what you must do manually

**Done for you (in these project files):**
- All HTML/CSS/JS for the 5 public pages, admin panel, and case-study page
- `supabase-schema.sql` — table, indexes, RLS, admin authorization, storage policies, and your 13 existing projects pre-written as seed data
- Front-end code that reads/writes Supabase using only the public anon key

**You must do manually (cannot be done from here):**
- Create the actual Supabase project (Part 1)
- Run the SQL file inside your Supabase project (Part 2)
- Create the storage bucket (Part 3)
- Create your admin login and authorize it (Parts 4–5)
- Paste your real URL/anon key into `js/supabase-config.js` (Part 6)
- Create the GitHub repository and push the code (Part 8)
- Connect Netlify and deploy (Part 9)

None of these can be completed without your own Supabase/GitHub/Netlify
accounts — no external service has actually been created or connected as
part of this response.
