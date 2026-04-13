const BASE = "http://localhost:5000/api";

(async () => {
  try {
    const login = await (await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin", password: "admin" }),
    })).json();

    const token = login.token;

    const draft = await (await fetch(`${BASE}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "Reward Test" }),
    })).json();

    const id = draft.campaign?.id;

    const update = await (await fetch(`${BASE}/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rewards: [{ title: "T-shirt", price: "50", desc: "Yo" }] }),
    })).json();

    console.log("Update Rewards:", update.success ? "PASS" : "FAIL", JSON.stringify(update.campaign?.rewards));
  } catch (error) {
    console.error(error);
  }
})();
