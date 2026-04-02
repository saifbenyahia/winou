const BASE = "http://localhost:5000/api";

// Login as admin
const login = await (await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "smoke2@test.com", password: "securepass" }),
})).json();

const TOKEN = login.token;
console.log("Token role:", login.user.role);

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${TOKEN}`,
};

// Test stats
const stats = await (await fetch(`${BASE}/admin/stats`, { headers })).json();
console.log("\n=== STATS ===");
console.log(JSON.stringify(stats, null, 2));

// Test pending
const pending = await (await fetch(`${BASE}/admin/campaigns/pending`, { headers })).json();
console.log("\n=== PENDING ===");
console.log(JSON.stringify(pending, null, 2));

// Test users
const users = await (await fetch(`${BASE}/admin/users`, { headers })).json();
console.log("\n=== USERS ===");
console.log(JSON.stringify(users, null, 2));
