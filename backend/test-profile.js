const BASE = "http://localhost:5000/api";

// Step 1: Login
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin", password: "admin" }),
});
const loginData = await loginRes.json();
console.log("Login:", loginData.success, loginData.user?.name);

if (!loginData.success) { console.log("Login failed"); process.exit(1); }

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${loginData.token}`,
};

// Step 2: Update profile (no password needed)
const updateRes = await fetch(`${BASE}/auth/profile`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ name: "Admin Testé", bio: "Passionné par la tech en Tunisie 🇹🇳" }),
});
const updateData = await updateRes.json();
console.log("Update:", updateData.success, JSON.stringify(updateData.user));

// Step 3: Restore
await fetch(`${BASE}/auth/profile`, {
  method: "PUT", headers,
  body: JSON.stringify({ name: "Admin Hive", bio: "" }),
});
console.log("Restored.");
