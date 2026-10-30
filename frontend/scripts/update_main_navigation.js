import fs from 'fs';
import path from 'path';

const mainPath = path.resolve('src/main.jsx');
const bakPath = path.resolve('src/main.jsx.bak');

const original = fs.readFileSync(mainPath, 'utf8');
fs.writeFileSync(bakPath, original, 'utf8');
console.log('Created backup at', bakPath);

// Normalise lines to \n for consistent processing
const rawLines = original.split(/\r?\n/);
console.log('Original line count:', rawLines.length);

// 1. ADD NEW IMPORTS
const importTarget = "import { ResearchWorkspaceView } from './ResearchWorkspaceView.jsx';";
const newImports = [
  importTarget,
  "import { NasaPlantingAdvisoryView } from './NasaPlantingAdvisoryView.jsx';",
  "import { MyFarmWorkspaceView } from './MyFarmWorkspaceView.jsx';",
  "import { FarmPlanningView } from './FarmPlanningView.jsx';",
  "import { WaterIrrigationView } from './WaterIrrigationView.jsx';",
  "import { DigitalTwin3DView } from './DigitalTwin3DView.jsx';",
  "import { DataEvidenceView } from './DataEvidenceView.jsx';"
].join('\n');

let content = original.replace(importTarget, newImports);

// 2. STATE & handleNavigate
const handleNavTargetStart = "  const handleNavigate = (nav, tab = null) => {";
const handleNavTargetEnd = "  const [user, setUser] = useState(null);";

const newNavCode = `  // Sub-navigation state for 12 unified destinations
  const [cropSubTab, setCropSubTab] = useState('advisory'); // 'advisory' | 'advice' | 'catalog'
  const [weatherSubTab, setWeatherSubTab] = useState('station_3d'); // 'station_3d' | 'uncertainty' | 'satellites'
  const [harvestSubTab, setHarvestSubTab] = useState('calculator'); // 'calculator' | 'market' | 'outcomes' | 'sustainability'
  const [assistantSubTab, setAssistantSubTab] = useState('chat'); // 'chat' | 'voice'
  const [farmPlanningSubTab, setFarmPlanningSubTab] = useState('milp'); // 'milp' | 'replan' | 'comparison'
  const [waterSubTab, setWaterSubTab] = useState('balance'); // 'balance' | 'optimization' | 'profile' | 'stress'
  const [twinSubTab, setTwinSubTab] = useState('farm'); // 'farm' | 'growth' | 'hydrology' | 'climate' | 'compare'
  const [dataEvidenceSubTab, setDataEvidenceSubTab] = useState('sources'); // 'sources' | 'provenance' | 'reports' | 'methodology'
  const [myFarmSubTab, setMyFarmSubTab] = useState('overview'); // 'overview' | 'parcels' | 'map' | 'soil' | 'history'

  const handleNavigate = (nav, tab = null) => {
    setMobileNavOpen(false);

    // Backward-compatible mapping for legacy analytics tab calls
    if (nav === 'analytics') {
      if (tab === 'optimization' || tab === 'milp') {
        setActiveNav('farm_planning');
        setFarmPlanningSubTab('milp');
        return;
      }
      if (tab === 'comparison_lab' || tab === 'lab') {
        setActiveNav('farm_planning');
        setFarmPlanningSubTab('comparison');
        return;
      }
      if (tab === 'replan') {
        setActiveNav('farm_planning');
        setFarmPlanningSubTab('replan');
        return;
      }
      if (tab === 'water' || tab === 'irrigation') {
        setActiveNav('water_irrigation');
        setWaterSubTab('optimization');
        return;
      }
      if (tab === 'canvas_3d' || tab === '3d') {
        setActiveNav('digital_twin');
        setTwinSubTab('farm');
        return;
      }
      if (tab === 'sources' || tab === 'evidence') {
        setActiveNav('data_evidence');
        setDataEvidenceSubTab('sources');
        return;
      }
      if (tab === 'synthetic_lab' || tab === 'provenance') {
        setActiveNav('data_evidence');
        setDataEvidenceSubTab('provenance');
        return;
      }
      if (tab === 'market') {
        setActiveNav('harvest_profit');
        setHarvestSubTab('market');
        return;
      }
      if (tab === 'outcomes') {
        setActiveNav('harvest_profit');
        setHarvestSubTab('outcomes');
        return;
      }
      if (tab === 'sustainability') {
        setActiveNav('harvest_profit');
        setHarvestSubTab('sustainability');
        return;
      }
      if (tab === 'crops' || tab === 'crop_catalog') {
        setActiveNav('crop_advice');
        setCropSubTab('catalog');
        return;
      }
      if (tab === 'weather' || tab === 'uncertainty') {
        setActiveNav('weather');
        setWeatherSubTab('uncertainty');
        return;
      }
      if (tab === 'field' || tab === 'field_map') {
        setActiveNav('field');
        if (tab === 'field_map') setMyFarmSubTab('map');
        return;
      }
      if (tab === 'assistant') {
        setActiveNav('assistant');
        return;
      }
      if (tab === 'account') {
        setActiveNav('account');
        return;
      }
      if (tab === 'dashboard') {
        setActiveNav('dashboard');
        return;
      }
      // Route any other research sub-tabs cleanly to the 20-module research lab
      setActiveNav('research');
      if (tab) setAnalysisTab(tab);
      return;
    }

    if (nav === 'market') {
      setActiveNav('harvest_profit');
      setHarvestSubTab('market');
      return;
    }
    if (nav === 'synthetic_lab') {
      setActiveNav('data_evidence');
      setDataEvidenceSubTab('provenance');
      return;
    }
    if (nav === 'sensitivity') {
      setActiveNav('research');
      setAnalysisTab('sensitivity');
      return;
    }
    if (nav === 'field_map') {
      setActiveNav('field');
      setMyFarmSubTab('map');
      return;
    }

    // Direct routing for the 12 primary keys with sub-tab support
    if (tab) {
      if (nav === 'crop_advice') setCropSubTab(tab);
      else if (nav === 'weather') setWeatherSubTab(tab);
      else if (nav === 'harvest_profit') setHarvestSubTab(tab);
      else if (nav === 'assistant') setAssistantSubTab(tab);
      else if (nav === 'farm_planning') setFarmPlanningSubTab(tab);
      else if (nav === 'water_irrigation') setWaterSubTab(tab);
      else if (nav === 'digital_twin') setTwinSubTab(tab);
      else if (nav === 'data_evidence') setDataEvidenceSubTab(tab);
      else if (nav === 'field') setMyFarmSubTab(tab);
      else if (nav === 'research') setAnalysisTab(tab);
    }
    setActiveNav(nav);
  };

  // User & Account state
  const [user, setUser] = useState(null);`;

