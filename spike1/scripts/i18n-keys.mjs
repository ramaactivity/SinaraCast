#!/usr/bin/env node
/* SinaraCast — i18n key tool.
 *
 *   node scripts/i18n-keys.mjs            list keys missing from the English dictionary
 *   node scripts/i18n-keys.mjs --all      list every key found in the source
 *   node scripts/i18n-keys.mjs --unused   list dictionary entries no longer used
 *   node scripts/i18n-keys.mjs --stats    coverage summary
 *
 * Keys are the Indonesian copy itself: every literal first argument of t("…").
 * Parsed with the Babel that ships inside Next, so no extra dependency.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parser = require(path.join(ROOT, "node_modules/next/dist/compiled/babel/parser"));
const _tr = require(path.join(ROOT, "node_modules/next/dist/compiled/babel/traverse"));
const traverse = _tr.default || _tr;

const SRC = path.join(ROOT, "components/sinaracast");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name) && !p.includes("/locales/")) out.push(p);
  }
  return out;
}

const keys = new Map();     // literal t("…") keys -> Set(file)
const literals = new Set(); // every string literal in the sources — label tables are
                            // read through t(TABLE[x]), so their values never appear
                            // as a literal argument but are still legitimately used.
for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] }); } catch { continue; }
  traverse(ast, {
    StringLiteral(p) { literals.add(p.node.value); },
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "Identifier" || c.name !== "t") return;
      const a = p.node.arguments[0];
      if (!a || a.type !== "StringLiteral") return;
      const rel = path.relative(ROOT, file);
      if (!keys.has(a.value)) keys.set(a.value, new Set());
      keys.get(a.value).add(rel);
    },
  });
}

const { EN } = await import(path.join(SRC, "locales/en.js"));
const all = [...keys.keys()].sort((a, b) => a.localeCompare(b, "id"));
const missing = all.filter((k) => EN[k] === undefined);
const unused = Object.keys(EN).filter((k) => !keys.has(k) && !literals.has(k)).sort();

const arg = process.argv[2] || "--missing";
if (arg === "--stats") {
  console.log(`keys in source : ${all.length}`);
  console.log(`translated     : ${all.length - missing.length}`);
  console.log(`missing        : ${missing.length}`);
  console.log(`unused entries : ${unused.length}`);
} else if (arg === "--unused") {
  unused.forEach((k) => console.log(k));
} else if (arg === "--all") {
  all.forEach((k) => console.log(JSON.stringify(k)));
} else {
  missing.forEach((k) => console.log(JSON.stringify(k)));
}
