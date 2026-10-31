// frontend/src/sixSeasonRecommendation.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_PERIODS,
  CROP_DATABASE,
  STRATEGY_DEFINITIONS,
  CANONICAL_ROTATIONS,
  buildSixSeasonRecommendations
} from './sixSeasonEngine.js';

test('CANONICAL_PERIODS contains exactly 6 chronological planning periods', () => {
  assert.equal(CANONICAL_PERIODS.length, 6, 'Must contain exactly 6 periods');
  const expectedKeys = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];
  assert.deepEqual(CANONICAL_PERIODS.map(p => p.key), expectedKeys);

  // Check season patterns (Rabi=dry, Kharif1=transitional, Kharif2=wet)
  assert.equal(CANONICAL_PERIODS[0].seasonCode, 'rabi');
  assert.equal(CANONICAL_PERIODS[1].seasonCode, 'kharif1');
  assert.equal(CANONICAL_PERIODS[2].seasonCode, 'kharif2');
  assert.equal(CANONICAL_PERIODS[3].seasonCode, 'rabi');
  assert.equal(CANONICAL_PERIODS[4].seasonCode, 'kharif1');
  assert.equal(CANONICAL_PERIODS[5].seasonCode, 'kharif2');

  // Check chronological years and seasons
  assert.deepEqual(CANONICAL_PERIODS.map(p => p.year), [1, 1, 1, 2, 2, 2]);
  assert.deepEqual(CANONICAL_PERIODS.map(p => p.seasonNum), [1, 2, 3, 1, 2, 3]);
});

test('All 4 MILP strategy profiles have valid objective weights summing to 1.0', () => {
  const strategyKeys = ['balanced', 'profit_focused', 'water_efficiency', 'soil_health'];
  assert.deepEqual(Object.keys(STRATEGY_DEFINITIONS), strategyKeys);

  for (const key of strategyKeys) {
    const strat = STRATEGY_DEFINITIONS[key];
    assert.ok(strat.titleEn, `Strategy ${key} must have English title`);
    assert.ok(strat.titleBn, `Strategy ${key} must have Bengali title`);
    assert.ok(strat.weights, `Strategy ${key} must have objective weights`);

    const sum = strat.weights.profit + strat.weights.water + strat.weights.soil;
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Strategy ${key} weights must sum to 1.0, got ${sum}`);
  }
});

test('Canonical rotations cover all 6 periods with crops present in CROP_DATABASE', () => {
  const periods = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];
  for (const [stratKey, stratData] of Object.entries(CANONICAL_ROTATIONS)) {
    assert.ok(stratData.rotation, `Strategy ${stratKey} must define a rotation`);
    for (const p of periods) {
      const crop = stratData.rotation[p];
      assert.ok(crop, `Strategy ${stratKey} must assign a crop to period ${p}`);
      assert.ok(CROP_DATABASE[crop], `Crop ${crop} in strategy ${stratKey} must exist in CROP_DATABASE`);
    }
    assert.ok(Number.isFinite(stratData.gross_margin_bdt_per_ha), `gross_margin_bdt_per_ha must be finite`);
    assert.ok(Number.isFinite(stratData.water_score), `water_score must be finite`);
    assert.ok(Number.isFinite(stratData.soil_score), `soil_score must be finite`);
    assert.ok(Number.isFinite(stratData.composite_score), `composite_score must be finite`);
  }
});

test('Legume BNF interval rule: every strategy contains at least 1 pulse/legume in every 3 consecutive seasons', () => {
  const periods = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];

  for (const [stratKey, stratData] of Object.entries(CANONICAL_ROTATIONS)) {
    const crops = periods.map(p => stratData.rotation[p]);
    const isLegume = crops.map(c => Boolean(CROP_DATABASE[c]?.is_legume));

    // Check every sliding window of 3 seasons
    for (let i = 0; i <= 3; i++) {
      const window = isLegume.slice(i, i + 3);
      const hasLegume = window.some(val => val === true);
      assert.ok(
        hasLegume,
        `Strategy ${stratKey} must have at least 1 legume in seasons ${i + 1}-${i + 3} (found: ${crops.slice(i, i + 3).join(', ')})`
      );
    }
  }
});

test('Botanical family alternation: no consecutive seasons use crops from the same family', () => {
  const periods = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];

  for (const [stratKey, stratData] of Object.entries(CANONICAL_ROTATIONS)) {
    const families = periods.map(p => CROP_DATABASE[stratData.rotation[p]].family);
    for (let i = 0; i < families.length - 1; i++) {
      assert.notEqual(
        families[i],
        families[i + 1],
        `Strategy ${stratKey} has consecutive crops in same family (${families[i]}) at seasons ${i + 1} and ${i + 2}`
      );
    }
  }
});

test('buildSixSeasonRecommendations produces complete, ordered recommendations with economic scaling', () => {
  const fieldAreaHa = 10.0;
  const planData = {
    strategyId: 'profit_focused',
    rotation: CANONICAL_ROTATIONS.profit_focused.rotation,
    fallbackReasons: CANONICAL_ROTATIONS.profit_focused.reasons
  };

  const recommendations = buildSixSeasonRecommendations(planData, fieldAreaHa);
  assert.equal(recommendations.length, 6, 'Must produce exactly 6 recommendations');

  // Verify chronological ordering
  const expectedKeys = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];
  assert.deepEqual(recommendations.map(r => r.key), expectedKeys);

  // Check first recommendation
  const r0 = recommendations[0];
  assert.equal(r0.cropName, 'Tomato');
  assert.equal(r0.yieldTonHa, 32.0);
  assert.equal(r0.totalHarvestTons, 320.0);
  assert.ok(r0.rationale.length > 0);
  assert.ok(r0.netProfitBdtHa > 0);
  assert.equal(r0.totalParcelProfitBdt, r0.netProfitBdtHa * fieldAreaHa);

  // Check second recommendation (Groundnut legume)
  const r1 = recommendations[1];
  assert.equal(r1.cropName, 'Groundnut');
  assert.equal(r1.cropMeta.is_legume, true);
  assert.equal(r1.totalHarvestTons, 28.0);
});

test('buildSixSeasonRecommendations safely handles empty or zero field inputs without crashing', () => {
  const fallbackRecs = buildSixSeasonRecommendations(null, 0);
  assert.equal(fallbackRecs.length, 6);
  for (const rec of fallbackRecs) {
    assert.ok(Number.isFinite(rec.totalHarvestTons));
    assert.ok(Number.isFinite(rec.netProfitBdtHa));
    assert.ok(rec.cropName);
  }
});
