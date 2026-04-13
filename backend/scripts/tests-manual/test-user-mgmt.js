const BASE = "http://localhost:5000/api";

const login = await (await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin", password: "admin" }),
})).json();

const token = login.token;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

const usersRes = await (await fetch(`${BASE}/admin/users`, { headers })).json();
console.log("Users:", usersRes.users.map((user) => `${user.name} (${user.role})`));

const testUser = usersRes.users.find((user) => user.role === "USER");
if (!testUser) {
  console.log("No USER to test with");
  process.exit(0);
}

console.log(`\nTesting on: ${testUser.name} (${testUser.id})`);

const rename = await (await fetch(`${BASE}/admin/users/${testUser.id}/name`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ name: "Test Renamed" }),
})).json();
console.log("Rename:", rename.success ? "PASS" : "FAIL", rename.message);

await fetch(`${BASE}/admin/users/${testUser.id}/name`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ name: testUser.name }),
});

const promote = await (await fetch(`${BASE}/admin/users/${testUser.id}/role`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ role: "ADMIN" }),
})).json();
console.log("Promote:", promote.success ? "PASS" : "FAIL", promote.message);

await fetch(`${BASE}/admin/users/${testUser.id}/role`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ role: "USER" }),
});

const selfDelete = await (await fetch(`${BASE}/admin/users/${login.user.id}`, {
  method: "DELETE",
  headers,
})).json();
console.log("Self-delete blocked:", !selfDelete.success ? "PASS" : "FAIL", selfDelete.message);
console.log("\nAll tests done.");
