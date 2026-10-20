// Fails the build if gated or banned claims reach dist/ (build brief T10, client-intel USER ANSWERS).
// Flags in src/data/confirm.ts decide what is allowed.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIRM = {
  // Mirror of src/data/confirm.ts (kept simple: plain JS, read by regex)
};
const src = await readFile('src/data/confirm.ts', 'utf8');
for (const m of src.matchAll(/^\s*(\w+):\s*(true|false),/gm)) CONFIRM[m[1]] = m[2] === 'true';

const rules = [
  { re: /\bLauren\b|\bhis wife\b|\bSam'?s wife\b|\bhusband\b/i, why: 'no spouse anywhere (user answer)' },
  { re: /Real Men,? Real Conversation|Friday Recap|sam-podcast\.png/i, why: 'Jimmy Rex residue' },
  { re: /6862779/, why: 'licence number stays off the site' },
  { re: /Preferred Lending Partner|Zillow preferred agent/i, why: 'unsourced claim' },
  { re: /renter demographic/i, why: 'fair housing' },
  { re: /high returns|guaranteed returns/i, why: 'promissory investment language' },
  { re: /aggregateRating/, why: 'Zillow reviews are not first-party ratings' },
  { re: /Top 1%(?! National Realtor)/, why: '"Top 1%" (unsourced)', off: !CONFIRM.top1 },
  { re: /\bCCIM\b/, why: 'CCIM not confirmed', off: !CONFIRM.ccim },
  { re: /\$450M|\$450 million/i, why: '$450M gated', off: !CONFIRM.volume450M },
  { re: /2,000\+? doors|2,000 apartment doors/i, why: '2,000 doors gated', off: !CONFIRM.doors2000 },
  { re: /\bbroker\b/i, why: '"broker" gated', off: !CONFIRM.broker },
].filter((r) => r.off === undefined || r.off === true);

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(html|xml|json|txt)$/.test(e.name)) yield p;
  }
}
const roots = ['dist', '.vercel/output/static'];
let bad = 0, files = 0;
for (const root of roots) {
  try {
    for await (const f of walk(root)) {
      files++;
      const t = (await readFile(f, 'utf8')).replace(/<script type="application\/json" data-map-json[\s\S]*?<\/script>/g, '');
      for (const r of rules) {
        const m = r.re.exec(t);
        if (m) {
          bad++;
          console.error(`claims-lint FAIL ${f}: "${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}" — ${r.why}`);
        }
      }
    }
  } catch {}
}
if (bad) process.exit(1);
console.log(`claims-lint: ${files} files clean`);
