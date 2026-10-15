import { createApp } from "./app.js";
import { env } from "./config/env.js";

createApp().listen(env.port, () => console.log(`Kelados API on http://localhost:${env.port}`));