// Find index of handleNavigate block
const handleNavIdx = content.indexOf(handleNavTargetStart);
const userStateIdx = content.indexOf(handleNavTargetEnd);
if (handleNavIdx !== -1 && userStateIdx !== -1) {
  content = content.slice(0, handleNavIdx) + newNavCode + content.slice(userStateIdx + handleNavTargetEnd.length);
  console.log('Replaced handleNavigate block successfully.');
} else {
  console.error('Failed to locate handleNavigate block!');
  process.exit(1);
}

// 3. SIDEBAR NAVIGATION RAIL (12 NUMBERED ITEMS)
const sidebarStartMarker = '<nav className="sidebar-nav" aria-label="Primary Navigation">';
const sidebarEndMarker = '</nav>';

const newSidebarNav = `<nav className="sidebar-nav" aria-label="Primary Navigation">
          <div className="nav-section-label">{lang === 'bn' ? 'প্রধান মেন্যু (১২ বিভাগ)' : 'Navigation (12 Sections)'}</div>

          {/* 01. Home */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'dashboard' ? 'active' : ''}\`}
            onClick={() => handleNavigate('dashboard')}
            title={lang === 'bn' ? '০১. হোম - সারসংক্ষেপ' : '01. Home - Overview & Executive Summary'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🏠</span>
            <span className="nav-item-label">{lang === 'bn' ? '০১. হোম' : '01. Home'}</span>
          </button>

          {/* 02. My Farm */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'field' || activeNav === 'field_map' ? 'active' : ''}\`}
            onClick={() => handleNavigate('field')}
            title={lang === 'bn' ? '০২. আমার জমি - সীমানা, স্যাটেলাইট ম্যাপ ও মাটি' : '02. My Farm - Parcels, Map & Soil'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🗺️</span>
            <span className="nav-item-label">{lang === 'bn' ? '০২. আমার জমি' : '02. My Farm'}</span>
          </button>

          {/* 03. Crop Advice */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'crop_advice' ? 'active' : ''}\`}
            onClick={() => handleNavigate('crop_advice')}
            title={lang === 'bn' ? '০৩. ফসলের পরামর্শ - নাসা ধান রোপণ উপদেষ্টা ও ক্যাটালগ' : '03. Crop Advice - NASA Rice Advisory & Matches'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🌱</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৩. ফসলের পরামর্শ' : '03. Crop Advice'}</span>
          </button>

          {/* 04. NASA Weather & Climate */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'weather' ? 'active' : ''}\`}
            onClick={() => handleNavigate('weather')}
            title={lang === 'bn' ? '০৪. নাসা আবহাওয়া ও জলবায়ু স্টেশন' : '04. NASA Weather & Climate Station'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🌦️</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৪. আবহাওয়া ও জলবায়ু' : '04. NASA Weather'}</span>
          </button>

          {/* 05. Farm Planning */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'farm_planning' ? 'active' : ''}\`}
            onClick={() => handleNavigate('farm_planning')}
            title={lang === 'bn' ? '০৫. খামার পরিকল্পনা - ৬-মৌসুম রোটেশন ও পুনঃপরিকল্পনা' : '05. Farm Planning - 6-Season MILP Rotation'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>📐</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৫. খামার পরিকল্পনা' : '05. Farm Planning'}</span>
          </button>

          {/* 06. Water & Irrigation */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'water_irrigation' ? 'active' : ''}\`}
            onClick={() => handleNavigate('water_irrigation')}
            title={lang === 'bn' ? '০৬. পানি ও সেচ ব্যবস্থাপনা - FAO-56 ব্যালেন্স ও AWD' : '06. Water & Irrigation - FAO-56 Balance & AWD'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>💧</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৬. পানি ও সেচ' : '06. Water & Irrigation'}</span>
          </button>

          {/* 07. Research Lab */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'research' || activeNav === 'analytics' ? 'active' : ''}\`}
            onClick={() => handleNavigate('research')}
            title={lang === 'bn' ? '০৭. উন্নত গবেষণা ল্যাব - ২০টি বৈজ্ঞানিক মডিউল' : '07. Research Lab - 20 Scientific Modules'}
            style={{ border: '1px dashed var(--border-medium)', background: 'var(--bg-card-subtle)' }}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🔬</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৭. গবেষণা ল্যাব (২০)' : '07. Research Lab (20)'}</span>
          </button>

          {/* 08. 3D Digital Twin */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'digital_twin' ? 'active' : ''}\`}
            onClick={() => handleNavigate('digital_twin')}
            title={lang === 'bn' ? '০৮. ৩ডি ডিজিটাল টুইন - খামার দৃশ্যকল্প ও সিমুলেশন' : '08. 3D Digital Twin - Live Farm & Phenology'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🌐</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৮. ৩ডি ডিজিটাল টুইন' : '08. 3D Digital Twin'}</span>
          </button>

          {/* 09. Harvest & Market */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'harvest_profit' || activeNav === 'market' ? 'active' : ''}\`}
            onClick={() => handleNavigate('harvest_profit')}
            title={lang === 'bn' ? '০৯. ফসল ও বাজারদর - লাভ-ক্ষতি ক্যালকুলেটর ও দাম' : '09. Harvest & Market - Profit Calculator & Prices'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>💰</span>
            <span className="nav-item-label">{lang === 'bn' ? '০৯. ফসল ও বাজারদর' : '09. Harvest & Market'}</span>
          </button>

          {/* 10. AI Agronomist */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'assistant' ? 'active' : ''}\`}
            onClick={() => handleNavigate('assistant')}
            title={lang === 'bn' ? '১০. AI কৃষি সহকারী - ভয়েস ও চ্যাট পরামর্শ' : '10. AI Agronomist - Voice & Chat Support'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>🤖</span>
            <span className="nav-item-label">{lang === 'bn' ? '১০. AI কৃষি সহকারী' : '10. AI Agronomist'}</span>
          </button>

          {/* 11. Data & Evidence */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'data_evidence' || activeNav === 'synthetic_lab' ? 'active' : ''}\`}
            onClick={() => handleNavigate('data_evidence')}
            title={lang === 'bn' ? '১১. উপাত্ত ও প্রমাণ - ৪-স্তরীয় প্রোভেন্যান্স রেজিস্ট্রি' : '11. Data & Evidence - 4-Tier Provenance Registry'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>📊</span>
            <span className="nav-item-label">{lang === 'bn' ? '১১. উপাত্ত ও প্রমাণ' : '11. Data & Evidence'}</span>
          </button>

          {/* 12. Profile & Settings */}
          <button
            type="button"
            className={\`nav-item \${activeNav === 'account' ? 'active' : ''}\`}
            onClick={() => handleNavigate('account')}
            title={lang === 'bn' ? '১২. প্রোফাইল ও সেটিংস - অপারেটর পাসপোর্ট ও ডেটাবেস' : '12. Profile & Settings - Operator Credentials'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 16 }}>⚙️</span>
            <span className="nav-item-label">{lang === 'bn' ? '১২. প্রোফাইল ও সেটিংস' : '12. Profile & Settings'}</span>
          </button>
        </nav>`;

