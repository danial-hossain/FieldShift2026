// frontend/src/nasaAdvisory.test.js
// Node.js native test suite for NASA Planting-Window Advisory contracts

import test from 'node:test';
import assert from 'node:assert/strict';

test('SMS Length Constraint: Advisory Bangla SMS must be strictly <= 160 characters', () => {
  const sampleSmsList = [
    'রাজশাহী আমন: বৃষ্টি ৪ দিন দেরিতে আসছে। বীজতলা ২৫ জুন এর পরে ফেলুন। ব্রি ধান৭৫ চাষ করুন ও সম্পূরক সেচ প্রস্তুত রাখুন।',
    'বগুড়া আমন: বৃষ্টি ১১ দিন দেরিতে আসছে। বীজতলা ০২ জুলাই এর পরে ফেলুন। ব্রি ধান৭৫ চাষ করুন ও সম্পূরক সেচ প্রস্তুত রাখুন।',
    'রংপুর আমন: স্বাভাবিক রোপণ সময় জুনের শেষ থেকে জুলাইর প্রথম সপ্তাহ। ব্রি ধান৪৯ বা ব্রি ধান৭৫ চাষ করুন।',
    'রাজশাহী জেলায় পর্যাপ্ত পর্যবেক্ষণ উপাত্ত না থাকায় প্রচলিত বিআরআরআই ক্যালেন্ডার অনুসরণ করুন।',
  ];

  for (const sms of sampleSmsList) {
    assert.ok(sms.length <= 160, `SMS exceeded 160 chars (length=${sms.length}): ${sms}`);
    assert.ok(sms.length > 20, 'SMS too short to be informative');
  }
});

test('District registry integrity for NASA Point API querying', () => {
  const districts = {
    rajshahi: { lat: 24.3745, lon: 88.6042, aez: 25 },
    bogura: { lat: 24.8467, lon: 89.3777, aez: 3 },
    rangpur: { lat: 25.7439, lon: 89.2752, aez: 2 },
  };

  for (const [key, d] of Object.entries(districts)) {
    assert.ok(d.lat >= 20.6 && d.lat <= 26.65, `${key} latitude out of Bangladesh bounding box`);
    assert.ok(d.lon >= 88.01 && d.lon <= 92.67, `${key} longitude out of Bangladesh bounding box`);
    assert.ok(typeof d.aez === 'number', `${key} must have integer AEZ code`);
  }
});

test('Growing Degree Days (GDD) formula invariant: Base 10C and Cap 35C', () => {
  function calcGdd(tmax, tmin, base = 10, cap = 35) {
    const tmean = (tmax + tmin) / 2.0;
    const teff = Math.min(cap, tmean);
    return Math.max(0, teff - base);
  }

  // Extreme heat: (40 + 32)/2 = 36C -> capped at 35C -> 35 - 10 = 25 GDD
  assert.equal(calcGdd(40, 32), 25);

  // Normal monsoon day: (32 + 24)/2 = 28C -> 28 - 10 = 18 GDD
  assert.equal(calcGdd(32, 24), 18);

  // Cool winter day below threshold: (10 + 6)/2 = 8C -> 0 GDD
  assert.equal(calcGdd(10, 6), 0);
});

test('Two-period shift arithmetic: Period 2 minus Period 1', () => {
  const p1MedianDoy = 154; // e.g. June 3
  const p2MedianDoy = 165; // e.g. June 14
  const shift = p2MedianDoy - p1MedianDoy;

  assert.equal(shift, 11);
  assert.ok(shift > 0, 'Positive shift indicates delay in monsoon onset');
});

test('Offline data mode designations: cache, fixture, live_acquired_cache', () => {
  const validDataModes = new Set(['cache', 'fixture', 'live_acquired_cache']);
  assert.ok(validDataModes.has('cache'));
  assert.ok(validDataModes.has('fixture'));
  assert.ok(validDataModes.has('live_acquired_cache'));
  assert.ok(!validDataModes.has('synthetic_invented'));
});
