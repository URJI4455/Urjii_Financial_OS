#!/usr/bin/env node
/**
 * Project structure and architecture checker (no dependencies).
 *
 * Verifies:
 *  1. Every local path referenced by HTML, CSS, the manifest and JS imports exists.
 *  2. Layering: UI -> Services -> Engine -> DB (config is shared). Pages never touch the engine or IndexedDB.
 *  3. Only js/db may reference the global `indexedDB`.
 *  4. Every HTML page maps to a route and loads its own page controller.
 *  5. The service worker precache list matches the shell files exactly.
 *
 * Exit code 0 = clean, 1 = problems found.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (message) => problems.push(message);
const rel = (absolute) => path.relative(ROOT, absolute).split(path.sep).join('/');
const read = (absolute) => readFileSync(absolute, 'utf8');

function walk(directory, found = []) {
  for (const name of readdirSync(directory)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

const allFiles = walk(ROOT);
const withExtension = (extension) => allFiles.filter((file) => file.endsWith(extension));
const isExternal = (reference) => /^(https?:|\/\/|#|data:|mailto:|tel:)/.test(reference);
const stripJsComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// ---------------------------------------------------------------- layering rules
const LAYER_DIRECTORIES = {
  ui: ['js/ui/', 'js/pwa/'],
  services: ['js/services/'],
  engine: ['js/engine/'],
  db: ['js/db/'],
  config: ['js/config/'],
};
const ALLOWED_IMPORTS = {
  ui: ['ui', 'services', 'config'],
  services: ['services', 'engine', 'config'],
  engine: ['engine', 'db', 'config'],
  db: ['db', 'config'],
  config: ['config'],
};

function layerOf(relativePath) {
  for (const [layer, directories] of Object.entries(LAYER_DIRECTORIES)) {
    if (directories.some((directory) => relativePath.startsWith(directory))) return layer;
  }
  return null;
}

// ---------------------------------------------------------------- JS imports + layering
const IMPORT_PATTERN =
  /(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const file of withExtension('.js').concat(withExtension('.mjs'))) {
  const relativePath = rel(file);
  const code = stripJsComments(read(file));
  const fromLayer = layerOf(relativePath);

  for (const match of code.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] || match[2] || match[3];
    if (!specifier.startsWith('.')) continue; // bare/node: specifiers are not project paths

    const target = path.resolve(path.dirname(file), specifier);
    if (!existsSync(target)) {
      fail(`${relativePath}: import "${specifier}" does not exist`);
      continue;
    }

    const toLayer = layerOf(rel(target));
    if (fromLayer && toLayer && !ALLOWED_IMPORTS[fromLayer].includes(toLayer)) {
      fail(`${relativePath}: layer violation - ${fromLayer} must not import ${toLayer} ("${specifier}")`);
    }
    if (fromLayer && !toLayer) {
      fail(`${relativePath}: imports "${specifier}" which is outside the layered js/ tree`);
    }
  }

  if (relativePath.startsWith('js/') && !relativePath.startsWith('js/db/') && /\bindexedDB\b/.test(code)) {
    fail(`${relativePath}: only js/db may reference indexedDB`);
  }
}

// ---------------------------------------------------------------- HTML
const routesSource = read(path.join(ROOT, 'js/ui/routes.js'));
const routes = [...routesSource.matchAll(/id: '([^']+)'.*?href: '([^']+)'/g)].map((m) => ({ id: m[1], href: m[2] }));
const rootHtmlFiles = withExtension('.html').filter((file) => path.dirname(file) === ROOT);

for (const route of routes) {
  if (!existsSync(path.join(ROOT, route.href))) fail(`routes.js: page "${route.id}" -> ${route.href} does not exist`);
}

for (const file of withExtension('.html')) {
  const relativePath = rel(file);
  const html = read(file);

  for (const match of html.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)) {
    const reference = match[1];
    if (!reference || isExternal(reference)) continue;
    const target = path.resolve(path.dirname(file), reference.split(/[?#]/)[0]);
    if (!existsSync(target)) fail(`${relativePath}: missing reference "${reference}"`);
  }
}

for (const file of rootHtmlFiles) {
  const relativePath = rel(file);
  const html = read(file);
  const pageId = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1];
  const route = routes.find((candidate) => candidate.id === pageId);
  if (!pageId) fail(`${relativePath}: <body> has no data-page`);
  else if (!route) fail(`${relativePath}: data-page "${pageId}" has no route`);
  else if (route.href !== relativePath) fail(`${relativePath}: route for "${pageId}" points to ${route.href}`);
  if (pageId && !html.includes(`src="js/ui/pages/${pageId}.js"`)) {
    fail(`${relativePath}: does not load js/ui/pages/${pageId}.js`);
  }
}

// ---------------------------------------------------------------- CSS
for (const file of withExtension('.css')) {
  const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const references = [
    ...[...code.matchAll(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]),
    ...[...code.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...code.matchAll(/(?<!@import\s)url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]),
  ];
  for (const reference of references) {
    if (isExternal(reference)) continue;
    if (!existsSync(path.resolve(path.dirname(file), reference))) fail(`${rel(file)}: missing reference "${reference}"`);
  }
}

// ---------------------------------------------------------------- manifest
const manifest = JSON.parse(read(path.join(ROOT, 'manifest.webmanifest')));
const manifestTargets = [manifest.start_url, manifest.scope, ...(manifest.icons || []).map((icon) => icon.src)];
for (const reference of manifestTargets) {
  if (!reference) continue;
  if (!existsSync(path.resolve(ROOT, reference))) fail(`manifest.webmanifest: missing "${reference}"`);
}

// ---------------------------------------------------------------- service worker precache
const workerSource = read(path.join(ROOT, 'service-worker.js'));
const shellBlock = (workerSource.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1];
if (!shellBlock) {
  fail('service-worker.js: APP_SHELL list not found');
} else {
  const listed = [...shellBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const normalise = (entry) => (entry === './' ? 'index.html' : entry);

  for (const entry of listed) {
    if (!existsSync(path.join(ROOT, normalise(entry)))) fail(`service-worker.js: precache entry "${entry}" does not exist`);
  }

  const expected = allFiles
    .map(rel)
    .filter((file) => !file.endsWith('.md'))
    .filter(
      (file) =>
        file.startsWith('css/') ||
        file.startsWith('js/') ||
        file.startsWith('assets/icons/') ||
        file === 'manifest.webmanifest' ||
        (file.endsWith('.html') && !file.includes('/'))
    );
  const listedSet = new Set(listed.map(normalise));
  for (const file of expected) {
    if (!listedSet.has(file)) fail(`service-worker.js: shell file "${file}" is not precached`);
  }
  if (!listed.includes('./')) fail('service-worker.js: "./" (start URL) is not precached');
}

// ---------------------------------------------------------------- report
if (problems.length > 0) {
  console.error(`Structure check FAILED (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `Structure check passed: ${rootHtmlFiles.length} pages, ${withExtension('.js').length} JS files, ` +
    `${withExtension('.css').length} CSS files. Layering UI -> Services -> Engine -> DB holds.`
);
