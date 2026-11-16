// Posts whatever in queue.json is due to Instagram, then records it in
// posted.json. Run by .github/workflows/publish.yml every 30 minutes.
//
// Uses the Instagram API with Instagram Login (graph.instagram.com).
// Media files live in docs/ and are served by GitHub Pages, because
// Instagram fetches every image and video from a public URL.
//
// Environment:
//   IG_TOKEN     long-lived Instagram user access token (repo secret)
//   IG_USER_ID   the Instagram account's user id (repo secret)
//   PAGES_URL    e.g. https://yourname.github.io/cricket-tactics-queue
//   API_VERSION  optional, default v27.0
//
// queue.json entries:
//   { "id": "reel-ex11", "type": "reel" | "story" | "image" | "carousel",
//     "when": "2026-11-18T19:30:00+05:30",
//     "media": ["media/reel-ex11/reel.mp4"],      // paths inside docs/
//     "cover": "media/reel-ex11/cover.jpg",       // reels, optional
//     "caption": "..." }                          // not for stories
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const { IG_TOKEN, IG_USER_ID, PAGES_URL } = process.env;
const VERSION = process.env.API_VERSION || "v27.0";
const API = `https://graph.instagram.com/${VERSION}`;
const DRY = process.argv.includes("--dry-run");

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urlOf = (p) => `${PAGES_URL.replace(/\/$/, "")}/${p.replace(/^\/+/, "")}`;
const isVideo = (p) => /\.(mp4|mov)$/i.test(p);

const call = async (method, endpoint, params = {}) => {
  const body = new URLSearchParams({ ...params, access_token: IG_TOKEN });
  const url = method === "GET" ? `${API}${endpoint}?${body}` : `${API}${endpoint}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`${method} ${endpoint}: ${json.error?.message ?? res.status}`);
  }
  return json;
};

// Media containers are processed by Instagram before they can be
// published (videos take a while).
const waitReady = async (id) => {
  for (let i = 0; i < 60; i++) {
    const { status_code, status } = await call("GET", `/${id}`, { fields: "status_code,status" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED")
      throw new Error(`container ${id}: ${status_code} ${status ?? ""}`);
    await sleep(10_000);
  }
  throw new Error(`container ${id}: still processing after 10 minutes`);
};

const container = async (params) => {
  const { id } = await call("POST", `/${IG_USER_ID}/media`, params);
  await waitReady(id);
  return id;
};

const publish = async (item) => {
  const media = item.media.map(urlOf);
  let creation;
  if (item.type === "reel") {
    creation = await container({
      media_type: "REELS",
      video_url: media[0],
      caption: item.caption ?? "",
      share_to_feed: "true",
      ...(item.cover ? { cover_url: urlOf(item.cover) } : {}),
    });
  } else if (item.type === "story") {
    creation = await container({
      media_type: "STORIES",
      ...(isVideo(item.media[0]) ? { video_url: media[0] } : { image_url: media[0] }),
    });
  } else if (item.type === "image") {
    creation = await container({ image_url: media[0], caption: item.caption ?? "" });
  } else if (item.type === "carousel") {
    const children = [];
    for (const [i, url] of media.entries())
      children.push(
        await container({
          is_carousel_item: "true",
          ...(isVideo(item.media[i]) ? { media_type: "VIDEO", video_url: url } : { image_url: url }),
        }),
      );
    creation = await container({
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: item.caption ?? "",
    });
  } else {
    throw new Error(`unknown type ${item.type}`);
  }
  const { id } = await call("POST", `/${IG_USER_ID}/media_publish`, { creation_id: creation });
  return id;
};

// Pages may still be deploying a file that was pushed just now.
const online = async (p) => (await fetch(urlOf(p), { method: "HEAD" })).ok;

const main = async () => {
  if (!DRY && (!IG_TOKEN || !IG_USER_ID || !PAGES_URL))
    throw new Error("IG_TOKEN, IG_USER_ID and PAGES_URL must be set");
  const queue = readJson("queue.json");
  const posted = readJson("posted.json");
  const now = Date.now();
  let failed = false;

  for (const item of [...queue].sort((a, b) => Date.parse(a.when) - Date.parse(b.when))) {
    if (posted[item.id]) continue;
    const due = Date.parse(item.when);
    if (Number.isNaN(due)) {
      console.log(`✗ ${item.id}: bad "when" ${item.when}`);
      continue;
    }
    if (due > now) continue;
    // A story more than 12 hours late (or anything 3 days late) is
    // skipped rather than posted out of turn.
    const late = now - due;
    if (late > (item.type === "story" ? 12 : 72) * 3600_000) {
      posted[item.id] = { skipped: "too late", at: new Date().toISOString() };
      console.log(`- ${item.id}: skipped, ${Math.round(late / 3600_000)} h late`);
      continue;
    }
    if (DRY) {
      console.log(`would post ${item.type} ${item.id}: ${item.media.map(urlOf).join(", ")}`);
      continue;
    }
    const files = [...item.media, ...(item.cover ? [item.cover] : [])];
    if (!(await Promise.all(files.map(online))).every(Boolean)) {
      console.log(`… ${item.id}: media not on Pages yet, next run`);
      continue;
    }
    try {
      const id = await publish(item);
      posted[item.id] = { mediaId: id, type: item.type, at: new Date().toISOString() };
      console.log(`✓ ${item.id}: posted (${id})`);
    } catch (e) {
      failed = true;
      console.log(`✗ ${item.id}: ${e.message}`);
    }
    writeJson("posted.json", posted);
  }
  writeJson("posted.json", posted);

  // Files of anything posted or skipped over 3 days ago are deleted, so
  // the site stays small.
  for (const item of queue) {
    const done = posted[item.id];
    if (!done || now - Date.parse(done.at) < 3 * 86400_000) continue;
    for (const f of [...item.media, ...(item.cover ? [item.cover] : [])]) {
      const p = path.join("docs", f);
      if (existsSync(p)) rmSync(p);
    }
  }
  if (failed) process.exitCode = 1;
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