const sbStart = content.indexOf(sidebarStartMarker);
const sbEnd = content.indexOf(sidebarEndMarker, sbStart);
if (sbStart !== -1 && sbEnd !== -1) {
  content = content.slice(0, sbStart) + newSidebarNav + content.slice(sbEnd + sidebarEndMarker.length);
  console.log('Replaced sidebar navigation rail successfully.');
} else {
  console.error('Failed to locate sidebar nav!');
  process.exit(1);
}

// 4. RETIRE INLINE ANALYTICS (lines 2971 to 5569) AND REPLACE WITH CLEAN ResearchWorkspaceView
const analyticsMarkerStart = "{activeNav === 'analytics' && (";
const fieldMarkerStart = "{(activeNav === 'field' || activeNav === 'field_map') && (";

const analyticsIdx = content.indexOf(analyticsMarkerStart);
const fieldIdx = content.indexOf(fieldMarkerStart, analyticsIdx);

if (analyticsIdx !== -1 && fieldIdx !== -1) {
  const replacementAnalytics = `{/* -------------------- VIEW: RESEARCH WORKSPACE (LEGACY ANALYTICS COMPATIBILITY) -------------------- */}
        {activeNav === 'analytics' && (
          <ResearchWorkspaceView
            activeField={activeField}
            nasa={nasa}
            summary={summary}
            plan={plan}
            ml={ml}
            rl={rl}
            comparisonLab={comparisonLab}
            robustness={robustness}
            outcomes={outcomes}
            user={user}
            userFields={userFields}
            onNavigate={handleNavigate}
            onRunWorkflow={runAnalysis}
            initialTab={analysisTab || 'six_seasons_milp'}
            lang={lang}
            request={request}
            formatNumber={formatNumber}
            strategyProfiles={STRATEGY_PROFILES}
          />
        )}

        `;
  content = content.slice(0, analyticsIdx) + replacementAnalytics + content.slice(fieldIdx);
  console.log('Retired legacy inline analytics monolith successfully.');
} else {
  console.error('Failed to locate analytics block!');
  process.exit(1);
}

