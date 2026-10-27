// Fails if a hex color appears anywhere in app code except the token file.
// The brand allows only the tokens in app/tokens.css (ref/BRANDGUIDE.md section 2).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const TOKEN_FILE = "app/tokens.css";
const DIRS = ["app", "components", "lib"];
const EXTS = /\.(css|tsx?|jsx?|mjs|svg)$/;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTS.test(name)) yield path;
  }
}

const hits = [];
for (const dir of DIRS) {
  for (const file of walk(join(root, dir))) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (rel === TOKEN_FILE) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const m of line.matchAll(HEX)) hits.push(`${rel}:${i + 1}  ${m[0]}`);
    });
  }
}

if (hits.length) {
  console.error(`Hex colors outside ${TOKEN_FILE}:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`No hex colors outside ${TOKEN_FILE}.`);
