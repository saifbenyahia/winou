const BASE = "http://localhost:5000/api";
const results = [];

async function test(label, url, method, body, token, expectedStatus) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  const pass = res.status === expectedStatus;

  results.push(
    `${pass ? "PASS" : "FAIL"} | ${label} | Expected: ${expectedStatus} | Got: ${res.status} | ${data.message || JSON.stringify(data)}`
  );

  return data;
}

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "smoke2@test.com", password: "securepass" }),
});

const loginData = await loginRes.json();
const token = loginData.token;

results.push(`INFO | Logged in as ${loginData.user?.name} | Token: ${token?.substring(0, 30)}...`);
results.push("");
results.push("=== CAMPAIGN TESTS ===");

await test("No token (401)", `${BASE}/campaigns`, "POST", { title: "Test", description: "Desc", category: "Tech", target_amount: 50000 }, null, 401);
await test("Bad token (401)", `${BASE}/campaigns`, "POST", { title: "Test", description: "Desc", category: "Tech", target_amount: 50000 }, "invalid.token.here", 401);
await test("Missing fields (400)", `${BASE}/campaigns`, "POST", { title: "Test" }, token, 400);
await test("Bad amount (400)", `${BASE}/campaigns`, "POST", { title: "T", description: "D", category: "C", target_amount: -100 }, token, 400);
await test("Valid create (201)", `${BASE}/campaigns`, "POST", { title: "Mon Projet Tech", description: "Un projet innovant", category: "Technologie", target_amount: 50000 }, token, 201);

results.push("");
results.push("=== DONE ===");
console.log(results.join("\n"));
