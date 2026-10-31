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

test('FIX 8: MyFarmWorkspaceView.jsx contains neither 24.8467 nor 89.3777', () => {
  const src = fs.readFileSync(path.join(__dirname, 'MyFarmWorkspaceView.jsx'), 'utf-8');
  assert.ok(!src.includes('24.8467'), 'MyFarmWorkspaceView.jsx must not contain 24.8467');
  assert.ok(!src.includes('89.3777'), 'MyFarmWorkspaceView.jsx must not contain 89.3777');
});

test('FIX 9: Marketing badges are absent and sidebar has responsive CSS rules', () => {
  const marketingBadges = [
    'RESTORED 6-SEASON OPTIMIZER',
    '100% 3D IMMERSIVE',
    'WEBGL 3D READY',
    'Gemini Decision Engine Live',
    'WebGL 3D Active',
    '3D Model Active'
  ];

  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        checkDir(fullPath);
      } else if (/\.(jsx?|css|html)$/.test(ent.name) && ent.name !== 'uiRegression.test.js') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const badge of marketingBadges) {
          assert.ok(
            !content.includes(badge),
            `File ${ent.name} must not contain marketing badge ${badge}`
          );
        }
      }
    }
  }

  checkDir(__dirname);

  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  assert.ok(css.includes('min-width: 1100px'), 'styles.css must include >= 1100px expanded sidebar rule');
  assert.ok(css.includes('min-width: 768px') && css.includes('1099.98px'), 'styles.css must include 768px - 1099px rail rule');
  assert.ok(css.includes('max-width: 767.98px'), 'styles.css must include < 768px mobile drawer rule');
});

test('FIX 10: ClayFarmScene exports bedAppearance returning { kind: "soil" } for empty plots, and DigitalTwin overlays are honest', () => {
  const claySrc = fs.readFileSync(path.join(__dirname, 'ClayFarmScene.jsx'), 'utf-8');
  assert.ok(claySrc.includes('export function bedAppearance'), 'ClayFarmScene.jsx must export bedAppearance');

  const fnMatch = claySrc.match(/export function bedAppearance\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'bedAppearance function body must be matchable');
  const fnCode = fnMatch[0].replace('export function bedAppearance', 'function bedAppearance') + '; return bedAppearance;';
  const bedAppearance = new Function(fnCode)();

  assert.deepEqual(bedAppearance({}), { kind: 'soil' });
  assert.deepEqual(bedAppearance(null), { kind: 'soil' });
  assert.deepEqual(bedAppearance({ crop: null }), { kind: 'soil' });
  assert.equal(bedAppearance({ crop: 'Rice' }).kind, 'crop');

  const twinSrc = fs.readFileSync(path.join(__dirname, 'DigitalTwin3DView.jsx'), 'utf-8');
  assert.ok(twinSrc.includes('disabled={!ov.live}'), 'DigitalTwin3DView must disable overlays without live telemetry');
  assert.ok(!twinSrc.includes('* খেতের ত্রিমাত্রিক রেন্ডারিং একটি বিজ্ঞানভিত্তিক সিমুলেশন'), 'DigitalTwin3DView must not render duplicate overlapping caption banner');
});

test('R1: Every .jsx file importing/calling React hooks must import each called hook from react or call React.hook', () => {
  const hooks = ['useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'useContext', 'useReducer', 'useLayoutEffect'];
  const violations = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath);
      } else if (ent.name.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const hook of hooks) {
          const hookCallRegex = new RegExp(`(?<!React\\.)\\b${hook}\\s*\\(`, 'g');
          if (hookCallRegex.test(content)) {
            const importRegex = new RegExp(`import\\s+[^;]*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s+from\\s+['"]react['"]`);
            if (!importRegex.test(content)) {
              violations.push(`${path.relative(__dirname, fullPath)} calls ${hook}() without importing ${hook} from 'react'`);
            }
          }
        }
      }
    }
  }

  scanDir(__dirname);
  assert.equal(violations.length, 0, `Missing hook imports detected:\n${violations.join('\n')}`);
});

