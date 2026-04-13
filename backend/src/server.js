import { env } from "./config/env.js";
import app from "./app.js";
import { dbReady } from "./config/db.js";
export const startServer = async () => {
  await dbReady;

  return app.listen(env.PORT, () => {
    console.log(`Hive.tn API running on http://localhost:${env.PORT}`);
  });
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
