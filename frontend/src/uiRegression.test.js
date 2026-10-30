import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evidenceBadge } from './advisoryBadges.js';
import { buildSixSeasonRecommendations } from './sixSeasonEngine.js';

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

test('FIX 3: FarmerHomeView.jsx source does not contain headline_bn nor hardcoded advisory sentence', () => {
  const homeSource = fs.readFileSync(path.join(__dirname, 'FarmerHomeView.jsx'), 'utf-8');
  assert.ok(!homeSource.includes('headline_bn'), 'FarmerHomeView.jsx must not contain headline_bn');
  assert.ok(!homeSource.includes('স্বাভাবিক সময়ে চারা রোপণ করুন'), 'FarmerHomeView.jsx must not contain hardcoded advice sentence');
});

test('FIX 4: SixSeasonRecommendationView.jsx does not reference CANONICAL_ROTATIONS; buildSixSeasonRecommendations({}, undefined) does not produce Chickpea or Rice', () => {
  const viewSource = fs.readFileSync(path.join(__dirname, 'SixSeasonRecommendationView.jsx'), 'utf-8');
  assert.ok(!viewSource.includes('CANONICAL_ROTATIONS'), 'SixSeasonRecommendationView.jsx must not reference CANONICAL_ROTATIONS');
  const recs = buildSixSeasonRecommendations({}, undefined);
  const crops = recs.map(r => r.cropName);
  assert.ok(!crops.includes('Chickpea'), 'buildSixSeasonRecommendations({}, undefined) must not produce Chickpea');
  assert.ok(!crops.includes('Rice'), 'buildSixSeasonRecommendations({}, undefined) must not produce Rice');
});

test('FIX 5: Every line containing var(-- in 3D/canvas files must also contain style, className, fill=, or stroke=', () => {
  const research3dDir = path.join(__dirname, 'research3d');
  const research3dFiles = fs.readdirSync(research3dDir)
    .filter(f => f.endsWith('.jsx'))
    .map(f => path.join(research3dDir, f));

  const targetFiles = [
    ...research3dFiles,
    path.join(__dirname, 'ClayFarmScene.jsx'),
    path.join(__dirname, 'NasaWeatherStation3D.jsx'),
    path.join(__dirname, 'FarmerFarm3D.jsx'),
    path.join(__dirname, 'RealFarmCanvas3D.jsx'),
    path.join(__dirname, 'ExperimentSimulator3DView.jsx'),
    path.join(__dirname, 'ui', 'RingGauge.jsx'),
    path.join(__dirname, 'ui', 'Donut.jsx'),
    path.join(__dirname, 'ui', 'LineChart.jsx')
  ];

  const allowedTokens = ['style', 'className', 'fill=', 'stroke='];
  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('var(--')) {
        const hasAllowed = allowedTokens.some(t => line.includes(t));
        assert.ok(
          hasAllowed,
          `Invalid var(--) usage in ${path.relative(__dirname, filePath)}:${idx + 1}: ${line.trim()}`
        );
      }
    });
  }
});

test('FIX 6: Tabs handles both items and tabs props; all Tabs callers pass items= or tabs=', () => {
  const tabsSource = fs.readFileSync(path.join(__dirname, 'ui', 'Tabs.jsx'), 'utf-8');
  assert.ok(tabsSource.includes('items'), 'Tabs.jsx must support items');
  assert.ok(tabsSource.includes('tabs'), 'Tabs.jsx must support tabs');
  assert.ok(tabsSource.includes('activeId'), 'Tabs.jsx must support activeId');
  assert.ok(tabsSource.includes('activeTab'), 'Tabs.jsx must support activeTab');

  const callerFiles = [
    path.join(__dirname, 'FarmPlanningView.jsx'),
    path.join(__dirname, 'MyFarmWorkspaceView.jsx'),
    path.join(__dirname, 'FarmerCropAdviceView.jsx'),
    path.join(__dirname, 'GlassComponents.jsx')
  ];

  for (const cf of callerFiles) {
    const src = fs.readFileSync(cf, 'utf-8');
    assert.ok(
      src.includes('items=') || src.includes('tabs='),
      `Caller ${path.basename(cf)} must pass items= or tabs=`
    );
  }
});

test('FIX 7: styles.css overhaul section does not set opaque background on .app-shell', () => {
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  const overhaulIdx = css.indexOf('/* === UI 2: App Shell');
  assert.ok(overhaulIdx !== -1, 'Overhaul UI 2 section must exist in styles.css');
  const overhaulCss = css.slice(overhaulIdx);
  const appShellMatch = overhaulCss.match(/\.app-shell\s*\{([^}]+)\}/);
  assert.ok(appShellMatch, '.app-shell rule must exist in overhaul section');
  const ruleBody = appShellMatch[1];
  assert.ok(!ruleBody.includes('background-color: var(--bg-deep)'), '.app-shell must not set opaque background-color: var(--bg-deep)');
  assert.ok(ruleBody.includes('background: transparent;'), '.app-shell must have background: transparent');
  assert.ok(ruleBody.includes('isolation: isolate;'), '.app-shell must have isolation: isolate');
});
