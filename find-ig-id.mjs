// Finds the Instagram account ID (IG_USER_ID) that the token can post
// to, and checks the token works. Run locally, never in GitHub:
//   node find-ig-id.mjs
// It asks for the token (paste it, press Enter). The token is not saved
// or printed.
import { createInterface } from "node:readline/promises";

const V = "v27.0";
const rl = createInterface({ input: process.stdin, output: process.stdout });
const token = (await rl.question("Paste your token and press Enter: ")).trim();
rl.close();

const get = async (path, fields) => {
  const url = `https://graph.facebook.com/${V}${path}?${new URLSearchParams({
    ...(fields ? { fields } : {}),
    access_token: token,
  })}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (json.error) throw new Error(json.error.message);
  return json;
};
const tryGet = async (label, path, fields) => {
  try {
    return await get(path, fields);
  } catch (e) {
    console.log(`  (${label}: ${e.message})`);
    return null;
  }
};

const found = new Map();
const me = await tryGet("token", "/me", "id,name");
if (!me) {
  console.log("\nThe token didn't work. Check that you copied all of it.");
  process.exit(1);
}
console.log(`\nToken works. It belongs to: ${me.name} (${me.id})`);

const pages = await tryGet("pages", "/me/accounts", "name,instagram_business_account{id,username}");
for (const p of pages?.data ?? [])
  if (p.instagram_business_account)
    found.set(p.instagram_business_account.id, p.instagram_business_account.username);

const businesses = await tryGet("businesses", "/me/businesses", "id,name");
for (const b of businesses?.data ?? []) {
  for (const edge of ["instagram_business_accounts", "owned_instagram_accounts"]) {
    const r = await tryGet(edge, `/${b.id}/${edge}`, "id,username");
    for (const a of r?.data ?? []) if (a.username) found.set(a.id, a.username);
  }
}
const assigned = await tryGet("assigned", "/me/assigned_instagram_accounts", "id,username");
for (const a of assigned?.data ?? []) if (a.username) found.set(a.id, a.username);

if (found.size === 0) {
  console.log("\nNo Instagram account found for this token yet. Check that the");
  console.log("Instagram account is assigned to the system user (Assign assets).");
  process.exit(1);
}
console.log("\nInstagram accounts this token can reach:");
for (const [id, username] of found) {
  const limit = await tryGet("publishing", `/${id}/content_publishing_limit`, "quota_usage,config");
  console.log(`  @${username}  →  IG_USER_ID = ${id}${limit ? "   (posting allowed ✓)" : ""}`);
}
console.log("\nUse the IG_USER_ID next to your Cricket Tactics account.");