// 5. UPDATE VIEW RENDERING FOR MODULAR WORKSPACES:
// A. Replace crop_advice block
const cropAdviceStart = "{activeNav === 'crop_advice' && (";
const harvestProfitStart = "{/* -------------------- VIEW: HARVEST & PROFIT CALCULATOR -------------------- */}";

const cropAdvIdx = content.indexOf(cropAdviceStart);
const harvProfIdx = content.indexOf(harvestProfitStart, cropAdvIdx);

if (cropAdvIdx !== -1 && harvProfIdx !== -1) {
  const newCropAdvice = `{activeNav === 'crop_advice' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={\`btn \${cropSubTab === 'advisory' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setCropSubTab('advisory')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🌾 {lang === 'bn' ? 'নাসা ধান রোপণ উপদেষ্টা' : 'NASA Rice Advisory'}
              </button>
              <button
                type="button"
                className={\`btn \${cropSubTab === 'advice' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setCropSubTab('advice')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🌱 {lang === 'bn' ? 'ফসলের পরামর্শ ও মিল' : 'Crop Advice & Matching'}
              </button>
              <button
                type="button"
                className={\`btn \${cropSubTab === 'catalog' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setCropSubTab('catalog')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📖 {lang === 'bn' ? '১৫ ফসলের ক্যাটালগ' : '15-Crop Catalog'}
              </button>
            </div>
            {cropSubTab === 'advisory' && (
              <NasaPlantingAdvisoryView
                defaultDistrict={activeField?.district?.toLowerCase() || 'rajshahi'}
                defaultCrop="aman"
                lang={lang}
                onNavigate={handleNavigate}
              />
            )}
            {cropSubTab === 'advice' && (
              <FarmerCropAdviceView
                activeField={activeField}
                plan={plan}
                nasa={nasa}
                lang={lang}
                onNavigate={handleNavigate}
                onAskAi={(q) => handleNavigate('assistant')}
              />
            )}
            {cropSubTab === 'catalog' && (
              <CropCatalogView
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
          </div>
        )}

        `;
  content = content.slice(0, cropAdvIdx) + newCropAdvice + content.slice(harvProfIdx);
  console.log('Updated crop_advice view with NASA Planting Advisory sub-navigation.');
}

