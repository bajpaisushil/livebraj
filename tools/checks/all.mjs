/**
 * Run every check, and say plainly which ones are unhappy.
 *
 *   node tools/checks/all.mjs            every check, one at a time
 *   node tools/checks/all.mjs walls steps    just these
 *   node tools/checks/all.mjs -j 3       three at a time
 *
 * There was no runner before this, only a shell one-liner retyped whenever the
 * suite needed running — which is how `interior.mjs` sat at 20/23 for weeks
 * without anyone noticing, and how a one-liner's grep quietly reported
 * `dpad-dir` as "NO RESULT" because that check prints its score in its own
 * words rather than as "n/n passed".
 *
 * So the verdict here is the EXIT CODE, which every check sets, and the summary
 * line is only decoration. A check that prints nothing recognisable and exits 0
 * has passed.
 *
 * SERIAL BY DEFAULT, deliberately. Each check boots a whole world in a headless
 * browser, and several of them time things. Running them together is how
 * `chatter.mjs` came to read 6/6 on its own and 5/6 inside the suite from
 * identical code — its wait for the screen to clear was a wall-clock wait, and
 * a loaded machine made it lie. `-j` is there for when you are in a hurry and
 * know what you are looking at.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('tools/checks');

/** `_`-prefixed files are one-off probes, not checks. */
const all = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'all.mjs')
  .map((f) => f.replace(/\.mjs$/, ''))
  .sort();

const argv = process.argv.slice(2);
let jobs = 1;
const want = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '-j') { jobs = Math.max(1, Number(argv[++i]) || 1); continue; }
  want.push(argv[i].replace(/\.mjs$/, ''));
}
const list = want.length ? want.filter((n) => all.includes(n)) : all;
const missing = want.filter((n) => !all.includes(n));
if (missing.length) console.log(`unknown: ${missing.join(', ')}\n`);
if (!list.length) { console.log('nothing to run'); process.exit(1); }

const run = (name) => new Promise((done) => {
  const started = Date.now();
  /*
   * `--experimental-vm-modules` for everybody.
   *
   * `parse.mjs` builds `vm.SourceTextModule` to check that every file in the
   * project is valid ESM, and without the flag that constructor does not exist
   * — so it reported a PARSE ERROR on every single file and looked like the
   * codebase was broken. It is harmless for the checks that do not use vm, and
   * putting it here means a check cannot be added that quietly needs a flag
   * nobody remembers to pass.
   */
  const kid = spawn(process.execPath, ['--experimental-vm-modules', path.join(DIR, `${name}.mjs`)], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  kid.stdout.on('data', (d) => { out += d; });
  kid.stderr.on('data', (d) => { out += d; });
  kid.on('close', (code) => {
    // the last line that looks like a score, whatever words it used
    const score = out.split('\n').reverse()
      .find((l) => /\b\d+\s*\/\s*\d+\b/.test(l) || /^all .*\.$/.test(l.trim()));
    done({
      name, code, out,
      secs: (Date.now() - started) / 1000,
      score: (score || '').trim().slice(0, 74),
    });
  });
});

const results = [];
const queue = list.slice();
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  for (;;) {
    const name = queue.shift();
    if (!name) return;
    const r = await run(name);
    results.push(r);
    console.log(`${r.code === 0 ? ' ok ' : 'FAIL'}  ${name.padEnd(12)}`
      + `${String(r.secs.toFixed(0)).padStart(4)}s  ${r.score}`);
  }
}));

results.sort((a, b) => list.indexOf(a.name) - list.indexOf(b.name));
const bad = results.filter((r) => r.code !== 0);
console.log(`\n${results.length - bad.length}/${results.length} checks green`
  + `  (${(results.reduce((s, r) => s + r.secs, 0) / 60).toFixed(1)} min)`);

/*
 * Print the failing lines from anything unhappy. Without this the runner tells
 * you a check failed and makes you run it again yourself to find out why, which
 * is most of the reason a suite stops being run.
 */
for (const r of bad) {
  console.log(`\n--- ${r.name} (exit ${r.code}) ---`);
  const lines = r.out.split('\n').filter((l) => /FAIL|Error|error:|✗/.test(l));
  for (const l of (lines.length ? lines : r.out.split('\n')).slice(0, 10)) {
    console.log('  ' + l.trim().slice(0, 150));
  }
}

process.exit(bad.length ? 1 : 0);
