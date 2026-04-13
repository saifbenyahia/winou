const BASE = "http://localhost:5000/api";
const results = [];

async function test(label, url, method, body, token, expectedStatus) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  const pass = res.status === expectedStatus;

  results.push(`${pass ? "PASS" : "FAIL"} | ${label} | Expected: ${expectedStatus} | Got: ${res.status} | ${data.message}`);
  return data;
}

const login = await (await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "smoke2@test.com", password: "securepass" }),
})).json();

const token = login.token;

const loginOther = await (await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "other@test.com", password: "securepass" }),
})).json();

const otherToken = loginOther.token;

const created = await test(
  "Create draft (201)",
  `${BASE}/campaigns`,
  "POST",
  { title: "Submit Test", description: "Testing submit", category: "Tech", target_amount: 10000 },
  token,
  201
);

const campaignId = created.campaign_id;

results.push("");
results.push("=== SUBMIT TESTS ===");

await test("Submit: No token (401)", `${BASE}/campaigns/${campaignId}/submit`, "POST", null, null, 401);
await test("Submit: Not owner (403)", `${BASE}/campaigns/${campaignId}/submit`, "POST", null, otherToken, 403);
await test("Submit: Valid (200)", `${BASE}/campaigns/${campaignId}/submit`, "POST", null, token, 200);
await test("Submit: Already pending (400)", `${BASE}/campaigns/${campaignId}/submit`, "POST", null, token, 400);
await test("Update: Can't edit PENDING (403)", `${BASE}/campaigns/${campaignId}`, "PUT", { title: "Sneaky edit" }, token, 403);

results.push("");
results.push("=== DONE ===");
console.log(results.join("\n"));