// B. Update harvest_profit block
const harvBlockStart = "{activeNav === 'harvest_profit' && (";
const researchBlockStart = "{/* -------------------- VIEW: ADVANCED RESEARCH WORKSPACE -------------------- */}";

const hStart = content.indexOf(harvBlockStart);
const rStart = content.indexOf(researchBlockStart, hStart);

if (hStart !== -1 && rStart !== -1) {
  const newHarvest = `{activeNav === 'harvest_profit' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={\`btn \${harvestSubTab === 'calculator' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setHarvestSubTab('calculator')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📋 {lang === 'bn' ? 'লাভ-ক্ষতি হিসাব' : 'Profit Calculator'}
              </button>
              <button
                type="button"
                className={\`btn \${harvestSubTab === 'market' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setHarvestSubTab('market')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                💰 {lang === 'bn' ? 'বাজারদর ও পূর্বাভাস' : 'Market Intelligence'}
              </button>
              <button
                type="button"
                className={\`btn \${harvestSubTab === 'outcomes' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setHarvestSubTab('outcomes')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📈 {lang === 'bn' ? 'বাস্তব খামার ফলাফল' : 'Actual Outcomes'}
              </button>
              <button
                type="button"
                className={\`btn \${harvestSubTab === 'sustainability' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setHarvestSubTab('sustainability')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🌱 {lang === 'bn' ? 'স্থায়িত্ব সূচক' : 'Sustainability Tracker'}
              </button>
            </div>
            {harvestSubTab === 'calculator' && (
              <FarmerHarvestProfitView
                activeField={activeField}
                user={user}
                lang={lang}
                onNavigate={handleNavigate}
              />
            )}
            {harvestSubTab === 'market' && (
              <MarketIntelligenceView
                activeField={activeField}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
            {harvestSubTab === 'outcomes' && (
              <ActualOutcomesView
                activeField={activeField}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
            {harvestSubTab === 'sustainability' && (
              <SustainabilityTrackerView
                activeField={activeField}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
          </div>
        )}

        `;
  content = content.slice(0, hStart) + newHarvest + content.slice(rStart);
  console.log('Updated harvest_profit view with Market & Outcomes sub-navigation.');
}

// C. Replace field parcel manager block with MyFarmWorkspaceView
const fieldBlockStart = "{(activeNav === 'field' || activeNav === 'field_map') && (";
const weatherBlockMarker = "{/* -------------------- VIEW 4: NASA POWER WEATHER & CLIMATE -------------------- */}";

const fIdx = content.indexOf(fieldBlockStart);
const wIdx = content.indexOf(weatherBlockMarker, fIdx);

