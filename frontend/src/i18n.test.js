// frontend/src/i18n.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSLATIONS,
  toBengaliNumber,
  formatArea,
  formatCurrency,
  useTranslation
} from './i18n.js';

test('i18n dictionary contains essential navigation and farmer keys', () => {
  const bn = TRANSLATIONS.bn;
  const en = TRANSLATIONS.en;

  assert.ok(bn.nav_home === 'হোম');
  assert.ok(bn.nav_farm === 'আমার জমি');
  assert.ok(bn.nav_crop_advice === 'ফসলের পরামর্শ');
  assert.ok(bn.nav_market === 'বাজারদর');
  assert.ok(bn.nav_weather === 'আবহাওয়া');
  assert.ok(bn.nav_harvest_profit === 'ফসলের হিসাব');
  assert.ok(bn.nav_assistant === 'AI সহকারী');

  assert.ok(en.nav_home === 'Home');
  assert.ok(en.nav_farm === 'My Farm');
  assert.ok(en.nav_crop_advice === 'Crop Advice');
  assert.ok(en.nav_market === 'Market Prices');
  assert.ok(en.nav_weather === 'Weather');
  assert.ok(en.nav_harvest_profit === 'Harvest & Profit');
  assert.ok(en.nav_assistant === 'AI Assistant');
});

test('toBengaliNumber converts digits correctly', () => {
  assert.strictEqual(toBengaliNumber('12345'), '১২৩৪৫');
  assert.strictEqual(toBengaliNumber('67890'), '৬৭৮৯০');
  assert.strictEqual(toBengaliNumber('28.5'), '২৮.৫');
  assert.strictEqual(toBengaliNumber(null), 'অপ্রাপ্য');
  assert.strictEqual(toBengaliNumber(undefined), 'অপ্রাপ্য');
});

test('formatArea accurately computes bighas from hectares', () => {
  // 1 ha = 7.47 bighas
  const bnArea = formatArea(1.0, 'bn');
  assert.ok(bnArea.includes('বিঘা'));
  assert.ok(bnArea.includes('হেক্টর'));

  const enArea = formatArea(2.0, 'en');
  assert.strictEqual(enArea, '14.9 Bigha (2.00 ha)');
  assert.strictEqual(formatArea(null, 'en'), 'Not available');
});

test('formatCurrency formats BDT amounts properly', () => {
  const bnCur = formatCurrency(25000, 'bn');
  assert.ok(bnCur.includes('টাকা'));
  assert.strictEqual(formatCurrency(25000, 'en'), '25,000 BDT');
  assert.strictEqual(formatCurrency(null, 'bn'), 'অপ্রাপ্য');
});

test('useTranslation hook logic returns correct language string', () => {
  const { t: tBn } = useTranslation('bn');
  assert.strictEqual(tBn('nav_home'), 'হোম');

  const { t: tEn } = useTranslation('en');
  assert.strictEqual(tEn('nav_home'), 'Home');

  assert.strictEqual(tBn('non_existent_key_xyz', 'fallback text'), 'fallback text');
});
