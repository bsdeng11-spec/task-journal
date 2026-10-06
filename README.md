# 📋 Task Journal - 15 Days Reporting & Consolidation System

A web application designed for engineering & BIM teams. Allows **23 team members** to log their daily project tasks and hours directly from their browser, saves submitted reports into an online **Supabase cloud database**, and enables the **Manager** to consolidate, search, and export the uniform master spreadsheet with **one click** from a public **GitHub Pages** website.

---

## 🌟 Key Features

1. **GitHub Pages Deployment (Free Public Website)**:
   - Publishes directly at `https://<your-username>.github.io/<repository-name>/`.
   - Instant loading with zero cold-starts and zero hosting cost.

2. **Online Cloud Database (Supabase)**:
   - Stores all member entries and timesheet logs online in PostgreSQL.
   - Real-time save and load across different devices (desktop & mobile).

3. **Team Member Timesheet Portal (`index.html`)**:
   - Pre-loaded with all **23 team members** and their **MP Numbers** (Robel, Abebech, Habesha, Miki, Henok, etc.).
   - Fast 15-day timesheet grid (`Project Code`, `Task`, `Description`, `Date`, `Hours`).
   - One-click leave buttons: **Weekend**, **Local Holiday**, **Vacation**, **Sick**, **Emergency**, **Other**.
   - **Auto-Fill 15 Days** button: automatically lays out 15 days and detects weekends!
   - Real-time hour gauge tracking progress towards the **99-hour target**.
   - Multilingual Entry Modal (English, Hebrew, Russian, Amharic) with switch/rename member options.

4. **Manager Consolidation Dashboard (`dashboard.html`)**:
   - Real-time KPI cards: **Grand Total Team Hours**, completed members (99 hrs), and target hours.
   - Filter by any 15-day cycle (e.g., `SEP 16-30`, `OCT 01-15`).
   - Live search filter across all 23 team members.

5. **Client-Side Master Excel Export (`.xlsx`)**:
   - Generates the exact company format with one click directly in your browser.
   - **Tab 1: Master Task Journal**: Navy header banners, columns (`Name`, `Task`, `Description`, `Date`, `General hours`, `Executor`, `MP#`), AutoFilter, and 3 blank rows between members.
   - **Tab 2: Summary Dashboard**: Overview metrics, completion status highlights, and formula totals.

---

## 🚀 Quick Setup & Deployment Guide

### Step 1: Set up your Supabase Cloud Database

1. Go to **[supabase.com](https://supabase.com/)** and sign in or create a free account.
2. Click **New Project** and name it (e.g., `task-journal`).
3. Open the **SQL Editor** on the left menu, click **New query**.
4. Copy the entire contents of [`supabase-schema.sql`](supabase-schema.sql) in this repository and paste it into the query editor, then click **Run**.
   - *This creates the `members` and `tasks` tables, configures permissions, and seeds all 23 members.*
5. In Supabase, go to **Project Settings** (gear icon) &rarr; **API**:
   - Copy your **Project URL** (e.g. `https://xyzabc.supabase.co`).
   - Copy your **anon / public** API key (starts with `eyJ...`).

---

### Step 2: Configure your Supabase credentials

Open [`supabase-config.js`](supabase-config.js) and paste your credentials:

```javascript
window.SUPABASE_CONFIG = {
    url: "https://your-project.supabase.co",
    anonKey: "your-anon-public-key"
};
```

*(You can also click the **⚙️ Connect Supabase** button on the website itself at any time to update these credentials directly in your browser).*

---

### Step 3: Push to GitHub & Publish on GitHub Pages

1. Open PowerShell or Command Prompt inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Deploy Task Journal with GitHub Pages and Supabase"
   ```

2. Create a new repository on your GitHub account (e.g., named `task-journal`).

3. Link your local repo and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/task-journal.git
   git push -u origin main
   ```

4. Enable **GitHub Pages**:
   - On GitHub, go to your repository &rarr; **Settings** &rarr; **Pages** (under "Code and automation").
   - Under **Build and deployment**:
     - Source: **Deploy from a branch**
     - Branch: select `main` and `/ (root)` folder.
   - Click **Save**.

5. Within 1 minute, GitHub will give you a public link:
   - **Timesheet Portal**: `https://<YOUR_USERNAME>.github.io/task-journal/index.html`
   - **Manager Dashboard**: `https://<YOUR_USERNAME>.github.io/task-journal/dashboard.html`

Share this link with your team!

---

## 💻 Optional: Running Locally on PC

You can also run locally anytime:
- Double-click `run_app.bat` to launch the local Python/Flask server at `http://localhost:5000`.

---

## 📁 Repository Structure

```text
PROJECT TASK JOURNAL/
├── index.html                 # Main Timesheet Entry Portal (GitHub Pages root)
├── dashboard.html             # Manager Consolidation Dashboard (GitHub Pages)
├── supabase-config.js         # Supabase Cloud URL & API Key configuration
├── supabase-schema.sql        # Supabase PostgreSQL tables & seed script
├── static/
│   ├── css/
│   │   └── style.css          # BIM themed UI & responsive styling
│   └── js/
│       ├── app.js             # Timesheet table calculations, auto-fill & modals
│       ├── dashboard.js       # Manager KPIs, search & live filtering
│       ├── excel-export.js    # In-browser Excel (.xlsx) generator via ExcelJS
│       └── supabase-client.js # Supabase cloud connection & offline fallback
├── app.py                     # Optional Python/Flask server
├── database.py                # Optional Python SQLite/Postgres layer
├── excel_exporter.py          # Optional Python openpyxl exporter
├── run_app.bat                # Windows 1-click local launcher
└── README.md                  # Documentation
```
