import { config } from "dotenv";
import path from "node:path";
// Commands run from apps/api. Existing injected variables have priority.
config({ path: path.resolve("../../.env"), quiet: true });
config({ quiet: true });
