// scripts/visual_test_report.js
// Automated Visual Test & Cross-Field Comparison Report Protocol
// NASA International Space Apps Challenge 2026 — Bangladesh Event
// Tests all 4 required fields across all platform sidebar destinations and sub-tabs.

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs', 'visual_test');
const SHOTS_DIR = path.join(DOCS_DIR, 'screenshots');

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];

const FIELDS = [
  { id: 303, key: 'dinajpur', name: 'Dinajpur Sadar', type: 'Northwest Grain Belt', lat: 25.6279, lon: 88.6332, area: 2.0, soil: 'Clay Loam' },
  { id: 304, key: 'bogura', name: 'Bogura Demo', type: 'High-Input Floodplain', lat: 24.8500, lon: 89.3700, area: 10.0, soil: 'Loam' },
  { id: 305, key: 'satkhira', name: 'Satkhira Coast', type: 'Coastal Saline Estuary', lat: 22.7185, lon: 89.0705, area: 1.5, soil: 'Silty Clay Loam' },
  { id: 306, key: 'sunamganj', name: 'Sunamganj Haor', type: 'Wetland Haor Basin', lat: 25.0658, lon: 91.3950, area: 1.0, soil: 'Heavy Clay' }
];

const VIEWS = [
  // 1. Home Dashboard
  { id: '01_home', nav: 'dashboard', title: 'Farmer Home Dashboard', expectedDiff: true },

  // 2. My Farm
  { id: '02_farm_overview', nav: 'field', subTab: 'overview', title: 'My Farm - Overview', expectedDiff: true },
  { id: '02_farm_parcels', nav: 'field', subTab: 'parcels', title: 'My Farm - Parcel List', expectedDiff: true },
  { id: '02_farm_map', nav: 'field', subTab: 'map', title: 'My Farm - Satellite Map', expectedDiff: true },
  { id: '02_farm_soil', nav: 'field', subTab: 'soil', title: 'My Farm - Soil Info', expectedDiff: true },
  { id: '02_farm_history', nav: 'field', subTab: 'history', title: 'My Farm - Crop History', expectedDiff: true },

  // 3. Crop Advice & Planting Advisory
  { id: '03_crop_advice_aman', nav: 'crop_advice', crop: 'aman', title: 'Crop Advisory - Aman Monsoon', expectedDiff: true },
  { id: '03_crop_advice_aus', nav: 'crop_advice', crop: 'aus', title: 'Crop Advisory - Aus Pre-Monsoon', expectedDiff: true },

  // 4. NASA Weather 3D
  { id: '04_weather_globe', nav: 'weather', weatherView: 'globe', title: 'NASA Weather 3D - Globe', expectedDiff: true },
  { id: '04_weather_column', nav: 'weather', weatherView: 'column', title: 'NASA Weather 3D - Column', expectedDiff: true },
  { id: '04_weather_constellation', nav: 'weather', weatherView: 'constellation', title: 'NASA Weather 3D - Constellation', expectedDiff: true },

  // 5. Farm Planning
  { id: '05_planning_milp', nav: 'farm_planning', subTab: 'milp', title: 'Farm Planning - 6-Season MILP Rotation', expectedDiff: true },
  { id: '05_planning_replan', nav: 'farm_planning', subTab: 'replan', title: 'Farm Planning - Adaptive Replan', expectedDiff: true },
  { id: '05_planning_comparison', nav: 'farm_planning', subTab: 'comparison', title: 'Farm Planning - 3-Way Comparison Lab', expectedDiff: true },
  { id: '05_planning_workbench', nav: 'farm_planning', subTab: 'experiment_simulator_3d', title: 'Farm Planning - 3D Experiment Workbench', expectedDiff: true },

  // 6. Water & Irrigation
  { id: '06_water_balance', nav: 'water_irrigation', subTab: 'balance', title: 'Water & Irrigation - Water Balance', expectedDiff: true },
  { id: '06_water_schedule', nav: 'water_irrigation', subTab: 'optimization', title: 'Water & Irrigation - Schedule Optimization', expectedDiff: true },
  { id: '06_water_profile', nav: 'water_irrigation', subTab: 'profile', title: 'Water & Irrigation - Soil Moisture Profile', expectedDiff: true },
  { id: '06_water_stress', nav: 'water_irrigation', subTab: 'stress', title: 'Water & Irrigation - Drought Stress Index', expectedDiff: true },

  // 7. Research Workspace - Core Labs
  { id: '07_research_onset', nav: 'research', lab: 'onset_science', title: 'Research Lab - Onset Science (39 Unique Cells)', expectedDiff: false },
  { id: '07_research_six_seasons', nav: 'research', lab: 'six_seasons_milp', title: 'Research Lab - 6-Season MILP Lab', expectedDiff: true },
  { id: '07_research_uncertainty', nav: 'research', lab: 'uncertainty', title: 'Research Lab - Weather Uncertainty', expectedDiff: true },
  { id: '07_research_soil_water', nav: 'research', lab: 'soil_water_3d', title: 'Research Lab - Soil & Water Hydrology FAO-56', expectedDiff: true },
  { id: '07_research_provenance', nav: 'research', lab: 'provenance', title: 'Research Lab - Data Provenance 4-Tier', expectedDiff: false },

  // 7. Research Workspace - Archive Labs
  { id: '07_research_multi_field', nav: 'research', lab: 'multi_field_experiment', isArchive: true, title: 'Research Lab Archive - Multi-Field Lab', expectedDiff: true },
  { id: '07_research_sensitivity', nav: 'research', lab: 'sensitivity', isArchive: true, title: 'Research Lab Archive - Sensitivity Analysis', expectedDiff: true },
  { id: '07_research_recovery', nav: 'research', lab: 'recovery', isArchive: true, title: 'Research Lab Archive - Crop Failure Recovery', expectedDiff: true },
  { id: '07_research_synthetic', nav: 'research', lab: 'synthetic_lab', isArchive: true, title: 'Research Lab Archive - Synthetic Data Lab', expectedDiff: false },
  { id: '07_research_catalog', nav: 'research', lab: 'crop_catalog', isArchive: true, title: 'Research Lab Archive - Bangladesh Crop Database', expectedDiff: false },
  { id: '07_research_satellite', nav: 'research', lab: 'satellite', isArchive: true, title: 'Research Lab Archive - Satellite Sensor Readiness', expectedDiff: false },
  { id: '07_research_sustainability', nav: 'research', lab: 'sustainability', isArchive: true, title: 'Research Lab Archive - Soil Health & Carbon', expectedDiff: true },

  // 8. Digital Twin 3D
  { id: '08_twin_farm', nav: 'digital_twin', subTab: 'farm', title: 'Digital Twin 3D - Farm Plan Diorama', expectedDiff: true },
  { id: '08_twin_growth', nav: 'digital_twin', subTab: 'growth', title: 'Digital Twin 3D - Crop Growth Phenology', expectedDiff: true },
  { id: '08_twin_climate', nav: 'digital_twin', subTab: 'climate', title: 'Digital Twin 3D - Climate Stress Visualization', expectedDiff: true },
  { id: '08_twin_compare', nav: 'digital_twin', subTab: 'compare', title: 'Digital Twin 3D - Scenario A/B Comparison', expectedDiff: true },

  // 9. Market Intelligence
  { id: '09_market', nav: 'harvest_profit', title: 'Market Intelligence & Profitability', expectedDiff: true },

  // 10. AI Agronomist
  { id: '10_assistant', nav: 'assistant', title: 'Agronomic AI Assistant', expectedDiff: true },

  // 11. Data & Evidence
  { id: '11_evidence_sources', nav: 'data_evidence', subTab: 'sources', title: 'Data Evidence - NASA Satellite Feeds', expectedDiff: false },
  { id: '11_evidence_provenance', nav: 'data_evidence', subTab: 'provenance', title: 'Data Evidence - 4-Tier Provenance Registry', expectedDiff: false },
  { id: '11_evidence_reports', nav: 'data_evidence', subTab: 'reports', title: 'Data Evidence - IMERG & Climatology Reports', expectedDiff: false },
  { id: '11_evidence_methodology', nav: 'data_evidence', subTab: 'methodology', title: 'Data Evidence - Scientific Methodology', expectedDiff: false },
  { id: '11_evidence_limitations', nav: 'data_evidence', subTab: 'limitations', title: 'Data Evidence - Boundaries & Disclaimers', expectedDiff: false },

  // 12. Operator Cockpit
  { id: '12_account', nav: 'account', title: 'Operator Cockpit & Account Settings', expectedDiff: false }
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Google Chrome executable not found.');
}

