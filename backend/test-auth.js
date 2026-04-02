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

// ── 1. Login to get a valid token ──────────────
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "smoke2@test.com", password: "securepass" }),
});
const loginData = await loginRes.json();
const TOKEN = loginData.token;
results.push(`INFO | Logged in as ${loginData.user?.name} | Token: ${TOKEN?.substring(0, 30)}...`);

results.push("");
results.push("=== CAMPAIGN TESTS ===");

// ── 2. No token → 401 ─────────────────────────
await test("No token (401)", `${BASE}/campaigns`, "POST", { title: "Test", description: "Desc", category: "Tech", target_amount: 50000 }, null, 401);

// ── 3. Invalid token → 401 ─────────────────────
await test("Bad token (401)", `${BASE}/campaigns`, "POST", { title: "Test", description: "Desc", category: "Tech", target_amount: 50000 }, "invalid.token.here", 401);

// ── 4. Missing fields → 400 ───────────────────
await test("Missing fields (400)", `${BASE}/campaigns`, "POST", { title: "Test" }, TOKEN, 400);

// ── 5. Invalid amount → 400 ───────────────────
await test("Bad amount (400)", `${BASE}/campaigns`, "POST", { title: "T", description: "D", category: "C", target_amount: -100 }, TOKEN, 400);

// ── 6. Valid create → 201 ──────────────────────
const createData = await test("Valid create (201)", `${BASE}/campaigns`, "POST", { title: "Mon Projet Tech", description: "Un projet innovant", category: "Technologie", target_amount: 50000 }, TOKEN, 201);

results.push("");
results.push("=== DONE ===");

fs.writeFileSync("test-results.txt", results.join("\n") + "\n");
console.log("Results written to test-results.txt");
