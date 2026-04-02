const BASE = "http://localhost:5000/api";
const fs = await import("fs");
const results = [];

// Helper
async function test(label, url, method, body, token, expectedStatus) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  const pass = res.status === expectedStatus;
  results.push(`${pass ? "PASS" : "FAIL"} | ${label} | Expected: ${expectedStatus} | Got: ${res.status} | ${data.message || JSON.stringify(data)}`);
  return data;
}

// ── 1. Create a secondary user for ownership tests ──────────────
const registerRes = await fetch(`${BASE}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Other User", email: "other@test.com", password: "securepass" }),
});
// ── 2. Login to get a valid token for main user ──────────────
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "smoke2@test.com", password: "securepass" }),
});
const loginData = await loginRes.json();
const TOKEN = loginData.token;

const loginOtherRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "other@test.com", password: "securepass" }),
});
const loginOtherData = await loginOtherRes.json();
const OTHER_TOKEN = loginOtherData.token;

results.push(`INFO | Logged in as ${loginData.user?.name} | Token: ${TOKEN?.substring(0, 30)}...`);

results.push("");
results.push("=== CAMPAIGN TESTS ===");

const createData = await test("Valid create (201)", `${BASE}/campaigns`, "POST", { title: "Mon Projet Tech", description: "Un projet innovant", category: "Tech & App", target_amount: 50000 }, TOKEN, 201);
const campaignId = createData.campaign_id;

results.push(`INFO | Created Campaign ID: ${campaignId}`);

results.push("");
results.push("=== CAMPAIGN UPDATE TESTS ===");

// ── 1. No token → 401 ─────────────────────────
await test("Update: No token (401)", `${BASE}/campaigns/${campaignId}`, "PUT", { title: "Updated Title" }, null, 401);

// ── 2. Different user → 403 ─────────────────────
await test("Update: Not Owner (403)", `${BASE}/campaigns/${campaignId}`, "PUT", { title: "Updated Title" }, OTHER_TOKEN, 403);

// ── 3. Invalid target amount → 400 ─────────────────────
await test("Update: Invalid Amount (400)", `${BASE}/campaigns/${campaignId}`, "PUT", { target_amount: -500 }, TOKEN, 400);

// ── 4. Valid partial update → 200 ─────────────────────
await test("Update: Valid Update (200)", `${BASE}/campaigns/${campaignId}`, "PUT", { title: "Mon Nouveau Projet Tech", target_amount: 60000 }, TOKEN, 200);


results.push("");
results.push("=== DONE ===");

fs.writeFileSync("test-update.txt", results.join("\n") + "\n");
console.log("Results written to test-update.txt");
