/**
 * Parse every client module as a real ES module.
 *
 * `node --check` parses as CommonJS unless told otherwise, which silently
 * accepts things the browser rejects — a missing class brace after an edit got
 * through exactly that way. This re-parses each file the way the browser will.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(SRC);

let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  try {
    new vm.SourceTextModule(src, { identifier: f });
  } catch (err) {
    console.log(`  PARSE ERROR ${path.relative(SRC, f)}\n    ${err.message}`);
    bad++;
  }
}
console.log(`${files.length} modules parsed as ES modules — ${bad} failed`);
process.exit(bad ? 1 : 0);