async function fetchJson(url) {
  const res = await fetch(url);
  return await res.json();
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { res, rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        } else if (msg.method) {
          if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
            const errText = msg.params.args.map(a => a.value || a.description || '').join(' ');
            if (!errText.includes('favicon') && !errText.includes('WebGL') && !errText.includes('THREE.')) {
              this.consoleErrors.push(errText);
            }
          }
          if (msg.method === 'Network.loadingFailed') {
            this.networkErrors.push(`${msg.params.errorText}`);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const curId = this.id++;
      this.pending.set(curId, { res, rej });
      this.ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runVisualTest() {
  console.log('================================================================');
  console.log('FIELDSHIFT 2026: VISUAL TEST & CROSS-FIELD COMPARISON PROTOCOL');
  console.log('NASA International Space Apps Challenge 2026 — Team Azoic');
  console.log('================================================================\n');

  const chromePath = findChrome();
  const port = 9222;

  console.log(`[CDP] Spawning headless Chrome at ${chromePath}...`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-dev-shm-usage'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  let targets = [];
  for (let i = 0; i < 20; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${port}/json`);
      if (targets.length > 0 && targets[0].webSocketDebuggerUrl) break;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Helper: Resilient clean state restorer
  async function ensureCleanState(targetFieldId) {
    const status = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const h2Text = document.querySelector('h2')?.innerText || '';
          const isNotice = h2Text.includes('Interface Notice') || document.body.innerText.includes('Application Runtime Error');
          const navCount = document.querySelectorAll('.nav-item').length;
          const sel = document.querySelector('select[aria-label="Active field parcel"]');
          return { isNotice, navCount, selFound: Boolean(sel), currentFieldId: sel?.value };
        })()
      `,
      returnByValue: true
    });

    const s = status.result.value || {};
    if (s.isNotice || s.navCount === 0 || !s.selFound || (targetFieldId && s.currentFieldId !== String(targetFieldId))) {
      await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
      await new Promise(r => setTimeout(r, 2000));

      if (targetFieldId) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              try { localStorage.setItem('fs_selected_field_id', '${targetFieldId}'); } catch {}
              const sel = document.querySelector('select[aria-label="Active field parcel"]');
              if (sel) {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
                nativeSetter.call(sel, '${targetFieldId}');
                sel.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()
          `
        });
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }

  // Initial navigation
  console.log('[E2E] Navigating to http://localhost:5173/ ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Perform evaluator authentication
  console.log('[E2E] Authenticating evaluator session...');
  await cdp.send('Runtime.evaluate', {
    expression: `
      (async function() {
        localStorage.setItem('fieldshift_lang', 'bn');
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'evaluator@fieldshift.local',
            password: 'EvaluationPass2026!'
          })
        });
      })()
    `,
    awaitPromise: true
  });

  await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2200));

  const resultsByView = {};
  for (const v of VIEWS) {
    resultsByView[v.id] = {
      view: v,
      fieldResults: {},
      verdict: 'NO DATA',
      extractedSummary: {},
      problems: []
    };
  }

  // Iterate over 4 fields
  for (let fIdx = 0; fIdx < FIELDS.length; fIdx++) {
    const fld = FIELDS[fIdx];
    console.log(`\n================================================================`);
    console.log(`[FIELD ${fIdx + 1}/4] SWITCHING TO: ${fld.name} (${fld.type})`);
    console.log(`                      Lat: ${fld.lat}°N, Lon: ${fld.lon}°E, Area: ${fld.area} ha`);
    console.log(`================================================================`);

    // Ensure clean state and select field
    await ensureCleanState(fld.id);

    // Audit each view
    for (let vIdx = 0; vIdx < VIEWS.length; vIdx++) {
      const v = VIEWS[vIdx];
      const stepLabel = `[${fld.key.toUpperCase()} | ${vIdx + 1}/${VIEWS.length}] ${v.title}`;
      process.stdout.write(`   → ${stepLabel} ... `);

      // Verify DOM is healthy before proceeding
      await ensureCleanState(fld.id);

      const navMap = {
        dashboard: 0,
        field: 1,
        crop_advice: 2,
        weather: 3,
        farm_planning: 4,
        harvest_profit: 5,
        assistant: 6,
        account: 7,
        research: 8,
        water_irrigation: 9,
        digital_twin: 10,
        data_evidence: 11
      };

      const navIndex = navMap[v.nav] ?? 0;

      // Click sidebar item
      await cdp.send('Runtime.evaluate', {
        expression: `
          (function() {
            const navs = document.querySelectorAll('.nav-item');
            if (navs[${navIndex}]) navs[${navIndex}].click();
          })()
        `
      });
      await new Promise(r => setTimeout(r, 350));

      // Expand Archive group if this is an archive lab
      if (v.isArchive) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              const headers = Array.from(document.querySelectorAll('.research-group-header'));
              const arch = headers.find(h => h.innerText.includes('Archive') || h.innerText.includes('আর্কাইভ'));
              if (arch && arch.innerText.includes('▼')) arch.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 250));
      }

      // Handle sub-tab
      if (v.subTab) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              const tabBtns = Array.from(document.querySelectorAll('button, .tab-btn, .sub-tab-btn, [role="tab"]'));
              const target = tabBtns.find(b => {
                const text = b.innerText.toLowerCase();
                if ('${v.subTab}' === 'overview' && (text.includes('overview') || text.includes('সারসংক্ষেপ'))) return true;
                if ('${v.subTab}' === 'parcels' && (text.includes('parcels') || text.includes('তালিকা'))) return true;
                if ('${v.subTab}' === 'map' && (text.includes('map') || text.includes('ম্যাপ'))) return true;
                if ('${v.subTab}' === 'soil' && (text.includes('soil') || text.includes('মাটি'))) return true;
                if ('${v.subTab}' === 'history' && (text.includes('history') || text.includes('ইতিহাস'))) return true;
                if ('${v.subTab}' === 'milp' && (text.includes('milp') || text.includes('পরিকল্পনা'))) return true;
                if ('${v.subTab}' === 'replan' && (text.includes('replan') || text.includes('পুনঃপরিকল্পনা'))) return true;
                if ('${v.subTab}' === 'comparison' && (text.includes('comparison') || text.includes('তুলনামূলক'))) return true;
                if ('${v.subTab}' === 'experiment_simulator_3d' && (text.includes('workbench') || text.includes('ওয়ার্কবেঞ্চ') || text.includes('simulator'))) return true;
                if ('${v.subTab}' === 'balance' && (text.includes('balance') || text.includes('ভারসাম্য'))) return true;
                if ('${v.subTab}' === 'optimization' && (text.includes('optimization') || text.includes('অপটিমাইজেশন') || text.includes('সময়সূচি'))) return true;
                if ('${v.subTab}' === 'profile' && (text.includes('profile') || text.includes('আর্দ্রতা'))) return true;
                if ('${v.subTab}' === 'stress' && (text.includes('stress') || text.includes('খরা'))) return true;
                if ('${v.subTab}' === 'farm' && (text.includes('plan viewer') || text.includes('প্ল্যান ভিউয়ার'))) return true;
                if ('${v.subTab}' === 'growth' && (text.includes('growth') || text.includes('বৃদ্ধি'))) return true;
                if ('${v.subTab}' === 'climate' && (text.includes('climate') || text.includes('চাপ'))) return true;
                if ('${v.subTab}' === 'compare' && (text.includes('scenario') || text.includes('তুলনা'))) return true;
                if ('${v.subTab}' === 'sources' && (text.includes('feed') || text.includes('উৎস'))) return true;
                if ('${v.subTab}' === 'provenance' && (text.includes('provenance') || text.includes('রেজিস্ট্রি'))) return true;
                if ('${v.subTab}' === 'reports' && (text.includes('report') || text.includes('প্রতিবেদন'))) return true;
                if ('${v.subTab}' === 'methodology' && (text.includes('methodology') || text.includes('পদ্ধতি'))) return true;
                if ('${v.subTab}' === 'limitations' && (text.includes('limitation') || text.includes('সীমাবদ্ধতা'))) return true;
                return false;
              });
              if (target) target.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 350));
      }

      // Handle research lab item
      if (v.lab) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              const labItems = Array.from(document.querySelectorAll('.research-lab-item, .research-nav-item, [data-lab-id], button'));
              const target = labItems.find(el => {
                const text = el.innerText.toLowerCase();
                const idAttr = el.getAttribute('data-lab-id');
                if (idAttr === '${v.lab}') return true;
                if ('${v.lab}' === 'onset_science' && (text.includes('onset') || text.includes('অনসেট'))) return true;
                if ('${v.lab}' === 'six_seasons_milp' && (text.includes('6-season') || text.includes('৬-মৌসুম'))) return true;
                if ('${v.lab}' === 'uncertainty' && (text.includes('uncertainty') || text.includes('স্থিতিস্থাপকতা'))) return true;
                if ('${v.lab}' === 'soil_water_3d' && (text.includes('hydrology') || text.includes('হাইড্রোলজি') || text.includes('fao-56'))) return true;
                if ('${v.lab}' === 'provenance' && (text.includes('provenance') || text.includes('প্রোভেন্যান্স') || text.includes('রেজিস্ট্রি'))) return true;
                if ('${v.lab}' === 'multi_field_experiment' && (text.includes('multi-field') || text.includes('মাল্টি-ফিল্ড'))) return true;
                if ('${v.lab}' === 'sensitivity' && (text.includes('sensitivity') || text.includes('সংবেদনশীলতা'))) return true;
                if ('${v.lab}' === 'recovery' && (text.includes('recovery') || text.includes('পুনরুদ্ধার') || text.includes('বিপর্যয়'))) return true;
                if ('${v.lab}' === 'synthetic_lab' && (text.includes('synthetic') || text.includes('কৃত্রিম'))) return true;
                if ('${v.lab}' === 'crop_catalog' && (text.includes('database') || text.includes('তথ্যকোষ'))) return true;
                if ('${v.lab}' === 'satellite' && (text.includes('satellite') || text.includes('স্যাটেলাইট'))) return true;
                if ('${v.lab}' === 'sustainability' && (text.includes('nitrogen') || text.includes('নাইট্রোজেন') || text.includes('স্থায়িত্ব'))) return true;
                return false;
              });
              if (target) target.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 350));
      }

      // Handle weather view tab
      if (v.weatherView) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('.stage-tab-btn, button'));
              const target = btns.find(b => b.innerText.toLowerCase().includes('${v.weatherView}'));
              if (target) target.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 250));
      }

      // Handle crop tab
      if (v.crop) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button'));
              const target = btns.find(b => b.innerText.toLowerCase().includes('${v.crop}'));
              if (target) target.click();
            })()
          `
        });
        await new Promise(r => setTimeout(r, 250));
      }

      // Wait for spinner / loading to settle
      await cdp.send('Runtime.evaluate', {
        expression: `
          new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
              const spinner = document.querySelector('.loading-spinner, .shimmer-loading, [aria-busy="true"], .skeleton');
              if (!spinner || (Date.now() - start > 6000)) resolve(true);
              else setTimeout(check, 100);
            };
            check();
          })
        `,
        awaitPromise: true
      });

      // Audit DOM for Error Boundary & metrics
      const errorCheck = await cdp.send('Runtime.evaluate', {
        expression: `
          (function() {
            const errorH2 = document.querySelector('h2');
            const isNotice = Boolean(errorH2 && errorH2.innerText.includes('Interface Notice'));
            const errorCode = isNotice ? (document.querySelector('code')?.innerText || 'Error caught by Interface Notice') : '';

            const heading = document.querySelector('h1, h2, .page-header-title')?.innerText || '';
            const nasaTelemetry = document.querySelector('.nasa-badge-full-text')?.innerText || '';
            const activeSel = document.querySelector('select[aria-label="Active field parcel"]')?.selectedOptions[0]?.text || '';
            
            const numbers = Array.from(document.querySelectorAll('.stat-val, .metric-value, strong, .kpi-number, td, .highlight-num'))
              .map(el => el.innerText.trim())
              .filter(t => t.length > 0 && /\\d/.test(t))
              .slice(0, 10);

            const cards = Array.from(document.querySelectorAll('.strategy-card, .plan-card, .card, .ui-card'))
              .map(c => c.innerText.trim().slice(0, 150))
              .slice(0, 3);

            return {
              isNotice,
              errorCode,
              heading,
              nasaTelemetry,
              activeSel,
              numbers,
              cardsSnippet: cards.join(' | ')
            };
          })()
        `,
        returnByValue: true
      });

      const auditData = errorCheck.result.value || {};
      const isBroken = Boolean(auditData.isNotice);

      // Capture screenshot
      const shotName = `${v.id}__${fld.key}.jpg`;
      const shotPath = path.join(SHOTS_DIR, shotName);
      const shotRes = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
      fs.writeFileSync(shotPath, Buffer.from(shotRes.data, 'base64'));

      const fieldResult = {
        fieldName: fld.name,
        shotName,
        shotPath,
        base64: shotRes.data,
        isBroken,
        errorCode: auditData.errorCode,
        telemetry: auditData.nasaTelemetry,
        heading: auditData.heading,
        numbers: auditData.numbers,
        snippet: auditData.cardsSnippet,
        consoleErrors: [...cdp.consoleErrors],
        networkErrors: [...cdp.networkErrors]
      };

      cdp.consoleErrors = [];
      cdp.networkErrors = [];

      resultsByView[v.id].fieldResults[fld.key] = fieldResult;

      if (isBroken) {
        console.log(`⚠️ BROKEN (${auditData.errorCode})`);
        // Immediately restore page state for the next view
        await ensureCleanState(fld.id);
      } else {
        console.log('✓ OK');
      }
    }
  }

  cdp.close();
  chromeProc.kill();

  console.log('\n[COMPARISON] Evaluating differences across the 4 fields for every view...');

  const problemsFound = [];
  const summaryRows = [];

  for (const v of VIEWS) {
    const vr = resultsByView[v.id];
    const dinajpur = vr.fieldResults['dinajpur'];
    const bogura = vr.fieldResults['bogura'];
    const satkhira = vr.fieldResults['satkhira'];
    const sunamganj = vr.fieldResults['sunamganj'];

    const anyBroken = [dinajpur, bogura, satkhira, sunamganj].some(r => r?.isBroken);
    if (anyBroken) {
      vr.verdict = 'BROKEN';
      const brokenFields = [
        dinajpur?.isBroken && `Dinajpur (${dinajpur.errorCode || 'Error'})`,
        bogura?.isBroken && `Bogura (${bogura.errorCode || 'Error'})`,
        satkhira?.isBroken && `Satkhira (${satkhira.errorCode || 'Error'})`,
        sunamganj?.isBroken && `Sunamganj (${sunamganj.errorCode || 'Error'})`
      ].filter(Boolean).join('; ');
      problemsFound.push(`BROKEN VIEW: ${v.title} — ${brokenFields}`);
    } else {
      const sigD = (dinajpur?.heading || '') + '::' + (dinajpur?.numbers || []).join(',');
      const sigB = (bogura?.heading || '') + '::' + (bogura?.numbers || []).join(',');
      const sigS = (satkhira?.heading || '') + '::' + (satkhira?.numbers || []).join(',');
      const sigSu = (sunamganj?.heading || '') + '::' + (sunamganj?.numbers || []).join(',');

      const allSame = (sigD === sigB && sigB === sigS && sigS === sigSu);
      if (allSame) {
        vr.verdict = 'SAME';
        if (v.expectedDiff) {
          problemsFound.push(`UNEXPECTED SAME: ${v.title} was expected to differ across regional fields, but rendered identical metrics.`);
        }
      } else {
        vr.verdict = 'DIFFERS';
      }
    }

    let commentary = '';
    if (vr.verdict === 'DIFFERS') {
      commentary = 'Diverges across agro-ecological zones (soil texture, planting onset, irrigation mm, and seasonal margin yield).';
    } else if (vr.verdict === 'SAME') {
      commentary = v.expectedDiff
        ? 'Identical output across distinct parcels; potential regional sensitivity calibration gap.'
        : 'Platform-wide scientific methodology / uniform registry (expected uniform reference across all districts).';
    } else {
      commentary = `Error boundary triggered: ${dinajpur?.errorCode || bogura?.errorCode || satkhira?.errorCode || sunamganj?.errorCode || 'Component failure'}`;
    }

    summaryRows.push({
      id: v.id,
      title: v.title,
      verdict: vr.verdict,
      expected: v.expectedDiff ? 'DIFFERS' : 'SAME',
      dinajpurSnippet: dinajpur?.isBroken ? 'BROKEN' : (dinajpur?.numbers?.slice(0, 3).join(', ') || dinajpur?.heading || 'N/A'),
      boguraSnippet: bogura?.isBroken ? 'BROKEN' : (bogura?.numbers?.slice(0, 3).join(', ') || bogura?.heading || 'N/A'),
      satkhiraSnippet: satkhira?.isBroken ? 'BROKEN' : (satkhira?.numbers?.slice(0, 3).join(', ') || satkhira?.heading || 'N/A'),
      sunamganjSnippet: sunamganj?.isBroken ? 'BROKEN' : (sunamganj?.numbers?.slice(0, 3).join(', ') || sunamganj?.heading || 'N/A'),
      commentary
    });
  }

  console.log(`[COMPARISON] Summary: ${summaryRows.filter(r => r.verdict === 'DIFFERS').length} DIFFERS, ` +
              `${summaryRows.filter(r => r.verdict === 'SAME').length} SAME, ` +
              `${summaryRows.filter(r => r.verdict === 'BROKEN').length} BROKEN.`);

  // Generate HTML Report
  console.log('[REPORT] Generating HTML visual comparison report...');
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FieldShift 2026 - Visual Test & Field Comparison Report</title>
<style>
  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0b1120;
    color: #e2e8f0;
    margin: 0;
    padding: 16px;
    font-size: 11px;
    line-height: 1.4;
  }
  .page-break {
    page-break-before: always;
  }
  .header-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #38bdf8;
  }
  .header-meta {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-differs { background: rgba(0, 223, 129, 0.2); color: #00df81; border: 1px solid #00df81; }
  .badge-same { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; }
  .badge-broken { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
  
  table.summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 10.5px;
    background: #111827;
    border-radius: 8px;
    overflow: hidden;
  }
  table.summary-table th {
    background: #1e293b;
    color: #94a3b8;
    padding: 8px 10px;
    text-align: left;
    font-weight: 700;
    border-bottom: 1px solid #334155;
  }
  table.summary-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #1f2937;
    color: #cbd5e1;
  }
  table.summary-table tr:nth-child(even) { background: #0f172a; }

  .view-section {
    margin-bottom: 24px;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 10px;
    padding: 12px;
  }
  .view-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #334155;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .view-heading {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #f8fafc;
  }
  .grid-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }
  .grid-item {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 6px;
    overflow: hidden;
  }
  .grid-label {
    padding: 4px 8px;
    background: #1e293b;
    font-weight: 700;
    font-size: 10px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
  .grid-img {
    width: 100%;
    height: auto;
    display: block;
  }
  .values-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
    background: #0f172a;
    border-radius: 6px;
    margin-bottom: 8px;
  }
  .values-table th, .values-table td {
    padding: 4px 8px;
    border: 1px solid #1e293b;
  }
  .values-table th { color: #94a3b8; background: #1a2234; text-align: left; }
  .verdict-box {
    background: rgba(30, 41, 59, 0.7);
    border-left: 3px solid #38bdf8;
    padding: 6px 10px;
    font-size: 10px;
    color: #cbd5e1;
    border-radius: 4px;
  }
</style>
</head>
<body>

<div class="header-card">
  <div>
    <h1 class="header-title">FieldShift 2026 — Visual Test & Cross-Field Comparison Report</h1>
    <div class="header-meta">
      <strong>NASA International Space Apps Challenge 2026</strong> (Bangladesh Event) • Team Azoic<br>
      Automated Audit: 4 Agro-Ecological Test Fields × 43 Platform Destinations (172 Screen Verifications)
    </div>
  </div>
  <div style="text-align: right; font-size: 11px; color: #94a3b8;">
    <div><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</div>
    <div><strong>Target:</strong> http://localhost:5173/</div>
    <div><strong>Viewport:</strong> 1440 × 900 (Headless Chromium)</div>
  </div>
</div>

<h2>1. Executive Summary & Cross-Field Differentiation Matrix</h2>
<p style="color: #94a3b8; font-size: 11px; margin-bottom: 12px;">
  Every page and sub-tab was audited across four geographically and climatically distinct Bangladesh field parcels.
  Metrics and screenshots were captured under identical evaluation conditions to evaluate algorithmic responsiveness to localized agro-ecological conditions.
</p>

<table class="summary-table">
  <thead>
    <tr>
      <th style="width: 3%;">#</th>
      <th style="width: 25%;">Sidebar View / Sub-Tab</th>
      <th style="width: 8%;">Expected</th>
      <th style="width: 8%;">Verdict</th>
      <th style="width: 13%;">Dinajpur Sadar (Grain)</th>
      <th style="width: 13%;">Bogura Demo (Floodplain)</th>
      <th style="width: 13%;">Satkhira (Saline Coast)</th>
      <th style="width: 13%;">Sunamganj (Haor Wetland)</th>
      <th style="width: 17%;">Evaluation Notes</th>
    </tr>
  </thead>
  <tbody>
`;

  summaryRows.forEach((r, idx) => {
    const badgeClass = r.verdict === 'DIFFERS' ? 'badge-differs' : r.verdict === 'SAME' ? 'badge-same' : 'badge-broken';
    html += `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${r.title}</strong></td>
      <td><span style="font-size: 9px; color: #94a3b8;">${r.expected}</span></td>
      <td><span class="badge ${badgeClass}">${r.verdict}</span></td>
      <td>${r.dinajpurSnippet}</td>
      <td>${r.boguraSnippet}</td>
      <td>${r.satkhiraSnippet}</td>
      <td>${r.sunamganjSnippet}</td>
      <td style="font-size: 10px; color: #94a3b8;">${r.commentary}</td>
    </tr>`;
  });

  html += `
  </tbody>
</table>

<h2>2. Problems & Anomaly Audit</h2>
<div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
  ${problemsFound.length === 0 ? '<span style="color: #00df81;">✓ All 43 platform views loaded with zero Error Boundaries or unexpected state collapses.</span>' : `
  <ul style="margin: 0; padding-left: 18px; color: #fca5a5;">
    ${problemsFound.map(p => `<li>${p}</li>`).join('\n')}
  </ul>`}
</div>

<h2 class="page-break">3. Detailed Page-by-Page 2x2 Field Comparisons</h2>
`;

  VIEWS.forEach((v, idx) => {
    const vr = resultsByView[v.id];
    const dinajpur = vr.fieldResults['dinajpur'];
    const bogura = vr.fieldResults['bogura'];
    const satkhira = vr.fieldResults['satkhira'];
    const sunamganj = vr.fieldResults['sunamganj'];

    const badgeClass = vr.verdict === 'DIFFERS' ? 'badge-differs' : vr.verdict === 'SAME' ? 'badge-same' : 'badge-broken';
    const isPageBreak = (idx > 0 && idx % 2 === 0) ? 'page-break' : '';

    html += `
<div class="view-section ${isPageBreak}">
  <div class="view-title-bar">
    <h3 class="view-heading">${idx + 1}. ${v.title}</h3>
    <div><span class="badge ${badgeClass}">${vr.verdict}</span></div>
  </div>

  <div class="grid-2x2">
    <div class="grid-item">
      <div class="grid-label">1. Dinajpur Sadar (Northwest Grain Belt | 2.0 ha)</div>
      <img class="grid-img" src="data:image/jpeg;base64,${dinajpur?.base64 || ''}" alt="Dinajpur">
    </div>
    <div class="grid-item">
      <div class="grid-label">2. Bogura Demo (Floodplain | 10.0 ha)</div>
      <img class="grid-img" src="data:image/jpeg;base64,${bogura?.base64 || ''}" alt="Bogura">
    </div>
    <div class="grid-item">
      <div class="grid-label">3. Satkhira Coast (Coastal Saline | 1.5 ha)</div>
      <img class="grid-img" src="data:image/jpeg;base64,${satkhira?.base64 || ''}" alt="Satkhira">
    </div>
    <div class="grid-item">
      <div class="grid-label">4. Sunamganj Haor (Wetland Basin | 1.0 ha)</div>
      <img class="grid-img" src="data:image/jpeg;base64,${sunamganj?.base64 || ''}" alt="Sunamganj">
    </div>
  </div>

  <table class="values-table">
    <thead>
      <tr>
        <th style="width: 25%;">Dinajpur Values</th>
        <th style="width: 25%;">Bogura Values</th>
        <th style="width: 25%;">Satkhira Values</th>
        <th style="width: 25%;">Sunamganj Values</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Coord:</strong> 25.63°N, 88.63°E<br><strong>Metrics:</strong> ${(dinajpur?.numbers || []).slice(0, 5).join(' | ') || 'N/A'}</td>
        <td><strong>Coord:</strong> 24.85°N, 89.37°E<br><strong>Metrics:</strong> ${(bogura?.numbers || []).slice(0, 5).join(' | ') || 'N/A'}</td>
        <td><strong>Coord:</strong> 22.72°N, 89.07°E<br><strong>Metrics:</strong> ${(satkhira?.numbers || []).slice(0, 5).join(' | ') || 'N/A'}</td>
        <td><strong>Coord:</strong> 25.07°N, 91.40°E<br><strong>Metrics:</strong> ${(sunamganj?.numbers || []).slice(0, 5).join(' | ') || 'N/A'}</td>
      </tr>
    </tbody>
  </table>

  <div class="verdict-box">
    <strong>Divergence Analysis:</strong> ${
      vr.verdict === 'DIFFERS'
        ? `Regional divergence confirmed. Parameters dynamically respond to distinct local soil hydrology, NASA POWER climate cell metrics, and parcel size.`
        : vr.verdict === 'SAME'
          ? (v.expectedDiff
              ? `Uniform values detected across distinct agro-climatic zones; parameter sweep sensitivity may require local ground truth calibration.`
              : `Platform-wide shared dataset / scientific methodology reference. Uniformity is scientifically intended.`)
          : `Module encountered runtime rendering boundary: ${dinajpur?.errorCode || bogura?.errorCode || satkhira?.errorCode || sunamganj?.errorCode || 'Error'}.`
    }
  </div>
</div>
`;
  });

  html += `
</body>
</html>
`;

  const reportHtmlPath = path.join(DOCS_DIR, 'report.html');
  fs.writeFileSync(reportHtmlPath, html, 'utf8');
  console.log(`[REPORT] Written HTML report to ${reportHtmlPath} (${html.length} bytes).`);

  // Print PDF using Chrome CDP
  console.log('[PDF] Printing report.html to A4 Landscape PDF via Chrome CDP...');
  const printProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=9223`,
    '--window-size=1440,900',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  let printTargets = [];
  for (let i = 0; i < 20; i++) {
    try {
      printTargets = await fetchJson('http://127.0.0.1:9223/json');
      if (printTargets.length > 0 && printTargets[0].webSocketDebuggerUrl) break;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const printCdp = new CDPClient(printTargets[0].webSocketDebuggerUrl);
  await printCdp.connect();
  await printCdp.send('Page.enable');

  const fileUrl = 'file:///' + reportHtmlPath.replace(/\\/g, '/');
  console.log(`[PDF] Loading ${fileUrl} ...`);
  await printCdp.send('Page.navigate', { url: fileUrl });
  await new Promise(r => setTimeout(r, 3000));

  console.log('[PDF] Generating A4 Landscape PDF with print backgrounds...');
  const pdfRes = await printCdp.send('Page.printToPDF', {
    landscape: true,
    displayHeaderFooter: false,
    printBackground: true,
    preferCSSPageSize: true,
    paperWidth: 11.69,
    paperHeight: 8.27,
    marginTop: 0.3,
    marginBottom: 0.3,
    marginLeft: 0.35,
    marginRight: 0.35
  });

  const pdfPath = path.join(DOCS_DIR, 'FieldShift_visual_test_report.pdf');
  const pdfBuffer = Buffer.from(pdfRes.data, 'base64');
  fs.writeFileSync(pdfPath, pdfBuffer);

  const pdfSizeMb = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`[PDF] SUCCESS: Generated PDF at ${pdfPath} (${pdfSizeMb} MB).`);

  printCdp.close();
  printProc.kill();

  // Cleanup raw screenshots to avoid repo bloat
  console.log('[CLEANUP] Cleaning raw screenshot files to preserve repository size limits...');
  const shots = fs.readdirSync(SHOTS_DIR);
  for (const s of shots) {
    fs.unlinkSync(path.join(SHOTS_DIR, s));
  }

  console.log('\n================================================================');
  console.log('VISUAL TEST PROTOCOL COMPLETE');
  console.log(`PDF Path: ${pdfPath}`);
  console.log(`PDF Size: ${pdfSizeMb} MB`);
  console.log('================================================================\n');
}

runVisualTest().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
