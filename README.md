# Sricharan Gunupati — Portfolio (with contact form + resume manager)

A single portfolio site with three working backend features:

1. **Contact form** → emails you directly via Gmail when someone submits it.
2. **Resume download** → visitors click "Download Resume" and get the latest PDF you've uploaded.
3. **Admin panel** → a password-protected "Admin" link in the footer lets you upload a new resume PDF at any time, without touching code.

This is a real (small) web app: a static frontend (`public/index.html`) plus three serverless backend functions (`api/*.js`). It needs to be deployed — it will not work if you just double-click the HTML file, because the contact form and resume features need a live server.

---

## 1. What you need before deploying

- A **GitHub account** (free) — to hold the code so Vercel can deploy it.
- A **Vercel account** (free) — sign up at vercel.com using your GitHub account, one click.
- Your **Gmail account**, with an **App Password** (instructions below) — this lets the server send email *as* your Gmail account without using your real password.

Total cost: **$0**. Vercel's free tier easily covers a personal portfolio's traffic.

---

## 2. Get a Gmail App Password (5 minutes)

Gmail won't let apps log in with your normal password anymore — you need a special 16-character "App Password" instead.

1. Go to https://myaccount.google.com/security
2. Turn on **2-Step Verification** if it isn't already on (required for App Passwords to exist as an option).
3. Go to https://myaccount.google.com/apppasswords
4. Under "App name", type something like `Portfolio Site` and click **Create**.
5. Google will show you a 16-character password like `abcd efgh ijkl mnop`. Copy it (remove the spaces) — you'll paste it into Vercel in step 4 below. You won't be able to see it again after closing this screen, so copy it now.

---

## 3. Push this project to GitHub

If you don't already have this project in a GitHub repo:

1. Create a new repository on GitHub (e.g. `sricharan-portfolio`), keep it empty (no README/license).
2. In a terminal, inside this project folder, run:
   ```
   git init
   git add .
   git commit -m "Initial portfolio with contact form and resume manager"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sricharan-portfolio.git
   git push -u origin main
   ```

---

## 4. Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **Import** next to the GitHub repo you just pushed.
3. Leave all build settings as default (Vercel auto-detects this as a Node project with serverless functions) and click **Deploy**. It will deploy successfully but the contact form and admin upload won't work *yet* — that's expected, you haven't added the secret values.
4. Once deployed, go to your project's **Settings → Environment Variables** and add these one at a time (for "Environment", select all three: Production, Preview, Development):

   | Name | Value |
   |---|---|
   | `GMAIL_USER` | your full Gmail address, e.g. `sreecharanreddy286@gmail.com` |
   | `GMAIL_APP_PASSWORD` | the 16-character app password from step 2 (no spaces) |
   | `CONTACT_TO_EMAIL` | the email address you want messages delivered to (can be the same as `GMAIL_USER`) |
   | `ADMIN_PASSWORD` | a password you choose, only you should know this — this protects the resume upload panel |

5. Now add file storage for the resume PDF:
   - Go to your project's **Storage** tab → **Create Database** → choose **Blob**.
   - Name it anything (e.g. `resume-storage`) and click Create.
   - Vercel will automatically add a `BLOB_READ_WRITE_TOKEN` environment variable to your project for you — you don't need to copy/paste this one yourself.

6. Go to the **Deployments** tab and click **Redeploy** on the latest deployment (so it picks up the new environment variables).

That's it — your site is live at the `*.vercel.app` URL Vercel gives you (and you can attach a custom domain later under Settings → Domains, for free).

---

## 5. Using the admin panel

1. On your live site, scroll to the very bottom and click the small **Admin** link.
2. Enter the `ADMIN_PASSWORD` you set in step 4.
3. Choose a PDF file and click **Upload PDF**.
4. The "Download Resume" button in the hero section will now serve that exact file to anyone who clicks it — instantly, no redeploy needed. Uploading a new PDF later simply replaces it.

The admin password is never stored in the page's code — it's only checked against the server's environment variable at upload time, so it's safe even though this is a public website.

---

## 6. Local development (optional)

If you want to test changes on your own machine before deploying:

```bash
npm install -g vercel
npm install
cp .env.example .env   # then fill in real values in .env
vercel dev
```

This runs the full app (frontend + API functions) on `http://localhost:3000`.

---

## Project structure

```
public/index.html       — the entire frontend (HTML/CSS/JS, single file)
api/contact.js          — POST endpoint: sends contact form submissions to your Gmail
api/resume-upload.js    — POST endpoint: admin-only, uploads a new resume PDF to storage
api/resume-info.js      — GET endpoint: public, returns the current resume's download URL
vercel.json             — Vercel function configuration
package.json            — dependencies (@vercel/blob, nodemailer)
```

## Notes on security

- The admin password is checked server-side on every upload request — it's never exposed in the frontend code.
- The contact form has a hidden "honeypot" field that filters out basic spam bots.
- File uploads are restricted to PDFs under 10MB.
- Nothing here stores visitor data in a database — contact messages go straight to your inbox and aren't retained anywhere else.