test('R3: SixSeasonRecommendationView and sixSeasonEngine contain no Chickpea/Rice fallback literals, no 10.0 default, and use request client', () => {
  const viewSrc = fs.readFileSync(path.join(__dirname, 'SixSeasonRecommendationView.jsx'), 'utf-8');
  const engineSrc = fs.readFileSync(path.join(__dirname, 'sixSeasonEngine.js'), 'utf-8');

  assert.ok(!viewSrc.includes("fetch('/api/planning'"), 'View must not call fetch(/api/planning directly');
  assert.ok(viewSrc.includes("request('/api/planning'"), 'View must use request() client from apiClient.js');
  assert.ok(!viewSrc.includes('10.0'), 'View must not have 10.0 default area');
  assert.ok(!engineSrc.includes('10.0'), 'Engine must not have 10.0 default area');
  assert.ok(!viewSrc.includes("'Chickpea'"), 'View must not contain literal Chickpea');
  assert.ok(!viewSrc.includes("'Rice'"), 'View must not contain literal Rice');
  assert.ok(!engineSrc.includes("idx % 2 === 0 ? 'Chickpea' : 'Rice'"), 'Engine must not contain literal Chickpea/Rice fallback');
});

test('R4: Lag optimization: on-demand 3D rendering and glass surface cleanup', () => {
  const stylesSrc = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  const claySrc = fs.readFileSync(path.join(__dirname, 'ClayFarmScene.jsx'), 'utf-8');

  // 1. Asserts that .card / .panel in styles.css does NOT have active backdrop-filter
  const cardPanelBlocks = stylesSrc.match(/\.(?:card|panel|surface-card|farmer-card|ui-card-glass)\s*\{[^}]+\}/g) || [];
  for (const block of cardPanelBlocks) {
    assert.ok(
      !block.includes('backdrop-filter: blur') && !block.includes('backdrop-filter: var'),
      `Card/panel rule must not have active backdrop-filter: ${block}`
    );
  }

  // 2. Asserts total inline backdropFilter in frontend/src/**/*.jsx is 0 (or <= 2)
  let totalInlineBackdrop = 0;
  function countBackdropInDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        countBackdropInDir(fullPath);
      } else if (ent.name.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const matches = content.match(/backdropFilter\s*:/g);
        if (matches) totalInlineBackdrop += matches.length;
      }
    }
  }
  countBackdropInDir(__dirname);
  assert.ok(
    totalInlineBackdrop <= 2,
    `Total inline backdropFilter in JSX must be <= 2, found ${totalInlineBackdrop}`
  );

  // 3. Asserts ClayFarmScene does NOT run an unconditional infinite requestAnimationFrame without a stopping condition or uses on-demand rendering
  assert.ok(
    claySrc.includes("controls.addEventListener('change', render)"),
    'ClayFarmScene must implement on-demand rendering on controls change'
  );
  assert.ok(
    !claySrc.includes('const animate = () => {\n        animId = requestAnimationFrame(animate);\n        const delta = clock.getDelta();'),
    'ClayFarmScene must not have unconditional infinite 60fps animate loop'
  );
  assert.ok(
    claySrc.includes('4000') || claySrc.includes('cancelAnimationFrame'),
    'ClayFarmScene must cap intro animation or stop rendering when static'
  );
});

