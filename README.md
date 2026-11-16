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

### 5. Create the Meta app and get your Instagram token
1. Go to https://developers.facebook.com and log in with your Facebook
   account. If asked, register as a developer (free).
2. Click **My Apps → Create app**.
   - Use case: **Manage messaging & content on Instagram**. This is the
     "Instagram API with Instagram Login", which needs no Facebook Page.
   - Name it anything, e.g. `Cricket Tactics Publisher`. You may be
     asked to connect a business portfolio; you can skip that.
3. In the app dashboard, open **Instagram → API setup with Instagram
   login**.
4. Under **Generate access tokens**, click **Add account**. Log in with
   your Cricket Tactics Instagram account and allow the permissions.
   They must include **instagram_business_basic** and
   **instagram_business_content_publish**.
   - If it asks you to add the account as an **Instagram tester** first,
     do so under **App roles → Roles**. Then accept the invite in the
     Instagram app, under Settings → Website permissions → Apps and
     websites → Tester invites.
5. Click **Generate token** next to your account and copy it. This is
   `IG_TOKEN`, and it lasts 60 days. The weekly workflow below renews it,
   so you only do this once.
6. Get your account ID. Open this link in a browser, replacing `TOKEN`:
   `https://graph.instagram.com/v27.0/me?fields=user_id,username&access_token=TOKEN`.
   Copy the `user_id` number. This is `IG_USER_ID`.

The app can stay in **Development** mode. It only posts to your own
account, so Meta's App Review isn't needed.

### 6. Store the secrets in GitHub
Go to **Settings → Secrets and variables → Actions → Secrets tab → New
repository secret**, and add:
- `IG_TOKEN`: the token from 5.5
- `IG_USER_ID`: the number from 5.6
- `GH_PAT`: lets the weekly job save the renewed token. To create it:
  1. Go to GitHub → your photo → **Settings → Developer settings →
     Personal access tokens → Fine-grained tokens → Generate new token**.
  2. Repository access: **Only select repositories →
     cricket-tactics-queue**.
  3. Permissions: **Secrets → Read and write**.
  4. Expiry: up to a year.
  5. Generate it, copy it and paste it as `GH_PAT`.

### 7. Switch the workflows on and test
1. Open the repo's **Actions** tab and enable workflows if asked.
2. Run **Refresh Instagram token → Run workflow**. A green tick means the
   token and `GH_PAT` work.
3. Queue a test story for a few minutes from now, from the main project:
   ```bash
   npm run schedule -- story 2026-11-16 21:00 quiz/2026-11-16/output/quiz-1-story.jpg
   ```
   Then push it (step "Every week" below).
4. Wait about a minute for Pages to update. Then go to **Actions →
   Publish to Instagram → Run workflow**. The story should appear on your
   account, and the run log shows `✓ ... posted`.

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
