# DATAMARK Checker Intelligence Dashboard

A professional inspection analytics dashboard for DATAMARK Africa site managers.  
Upload any DATAMARK *Inspections by Checker* Excel export and get instant charts — no backend required.

---

## What it does

- **Login gate** — managers sign in with their credentials
- **Excel upload** — drag/drop or browse for the `.xlsx` inspections file
- **Auto-generates 5+ charts:**
  - DM by Checker (inspected marks)
  - N/A by Checker (not accessible)
  - DG by Checker (damaged marks)
  - Total inspections by checker
  - Store inspections by date
  - Inspections by location
- **Filters** — filter by Checker, Month, or Location
- **PDF export** — one-click branded PDF report download
- **Responsive** — works on desktop and tablet

---

## Files

```
datamark-checker-dashboard/
├── index.html      ← main app
├── styles.css      ← all styling
├── app.js          ← all logic (parsing, charts, PDF)
├── dm-logo.svg     ← DATAMARK logo
├── favicon.svg     ← browser tab icon
├── vercel.json     ← Vercel deployment config
└── README.md       ← this file
```

---

## Changing Manager Credentials

Open `app.js` and find the `USERS` object near the top:

```js
const USERS = {
  admin:    'datamark2025',
  manager:  'inspect123',
  john:     'datamark@john',
  // Add more: username: 'password'
};
```

Edit usernames and passwords as needed, then redeploy.

---

## Deploy to Vercel (Free — $0)

### Option A: Drag & Drop (Fastest — 2 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New → Project"**
3. Click **"Import Third-Party Git Repository"** or drag your project folder
4. Vercel detects it as a static site automatically
5. Click **Deploy**
6. Your live URL appears: `https://your-project.vercel.app`

### Option B: GitHub + Vercel (Recommended for version control)

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial dashboard"
   git remote add origin https://github.com/YOUR_USERNAME/datamark-checker-dashboard.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select your repo → click **Deploy**
4. Every `git push` auto-deploys the update

### Option C: Vercel CLI

```bash
npm i -g vercel
cd datamark-checker-dashboard
vercel
# Follow the prompts — it's live in ~30 seconds
```

---

## Embed into DATAMARK's Existing Dashboard

To embed this dashboard inside their current system, they add one line:

```html
<iframe
  src="https://your-project.vercel.app"
  width="100%"
  height="750px"
  style="border:none; border-radius:8px;"
></iframe>
```

Or link to it as a button:
```html
<a href="https://your-project.vercel.app" target="_blank">
  Open Checker Dashboard
</a>
```

---

## Upgrade Path (Phase 2 — Live Database)

When DATAMARK is ready for live data instead of file uploads:

1. Set up a backend (Node.js + Express on Railway — free tier)
2. Connect to their DATATRACK database (MySQL/PostgreSQL)
3. Replace the file-upload section with API calls
4. All charts and logic remain unchanged

---

## Tech Stack

- **Vanilla HTML/CSS/JS** — no framework, loads instantly
- **Chart.js 4** — professional interactive charts
- **SheetJS (xlsx)** — client-side Excel parsing
- **jsPDF + html2canvas** — PDF export
- **Google Fonts (DM Sans)** — clean professional typography
- **Vercel** — free static hosting with global CDN

---

Built by **Anesu Manjengwa** — [linkedin.com/in/anesu-manjengwa-684766247](https://linkedin.com/in/anesu-manjengwa-684766247)