if (fIdx !== -1 && wIdx !== -1) {
  const newFieldBlock = `{(activeNav === 'field' || activeNav === 'field_map') && (
          <MyFarmWorkspaceView
            activeField={activeField}
            user={user}
            userFields={userFields}
            onSelectField={handleSelectActiveField}
            lang={lang}
            onNavigate={handleNavigate}
            initialSubTab={myFarmSubTab}
          />
        )}

        {/* -------------------- VIEW: FARM PLANNING -------------------- */}
        {activeNav === 'farm_planning' && (
          <FarmPlanningView
            activeField={activeField}
            summary={summary}
            plan={plan}
            ml={ml}
            user={user}
            userFields={userFields}
            lang={lang}
            onNavigate={handleNavigate}
            onRunWorkflow={runAnalysis}
            initialSubTab={farmPlanningSubTab}
            request={request}
          />
        )}

        {/* -------------------- VIEW: WATER & IRRIGATION OPTIMIZATION -------------------- */}
        {activeNav === 'water_irrigation' && (
          <WaterIrrigationView
            activeField={activeField}
            plan={plan}
            summary={summary}
            nasa={nasa}
            lang={lang}
            onNavigate={handleNavigate}
            initialSubTab={waterSubTab}
          />
        )}

        {/* -------------------- VIEW: 3D DIGITAL TWIN -------------------- */}
        {activeNav === 'digital_twin' && (
          <DigitalTwin3DView
            activeField={activeField}
            plan={plan}
            summary={summary}
            nasa={nasa}
            lang={lang}
            onNavigate={handleNavigate}
            initialSubTab={twinSubTab}
          />
        )}

        {/* -------------------- VIEW: DATA & EVIDENCE -------------------- */}
        {activeNav === 'data_evidence' && (
          <DataEvidenceView
            activeField={activeField}
            nasa={nasa}
            lang={lang}
            request={request}
            initialSubTab={dataEvidenceSubTab}
          />
        )}

        `;
  content = content.slice(0, fIdx) + newFieldBlock + content.slice(wIdx);
  console.log('Replaced field block with MyFarmWorkspaceView, FarmPlanningView, WaterIrrigationView, DigitalTwin3DView, and DataEvidenceView.');
}

// D. Update weather block with sub-tabs
const weatherBlockStart = "{activeNav === 'weather' && (";
const assistantBlockMarker = "{/* -------------------- VIEW 6: AI ASSISTANT & DECISION SUPPORT -------------------- */}";

const weaIdx = content.indexOf(weatherBlockStart);
const astIdx = content.indexOf(assistantBlockMarker, weaIdx);

if (weaIdx !== -1 && astIdx !== -1) {
  const newWeatherBlock = `{activeNav === 'weather' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={\`btn \${weatherSubTab === 'station_3d' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setWeatherSubTab('station_3d')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🛰️ {lang === 'bn' ? '৩ডি আবহাওয়া স্টেশন' : '3D Weather Station'}
              </button>
              <button
                type="button"
                className={\`btn \${weatherSubTab === 'uncertainty' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setWeatherSubTab('uncertainty')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📊 {lang === 'bn' ? 'আবহাওয়া ঝুঁকি ও অনিশ্চয়তা' : 'Weather Uncertainty'}
              </button>
              <button
                type="button"
                className={\`btn \${weatherSubTab === 'satellites' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setWeatherSubTab('satellites')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🛰️ {lang === 'bn' ? 'স্যাটেলাইট প্রস্তুতি' : 'Satellite Telemetry & Readiness'}
              </button>
            </div>
            {weatherSubTab === 'station_3d' && (
              <NasaWeatherStation3D
                nasa={nasa}
                env={env}
                activeField={activeField}
                onBack={() => handleNavigate('dashboard')}
              />
            )}
            {weatherSubTab === 'uncertainty' && (
              <WeatherUncertaintyView
                activeField={activeField}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
            {weatherSubTab === 'satellites' && (
              <SatelliteReadinessView
                activeField={activeField}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
          </div>
        )}

        `;
  content = content.slice(0, weaIdx) + newWeatherBlock + content.slice(astIdx);
  console.log('Updated weather block with sub-navigation.');
}

// E. Update assistant block with sub-tabs (chat + voice)
const asstBlockStart = "{activeNav === 'assistant' && (";
const mktBlockMarker = "{/* -------------------- VIEW 8: MARKET INTELLIGENCE & PROFITABILITY -------------------- */}";

