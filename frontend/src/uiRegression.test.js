import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('FIX 1: Stat.jsx source contains no requestAnimationFrame and no useCountUp', () => {
  const statSource = fs.readFileSync(path.join(__dirname, 'ui', 'Stat.jsx'), 'utf-8');
  assert.ok(!statSource.includes('requestAnimationFrame'), 'Stat.jsx must not contain requestAnimationFrame');
  assert.ok(!statSource.includes('useCountUp'), 'Stat.jsx must not contain useCountUp');
});
