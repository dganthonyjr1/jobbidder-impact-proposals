import fs from 'node:fs/promises';
import path from 'node:path';
import server from './dist/server/server.js';

const env = {};
try {
  const envText = await fs.readFile('.env.production', 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...parts] = line.split('=');
    env[key] = parts.join('=');
  }
} catch {}

const baseUrl = 'https://dganthonyjr1.github.io/jobbidder-impact-proposals/';
const response = await server.fetch(new Request(baseUrl), env, {});
let html = await response.text();
if (!response.ok) {
  throw new Error(`Unable to render static shell: ${response.status} ${html.slice(0, 300)}`);
}
await fs.mkdir('dist/client', { recursive: true });
await fs.writeFile('dist/client/index.html', html);
await fs.writeFile('dist/client/404.html', html);
await fs.writeFile('dist/client/.nojekyll', '');
console.log('Generated dist/client/index.html and 404.html');
