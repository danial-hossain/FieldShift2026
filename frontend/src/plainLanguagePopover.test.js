// frontend/src/plainLanguagePopover.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLAIN_LANGUAGE_TERMS,
  SAAO_ADVISORY_NOTICE_BN,
  SAAO_ADVISORY_NOTICE_EN
} from './plainLanguageTerms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('A7: Plain-language dictionary covers all 8 challenge terms with bilingual explanations', () => {
  const expectedTerms = [
    'evapotranspiration',
    'soil_moisture',
    'ndvi',
    'heat_stress',
    'water_balance',
    'satellite_vs_ground',
    'reanalysis_vs_observation',
    'uncertainty'
  ];

  for (const term of expectedTerms) {
    const entry = PLAIN_LANGUAGE_TERMS[term];
    assert.ok(entry, `Term ${term} must exist in PLAIN_LANGUAGE_TERMS`);
    assert.ok(entry.termBn && entry.termBn.length > 2, `Term ${term} must have Bengali term`);
    assert.ok(entry.termEn && entry.termEn.length > 2, `Term ${term} must have English term`);
    assert.ok(entry.explanationBn && entry.explanationBn.length > 15, `Term ${term} must have Bengali explanation`);
    assert.ok(entry.explanationEn && entry.explanationEn.length > 15, `Term ${term} must have English explanation`);
    assert.ok(entry.satelliteNoteBn && entry.satelliteNoteBn.length > 5, `Term ${term} must have satellite context in Bengali`);
    assert.ok(entry.satelliteNoteEn && entry.satelliteNoteEn.length > 5, `Term ${term} must have satellite context in English`);
  }
});

test('A7: SAAO Advisory notice contains exact mandatory Bengali & English disclaimer', () => {
  assert.equal(
    SAAO_ADVISORY_NOTICE_BN,
    'এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।',
    'Must include exact mandatory Bengali advisory notice'
  );
  assert.equal(
    SAAO_ADVISORY_NOTICE_EN,
    'This is for decision support; please verify with your local Sub-Assistant Agriculture Officer (SAAO).',
    'Must include exact English advisory notice'
  );
});

test('A7: SixSeasonRecommendationView integrates all 8 popovers and SAAO notice', () => {
  const viewSrc = fs.readFileSync(path.join(__dirname, 'SixSeasonRecommendationView.jsx'), 'utf-8');

  // Must import PlainLanguagePopover and SaaoNotice
  assert.ok(viewSrc.includes('PlainLanguagePopover'), 'View must use PlainLanguagePopover');
  assert.ok(viewSrc.includes('SaaoNotice'), 'View must use SaaoNotice');

  // Must reference all 8 popover term keys
  const expectedKeys = [
    'evapotranspiration',
    'soil_moisture',
    'ndvi',
    'heat_stress',
    'water_balance',
    'satellite_vs_ground',
    'reanalysis_vs_observation',
    'uncertainty'
  ];

  for (const key of expectedKeys) {
    assert.ok(
      viewSrc.includes(`termKey="${key}"`),
      `SixSeasonRecommendationView must include PlainLanguagePopover for termKey="${key}"`
    );
  }

  // Regression check: No isolated 'Rice' or 'Chickpea'
  assert.ok(!viewSrc.includes("'Chickpea'"), 'View must not contain literal Chickpea');
  assert.ok(!viewSrc.includes("'Rice'"), 'View must not contain literal Rice');
});
