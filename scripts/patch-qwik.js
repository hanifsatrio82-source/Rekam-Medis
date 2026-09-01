const fs = require('fs');
const path = require('path');

function patchFile(file, replacer) {
  if (!fs.existsSync(file)) { console.log('skip not found', file); return; }
  let c = fs.readFileSync(file, 'utf8');
  const before = c;
  c = replacer(c);
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf8');
    console.log('patched', file);
  } else {
    console.log('no change', file);
  }
}

// 1. vercel-edge: runtime edge -> nodejs20.x + entrypoint -> handler (Node needs handler, not entrypoint)
patchFile(
  path.join(__dirname, '..', 'node_modules', '@builder.io', 'qwik-city', 'lib', 'adapters', 'vercel-edge', 'vite', 'index.mjs'),
  c => c.replace('"edge"', '"nodejs20.x"').replace('entrypoint,', 'handler: entrypoint,')
);
patchFile(
  path.join(__dirname, '..', 'node_modules', '@builder.io', 'qwik-city', 'lib', 'adapters', 'vercel-edge', 'vite', 'index.cjs'),
  c => c.replace('"edge"', '"nodejs20.x"').replace('entrypoint,', 'handler: entrypoint,')
);

// 2. shared vite: allow entry.vercel-edge as valid entry (alongside entry.ssr)
patchFile(
  path.join(__dirname, '..', 'node_modules', '@builder.io', 'qwik-city', 'lib', 'adapters', 'shared', 'vite', 'index.cjs'),
  c => c.replace('if (chunk.name === "entry.ssr") {', 'if (chunk.name === "entry.ssr" || chunk.name === "entry.vercel-edge") {')
);
patchFile(
  path.join(__dirname, '..', 'node_modules', '@builder.io', 'qwik-city', 'lib', 'adapters', 'shared', 'vite', 'index.mjs'),
  c => c.replace('if (chunk.name === "entry.ssr") {', 'if (chunk.name === "entry.ssr" || chunk.name === "entry.vercel-edge") {')
);

console.log('patch-qwik done');
