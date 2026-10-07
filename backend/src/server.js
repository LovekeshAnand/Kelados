import { createApp } from "./api.js";

const port = Number(process.env.PORT) || 4000;
createApp().listen(port, () => console.log(`Kelados API on http://localhost:${port}`));
