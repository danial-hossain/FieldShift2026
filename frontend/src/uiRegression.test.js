import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evidenceBadge } from './advisoryBadges.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('FIX 1: Stat.jsx source contains no requestAnimationFrame and no useCountUp', () => {
  const statSource = fs.readFileSync(path.join(__dirname, 'ui', 'Stat.jsx'), 'utf-8');
  assert.ok(!statSource.includes('requestAnimationFrame'), 'Stat.jsx must not contain requestAnimationFrame');
  assert.ok(!statSource.includes('useCountUp'), 'Stat.jsx must not contain useCountUp');
});

test('FIX 2: Advisory source no longer contains statistically_indistinguishable; evidenceBadge returns neutral for not_significant', () => {
  const advisorySource = fs.readFileSync(path.join(__dirname, 'NasaPlantingAdvisoryView.jsx'), 'utf-8');
  assert.ok(!advisorySource.includes('statistically_indistinguishable'), 'NasaPlantingAdvisoryView.jsx must not contain statistically_indistinguishable');
  const badge = evidenceBadge(
    { evidence_level: 'not_significant' },
    { shift_days_median: 3.5, status: 'moderate_shift_cautionary' },
    'ok'
  );
  assert.equal(badge.tone, 'neutral');
});
