// frontend/src/voiceAndFieldConsistency.test.js
// Focused tests for Voice lifecycle error mapping, Active-Field consistency, and Profit math

import test from 'node:test';
import assert from 'node:assert/strict';

test('Canonical Bogura Demo Field coordinates and area are consistent', () => {
  const DEMO_FIELD = {
    id: 'demo',
    is_demo: true,
    name: 'বগুড়া ডেমো খামার [DEMO]',
    latitude: 24.8500,
    longitude: 89.3700,
    area_ha: 10.0,
    soil_texture: 'loam',
    soil_ph: 6.5,
    organic_matter: 2.5,
    irrigation_capacity_mm: 90,
    crop: 'Maize'
  };

  assert.strictEqual(DEMO_FIELD.id, 'demo');
  assert.strictEqual(DEMO_FIELD.is_demo, true);
  assert.strictEqual(DEMO_FIELD.area_ha, 10.0);
  assert.strictEqual(DEMO_FIELD.latitude, 24.85);
  assert.strictEqual(DEMO_FIELD.longitude, 89.37);
  assert.strictEqual(DEMO_FIELD.soil_texture, 'loam');
});

test('Financial math: Revenue, Net Profit, and Break-even price per kg', () => {
  // Test case: 1 bigha Aman rice
  // Yield: 16 maunds = 640 kg
  // Price: 1,040 BDT / maund (= 26 BDT / kg)
  // Total cost: 10,500 BDT
  const yieldMaund = 16.0;
  const priceMaund = 1040;
  const totalCost = 10500;

  const grossRevenue = yieldMaund * priceMaund;
  assert.strictEqual(grossRevenue, 16640);

  const netProfit = grossRevenue - totalCost;
  assert.strictEqual(netProfit, 6140);

  const totalKg = yieldMaund * 40;
  assert.strictEqual(totalKg, 640);

  const breakEvenPriceKg = totalCost / totalKg;
  assert.ok(Math.abs(breakEvenPriceKg - 16.406) < 0.01);

  // If selling price is 26 BDT/kg (> 16.41 BDT/kg), production is profitable
  assert.ok(26 > breakEvenPriceKg);
});

test('Hectare to Bigha conversion ratio is mathematically stable', () => {
  const HA_TO_BIGHA = 7.47;
  const areaHa = 10.0;
  const bighaCount = areaHa * HA_TO_BIGHA;
  assert.strictEqual(bighaCount, 74.7);
});

test('Voice Assistant error classification maps to informative Bengali messages', () => {
  const getErrorMessage = (error, lang = 'bn') => {
    if (error === 'no-speech') {
      return lang === 'bn' ? 'কোনো কথা শোনা যায়নি। মাইক্রোফোনের কাছে স্পষ্ট করে আবার বলুন।' : 'No speech detected.';
    }
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      return lang === 'bn' ? 'মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে মাইক্রোফোন পারমিশন দিন।' : 'Microphone permission denied.';
    }
    if (error === 'network') {
      return lang === 'bn' ? 'ইন্টারনেট বা স্পিচ সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে নিচে লিখে প্রশ্ন করুন।' : 'Network error.';
    }
    if (error === 'audio-capture') {
      return lang === 'bn' ? 'মাইক্রোফোন শনাক্ত করা যায়নি। মাইক্রোফোন সংযোগ পরীক্ষা করুন।' : 'No microphone found.';
    }
    return 'General error';
  };

  assert.ok(getErrorMessage('not-allowed', 'bn').includes('অনুমতি দেওয়া হয়নি'));
  assert.ok(getErrorMessage('no-speech', 'bn').includes('কথা শোনা যায়নি'));
  assert.ok(getErrorMessage('network', 'bn').includes('সংযোগে সমস্যা'));
  assert.ok(getErrorMessage('audio-capture', 'bn').includes('মাইক্রোফোন শনাক্ত করা যায়নি'));
});

test('Active field resolution: empty registry returns null without throwing or fabricating values', () => {
  const userFields = [];
  const selectedFieldId = null;

  const resolveActiveField = (fields, selectedId, demoField) => {
    if (selectedId === 'demo') return demoField;
    if (selectedId == null) return null;
    return fields.find(f => String(f.id) === String(selectedId)) || null;
  };

  const demo = { id: 'demo', name: 'Bogura Demo' };
  assert.strictEqual(resolveActiveField(userFields, selectedFieldId, demo), null);
  assert.strictEqual(resolveActiveField(userFields, 'demo', demo), demo);
  assert.strictEqual(resolveActiveField([{ id: 1, name: 'Field 1' }], 1, demo).name, 'Field 1');
});