const asIdx = content.indexOf(asstBlockStart);
const mkIdx = content.indexOf(mktBlockMarker, asIdx);

if (asIdx !== -1 && mkIdx !== -1) {
  const newAsstBlock = `{activeNav === 'assistant' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={\`btn \${assistantSubTab === 'chat' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setAssistantSubTab('chat')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🤖 {lang === 'bn' ? 'AI কৃষি পরামর্শক চ্যাট' : 'AI Agronomist Chat'}
              </button>
              <button
                type="button"
                className={\`btn \${assistantSubTab === 'voice' ? 'btn-primary' : 'btn-outline'}\`}
                onClick={() => setAssistantSubTab('voice')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🎙️ {lang === 'bn' ? 'বাংলা ভয়েস সহকারী' : 'Farmer Voice Assistant'}
              </button>
            </div>
            {assistantSubTab === 'chat' && (
              <AiAssistantView
                activeField={activeField}
                nasa={nasa}
                summary={summary}
                plan={plan}
                ml={ml}
                rl={rl}
                user={user}
                lang={lang}
                onBack={() => handleNavigate('dashboard')}
                onNavigateTab={(tab) => handleNavigate('analytics', tab)}
              />
            )}
            {assistantSubTab === 'voice' && (
              <div style={{ padding: '24px 16px', maxWidth: 860, margin: '0 auto' }}>
                <FarmerVoiceAssistant
                  activeField={activeField}
                  user={user}
                  lang={lang}
                  onNavigate={handleNavigate}
                />
              </div>
            )}
          </div>
        )}

        `;
  content = content.slice(0, asIdx) + newAsstBlock + content.slice(mkIdx);
  console.log('Updated AI Assistant block with Voice Assistant tab.');
}

// 6. UPDATE MOBILE BOTTOM NAVIGATION BAR
const mobileNavStartMarker = '<nav className="mobile-bottom-nav" aria-label="Mobile Navigation">';
const mobileNavEndMarker = '</nav>';

const mStart = content.indexOf(mobileNavStartMarker);
const mEnd = content.indexOf(mobileNavEndMarker, mStart);

if (mStart !== -1 && mEnd !== -1) {
  const newMobileNav = `<nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${activeNav === 'dashboard' ? 'active' : ''}\`}
            onClick={() => handleNavigate('dashboard')}
            title="Home"
          >
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${activeNav === 'field' || activeNav === 'field_map' ? 'active' : ''}\`}
            onClick={() => handleNavigate('field')}
            title="My Farm"
          >
            <span className="mobile-nav-icon">🗺️</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'জমি' : 'Farm'}</span>
          </button>
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${activeNav === 'crop_advice' ? 'active' : ''}\`}
            onClick={() => handleNavigate('crop_advice')}
            title="Crop Advice & Planting"
          >
            <span className="mobile-nav-icon">🌱</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'পরামর্শ' : 'Crops'}</span>
          </button>
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${activeNav === 'farm_planning' ? 'active' : ''}\`}
            onClick={() => handleNavigate('farm_planning')}
            title="Farm Planning"
          >
            <span className="mobile-nav-icon">📐</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'পরিকল্পনা' : 'Plan'}</span>
          </button>
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${activeNav === 'research' || activeNav === 'analytics' ? 'active' : ''}\`}
            onClick={() => handleNavigate('research')}
            title="Research Lab"
          >
            <span className="mobile-nav-icon">🔬</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'ল্যাব' : 'Lab'}</span>
          </button>
          <button
            type="button"
            className={\`mobile-bottom-nav-item \${mobileNavOpen ? 'active' : ''}\`}
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="Open full 12-section menu drawer"
            title="Menu"
          >
            <span className="mobile-nav-icon">☰</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'মেন্যু' : 'Menu'}</span>
          </button>
        </nav>`;
  content = content.slice(0, mStart) + newMobileNav + content.slice(mEnd + mobileNavEndMarker.length);
  console.log('Updated mobile bottom navigation bar.');
}

fs.writeFileSync(mainPath, content, 'utf8');
console.log('Saved transformed src/main.jsx. New length:', content.length);

