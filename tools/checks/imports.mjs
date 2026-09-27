/**
 * Static integration check for the client.
 *
 * With a dozen modules authored against one contract, the failure that actually
 * bites is a relative import at the wrong depth — it parses perfectly and dies
 * at runtime. This resolves every import in the tree, verifies the named exports
 * a module asks for actually exist, and flags anything imported from outside the
 * two allowed external specifiers.
 *
 *   node tools/checks/imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client');
const SRC = path.join(ROOT, 'src');

const ALLOWED_EXTERNAL = [/^three$/, /^three\/addons\//];

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(SRC);

const IMPORT_RE = /(?:^|\n)\s*import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\(\s*(?:\/\*[^*]*\*\/\s*)?['"]([^'"]+)['"]\s*\)/g;
const EXPORT_RE = /^export\s+(?:async\s+)?(?:(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)|\{([^}]*)\}|(default))/gm;

/** Named exports a file provides. */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = new Set();
  let m;
  EXPORT_RE.lastIndex = 0;
  while ((m = EXPORT_RE.exec(src))) {
    if (m[1]) out.add(m[1]);
    else if (m[2]) {
      for (const part of m[2].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) out.add(name);
      }
    } else if (m[3]) out.add('default');
  }
  // re-exports: export { X } from './y.js'  and  export * from './y.js'
  if (/export\s+\*\s+from/.test(src)) out.add('*');
  return out;
}

const exportCache = new Map();
const getExports = (f) => {
  if (!exportCache.has(f)) exportCache.set(f, exportsOf(f));
  return exportCache.get(f);
};

/** Names a statement pulls in. */
function importedNames(clause) {
  if (!clause) return [];
  const names = [];
  const braced = clause.match(/\{([\s\S]*)\}/);
  if (braced) {
    for (const part of braced[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  const def = clause.replace(/\{[\s\S]*\}/, '').replace(/\*\s+as\s+[A-Za-z0-9_$]+/, '').split(',')[0].trim();
  if (def && !def.startsWith('{')) names.push('default');
  return names;
}

let errors = 0, warnings = 0, edges = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const dir = path.dirname(file);

  const check = (spec, clause, kind) => {
    edges++;
    if (ALLOWED_EXTERNAL.some((re) => re.test(spec))) return;
    if (!spec.startsWith('.')) {
      console.log(`  ERROR ${rel}\n        forbidden external import "${spec}" (only 'three' and 'three/addons/' are allowed)`);
      errors++;
      return;
    }
    const target = path.resolve(dir, spec);
    if (!fs.existsSync(target)) {
      console.log(`  ERROR ${rel}\n        ${kind} "${spec}" does not resolve -> ${path.relative(ROOT, target)}`);
      errors++;
      return;
    }
    if (!spec.endsWith('.js')) {
      console.log(`  WARN  ${rel}: "${spec}" has no .js extension — browsers will not resolve it`);
      warnings++;
    }
    const provided = getExports(target);
    if (provided.has('*')) return;
    for (const name of importedNames(clause)) {
      if (!provided.has(name)) {
        console.log(`  ERROR ${rel}\n        imports { ${name} } from "${spec}" but it exports: ${[...provided].join(', ') || '(nothing)'}`);
        errors++;
      }
    }
  };

  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) check(m[2], m[1], 'import');
  DYNAMIC_RE.lastIndex = 0;
  while ((m = DYNAMIC_RE.exec(src))) check(m[1], null, 'dynamic import');
}

// index.html must point at a real entry
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const entry = html.match(/import\s+['"](\.\/[^'"]+)['"]/);
if (!entry) { console.log('  ERROR index.html has no module entry point'); errors++; }
else if (!fs.existsSync(path.join(ROOT, entry[1]))) { console.log(`  ERROR index.html entry ${entry[1]} missing`); errors++; }

console.log(`\n${files.length} modules, ${edges} imports checked — ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
