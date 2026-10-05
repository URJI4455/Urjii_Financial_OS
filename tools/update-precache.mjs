#!/usr/bin/env node
/**
 * Regenerates the APP_SHELL list in service-worker.js from the files on disk.
 * Run after adding or removing any shell file (css/, js/, assets/icons/, root *.html, manifest).
 * Remember to bump CACHE_VERSION in service-worker.js when shell files change.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(directory, found = []) {
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return found;
}

const shell = [
  './',
  'manifest.webmanifest',
  ...readdirSync(ROOT).filter((name) => name.endsWith('.html')),
  ...['css', 'js', 'assets/icons'].flatMap((directory) => walk(path.join(ROOT, directory))).filter((file) => !file.endsWith('.md')),
];
const unique = ['./', ...[...new Set(shell)].filter((file) => file !== './').sort()];

const workerPath = path.join(ROOT, 'service-worker.js');
const source = readFileSync(workerPath, 'utf8');
const block = unique.map((file) => `  '${file}'`).join(',\n');
const updated = source.replace(/const APP_SHELL = \[[\s\S]*?\];/, `const APP_SHELL = [\n${block}\n];`);
writeFileSync(workerPath, updated);
console.log(`Precache list updated: ${unique.length} files.`);