test('R5: Unified visual language for research pages', () => {
  const stylesSrc = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
  const researchViewSrc = fs.readFileSync(path.join(__dirname, 'ResearchWorkspaceView.jsx'), 'utf-8');

  // 1. Asserts [data-mode="research"] in styles.css does NOT define a grid background
  const bgMatch = stylesSrc.match(/\[data-mode=["']research["']\]\s*\.nasa-bg-layer\s*\{([^}]+)\}/);
  assert.ok(bgMatch, 'Must find [data-mode="research"] .nasa-bg-layer in styles.css');
  assert.ok(
    !bgMatch[1].includes('linear-gradient'),
    '[data-mode="research"] .nasa-bg-layer must not define a linear-gradient grid pattern'
  );

  // 2. Asserts .ui-card-hud::before is disabled or has content: none / empty in research mode
  assert.ok(
    stylesSrc.includes('.ui-card-hud::before') &&
    (stylesSrc.includes('content: none') || !stylesSrc.includes("content: ''") || stylesSrc.includes('display: none')),
    '.ui-card-hud::before must be disabled or have content: none'
  );

  // 3. Asserts ResearchWorkspaceView does NOT set textTransform: 'uppercase' on section headings
  assert.ok(
    !researchViewSrc.includes("textTransform: 'uppercase'"),
    "ResearchWorkspaceView must not set textTransform: 'uppercase' on section headings"
  );
  assert.ok(
    !researchViewSrc.includes('textTransform: "uppercase"'),
    'ResearchWorkspaceView must not set textTransform: "uppercase" on section headings'
  );
});

test('U1: Typography scale integrity - no inline data values with fontSize >= 32', () => {
  const synSrc = fs.readFileSync(path.join(__dirname, 'SyntheticDataLabView.jsx'), 'utf-8');
  const sixSrc = fs.readFileSync(path.join(__dirname, 'SixSeasonRecommendationView.jsx'), 'utf-8');
  const stylesSrc = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');

  // Verify no inline fontSize >= 32 on data values
  assert.ok(!synSrc.includes('fontSize: 32'), 'SyntheticDataLabView must not have fontSize 32 on data values');
  assert.ok(synSrc.includes('fontSize: 28, fontWeight: 600'), 'SyntheticDataLabView must use max 28/600 for reliability score');

  // Verify page titles use 24/600
  assert.ok(sixSrc.includes('fontSize: 24, fontWeight: 600'), 'SixSeasonRecommendationView page title must use 24/600');

  // Verify styles.css contains U1 type scale definitions
  assert.ok(stylesSrc.includes('font-size: 24px !important;'), 'styles.css must enforce 24px for page title');
  assert.ok(stylesSrc.includes('font-size: 16px !important;'), 'styles.css must enforce 16px for card title');
  assert.ok(stylesSrc.includes('line-height: 1.6 !important;'), 'styles.css must enforce 1.6 line-height for Bangla');
});

test('U2: Design tokens & layout integrity (1680px max-width, 44px tap targets, 390px mobile guard, semantic colors)', () => {
  const stylesSrc = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');

  // 1. Semantic color palette
  assert.ok(stylesSrc.includes('--u2-lime-primary: #10b981;'), 'Must define lime primary token');
  assert.ok(stylesSrc.includes('--u2-cyan-accent: #38bdf8;'), 'Must define cyan research token');
  assert.ok(stylesSrc.includes('--u2-amber-caution: #f59e0b;'), 'Must define amber caution token');
  assert.ok(stylesSrc.includes('--u2-red-alert: #ef4444;'), 'Must define red alert token');

  // 2. 1680px max width container rule
  assert.ok(stylesSrc.includes('max-width: 1680px !important;'), 'Must enforce max 1680px on page containers');

  // 3. 44px minimum tap targets
  assert.ok(stylesSrc.includes('min-height: 44px;'), 'Must enforce 44px minimum tap target height');

  // 4. Mobile 390px horizontal scroll prevention
  assert.ok(stylesSrc.includes('overflow-x: hidden !important;'), 'Must prevent horizontal overflow on mobile viewports');
});

test('U3: Farm Planning hero view integrity (Existing baseline + 3 strategies, 12-month calendar strip, 5-item card, priority highlight)', () => {
  const sixSrc = fs.readFileSync(path.join(__dirname, 'SixSeasonRecommendationView.jsx'), 'utf-8');
  const stylesSrc = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');

  // 1. Existing baseline column
  assert.ok(sixSrc.includes('বিদ্যমান আবর্তন (বেসলাইন)'), 'Must render existing baseline column');

  // 2. Priority highlight badge
  assert.ok(sixSrc.includes('সবচেয়ে উপযুক্ত আপনার অগ্রাধিকারে'), 'Must render best suited priority highlight');

  // 3. 12-month calendar strip directly on hero view
  assert.ok(sixSrc.includes('১২-মাসের ক্রপিং ক্যালেন্ডার স্ট্রিপ'), 'Must render 12-month continuous calendar strip');

  // 4. Deterministic 5-item card
  assert.ok(sixSrc.includes('কৌশল প্রোফাইল ও বৈজ্ঞানিক বিশ্লেষণ (৫-দফা মূল্যায়ন)'), 'Must render 5-item card');

  // 5. Mobile swipe cards rule in styles.css
  assert.ok(stylesSrc.includes('.strategy-columns-container'), 'Must define strategy-columns-container');
  assert.ok(stylesSrc.includes('scroll-snap-type: x mandatory !important;'), 'Must support mobile horizontal swipe cards');
});

test('U4: 3D plan viewer integrity (grass natural saturation #5f8f3c..#7aa84d, bare soil fallow, GTAOPass desktop, draw calls)', () => {
  const claySrc = fs.readFileSync(path.join(__dirname, 'ClayFarmScene.jsx'), 'utf-8');

  // 1. Natural grass color
  assert.ok(claySrc.includes('#6b9c44'), 'Must use lower saturation grass tone');

  // 2. Bare soil fallow handling in bedAppearance
  assert.ok(claySrc.includes("plot.crop === 'Fallow'"), 'bedAppearance must classify Fallow as bare soil');

  // 3. GTAOPass postprocessing
  assert.ok(claySrc.includes('GTAOPass'), 'Must import and configure GTAOPass');
  assert.ok(claySrc.includes('isDesktop'), 'Must restrict postprocessing to desktop');

  // 4. Draw calls reporting
  assert.ok(claySrc.includes('Draw calls:'), 'Must report draw calls');
});

test('U5: Unbacked marketing and status buzzwords removed and aligned with real state', () => {
  const parcelSrc = fs.readFileSync(path.join(__dirname, 'FieldParcelManagerView.jsx'), 'utf-8');
  assert.ok(!parcelSrc.includes("if (!d) return 'Ready';"), 'FieldParcelManagerView must not use Ready for missing date');
  assert.ok(!parcelSrc.includes('>Live Profile<'), 'FieldParcelManagerView must not claim Live Profile');
  assert.ok(parcelSrc.includes('Not Evaluated'), 'FieldParcelManagerView must use Not Evaluated');

  const dataEvidenceSrc = fs.readFileSync(path.join(__dirname, 'DataEvidenceView.jsx'), 'utf-8');
  assert.ok(!dataEvidenceSrc.includes("status: 'VERIFIED (+3.5 to +10.5 Days)'"), 'DataEvidenceView must not claim unbacked VERIFIED');
  assert.ok(dataEvidenceSrc.includes("status: 'Empirical (+3.5 to +10.5 Days)'"), 'DataEvidenceView must use Empirical');

  const climateMapSrc = fs.readFileSync(path.join(__dirname, 'BangladeshClimateMap.jsx'), 'utf-8');
  assert.ok(!climateMapSrc.includes('SCENARIO ENGINE'), 'BangladeshClimateMap must not use SCENARIO ENGINE');
  assert.ok(climateMapSrc.includes('SCENARIO MODEL'), 'BangladeshClimateMap must use SCENARIO MODEL');

  const farmPlanSrc = fs.readFileSync(path.join(__dirname, 'FarmPlanningView.jsx'), 'utf-8');
  assert.ok(farmPlanSrc.includes('PuLP MILP Optimization Model'), 'FarmPlanningView must use PuLP MILP Optimization Model');

  const i18nSrc = fs.readFileSync(path.join(__dirname, 'i18n.js'), 'utf-8');
  assert.ok(!i18nSrc.includes('NASA Live Weather'), 'i18n must not claim Live Weather');
  assert.ok(i18nSrc.includes('NASA Weather Observation'), 'i18n must use NASA Weather Observation');

  const mainSrc = fs.readFileSync(path.join(__dirname, 'main.jsx'), 'utf-8');
  assert.ok(!mainSrc.includes('<span>Drainage</span>\r\n                              <strong>100%</strong>') && !mainSrc.includes('<span>Drainage</span>\n                              <strong>100%</strong>'), 'main.jsx must not claim unbacked 100% Drainage');
});
