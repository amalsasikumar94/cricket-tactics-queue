# Cricket Tactics: Instagram publisher

GitHub posts to Instagram on schedule: reels, stories, single images and
carousels. Every 30 minutes a GitHub Action runs `publish.mjs`. It posts
anything in `queue.json` whose time has come and records it in
`posted.json`. Media is served from `docs/` by GitHub Pages, because
Instagram downloads every file from a public link.

Finished content is added with the main project:
`npm run schedule -- reel|story|post ...`. See
`cricket-dairy-ml/scripts/schedule.ts`.

> The repo must be **public** for free GitHub Pages, so anyone could see
> upcoming posts in `docs/`. Tokens stay safe in GitHub secrets, which
> nobody can read.

---

## One-time setup (about 30–40 minutes)

### 1. Make your Instagram a Professional account
Instagram app, then **Settings and activity → Account type and tools →
Switch to professional account → Creator**. It's free. If it's already
Professional, skip this step.

### 2. Create the GitHub repo
1. Sign up or log in at https://github.com.
2. Click **+ → New repository**:
   - Name: `cricket-tactics-queue`
   - **Public**
   - Do **not** add a README, .gitignore or licence.
3. Click **Create repository** and keep the page open.

### 3. Push this folder to it
Run this in Git Bash. Replace `YOUR_GITHUB_NAME` with your GitHub
username.
```bash
cd "/c/Amal- Software Engineering/cricket-dairy-video-reel-editing/cricket-tactics-queue"
git init -b main
git add -A
git commit -m "Instagram publisher"
git remote add origin https://github.com/YOUR_GITHUB_NAME/cricket-tactics-queue.git
git push -u origin main
```
On the first push, a browser window opens so you can log in to GitHub.

### 4. Turn on GitHub Pages (public links for the media)
1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**,
   Branch to **main**, and folder to **/docs**. Click **Save**.
3. After a minute, the page shows your site address, e.g.
   `https://YOUR_GITHUB_NAME.github.io/cricket-tactics-queue`.
4. Go to **Settings → Secrets and variables → Actions → Variables tab →
   New repository variable**:
   - Name `PAGES_URL`, value: that address with no `/` at the end.

### 5. Connect Instagram to your business portfolio
New Meta apps use **Unified login**. Posting goes through a **system user**:
a robot user that belongs to your business, with a token that never
expires.

1. Go to https://business.facebook.com and open your **business
   portfolio**. If you have none, create one; it's free.
2. Open **Settings**, the gear icon (**Business settings** on older
   screens).
3. Go to **Accounts → Instagram accounts → Add**. Log in with the
   **Cricket Tactics** Instagram account; you have two, so pick that one.
   It must be a Professional account (step 1).
4. Optional: under **Accounts → Pages**, add your Facebook Page and link
   it to the Instagram account. Not every setup needs this, but it does
   no harm and helps if the API asks for a Page.

### 6. Create the app and a never-expiring token
1. On https://developers.facebook.com, use the app you created (use
   case **Manage messaging & content on Instagram**). If asked, connect
   it to the same business portfolio, under **App settings → Basic →
   Business portfolio** (or the prompt on the dashboard).
2. Back in **Business settings → Users → System users → Add**:
   - Name: `publisher`, role: **Admin**. Create it.
3. With the system user selected, click **Assign assets**:
   - **Apps**: your app, with full control.
   - **Instagram accounts**: Cricket Tactics, with full control.
   - **Pages**: your Page, if you added it in 5.4.
4. Click **Generate new token**:
   - App: your app
   - Token expiration: **Never**
   - Permissions: tick **instagram_basic**, **instagram_content_publish**,
     **pages_show_list**, **pages_read_engagement** and
     **business_management**. Tick any that appear; some may be missing,
     depending on the app.
   - Generate, and **copy the token right away**. Meta shows it only
     once. This is `IG_TOKEN`.
5. Find the Instagram account ID by opening these links in a browser,
   replacing `TOKEN`. One of them shows it:
   - `https://graph.facebook.com/v27.0/me/accounts?fields=name,instagram_business_account{id,username}&access_token=TOKEN`
     gives the `instagram_business_account.id` of your Cricket Tactics
     account.
   - or the app dashboard's **Instagram → API setup with Unified login**
     page, which lists connected accounts and their IDs.

   This number (usually starting `1784…`) is `IG_USER_ID`.

If a screen looks different from this guide, send a screenshot. Meta
changes these menus often.

### 7. Store the secrets in GitHub
**Settings → Secrets and variables → Actions → Secrets tab → New
repository secret**:
- `IG_TOKEN`: the system-user token from 6.4
- `IG_USER_ID`: the number from 6.5

The token never expires, so there's nothing to renew.

### 8. Switch the workflow on and test
1. Open the repo's **Actions** tab and enable workflows if asked.
2. Queue a test story a few minutes ahead from the main project:
   ```bash
   npm run schedule -- story 2026-11-16 21:00 quiz/2026-11-16/output/quiz-1-story.jpg
   ```
   Then push it (step "Every week" below).
3. Wait about a minute for Pages to update. Then go to **Actions →
   Publish to Instagram → Run workflow**. The story should appear on
   Cricket Tactics, and the log shows `✓ ... posted`. If it fails, the
   log has Instagram's error message; send it to Claude.

---

## Every week (about 5 minutes)

1. Claude makes the week's content in the main project: reels with
   `npm run explained`, and daily quiz/poll images with `npm run quiz`.
   You check it.
2. Queue each post (times are **India time**):
   ```bash
   # reels every 2 days, 7:30 PM IST (3:00 PM in Poland, winter time)
   npm run schedule -- reel ex11-stepping-out 2026-11-18 19:30
   # daily stories: the question at 1 PM, the answer at 8:30 PM IST
   npm run schedule -- story 2026-11-17 13:00 quiz/2026-11-17/output/quiz-1-story.jpg
   npm run schedule -- story 2026-11-17 20:30 quiz/2026-11-17/output/quiz-2-story.jpg
   # check
   npm run schedule -- list
   ```
3. Push the queue:
   ```bash
   cd "/c/Amal- Software Engineering/cricket-dairy-video-reel-editing/cricket-tactics-queue"
   git pull
   git add -A
   git commit -m "Next week"
   git push
   ```
   Always `git pull` first, because the publisher commits `posted.json`
   after each post.

## Good to know

- **Timing:** GitHub runs the job every 30 minutes, but scheduled runs can
  start a few minutes to about half an hour late. Posts go out at or
  shortly after their time.
- **Missed posts:** a story more than 12 hours late, or anything more
  than 3 days late, is skipped rather than posted out of turn. See
  `posted.json`.
- **Not possible through the API:** Instagram's poll and quiz stickers,
  music from Instagram's library, and sharing a reel to your story. The
  quiz images ask people to reply or comment instead.
- **Cleanup:** files of posts older than 3 days are deleted from `docs/`
  automatically.
- **If a post fails:** the run turns red in Actions and the log shows
  Instagram's error message. Fix it and re-run, or the next run retries
  automatically.
