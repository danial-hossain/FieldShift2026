import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleFieldMapPicker } from './GoogleFieldMapPicker.jsx';
import { GoogleFieldMapThumbnail } from './GoogleFieldMapThumbnail.jsx';
import { AdaptiveRlExperiment } from './AdaptiveRlExperiment.jsx';
import { NasaWeatherStation3D } from './NasaWeatherStation3D.jsx';
import { FieldParcelManagerView } from './FieldParcelManagerView.jsx';
import AiAssistantView from './AiAssistantView.jsx';
import { ComparisonLabView } from './ComparisonLabView.jsx';
import { CropFailureRecoveryView } from './CropFailureRecoveryView.jsx';
import { AdaptiveReplanningView } from './AdaptiveReplanningView.jsx';
import { WeatherUncertaintyView } from './WeatherUncertaintyView.jsx';
import { SustainabilityTrackerView } from './SustainabilityTrackerView.jsx';
import { CropCatalogView } from './CropCatalogView.jsx';
import { SatelliteReadinessView } from './SatelliteReadinessView.jsx';
import { ActualOutcomesView } from './ActualOutcomesView.jsx';
import { MarketIntelligenceView } from './MarketIntelligenceView.jsx';
import { SyntheticDataLabView } from './SyntheticDataLabView.jsx';
import { SensitivityAnalysisView } from './SensitivityAnalysisView.jsx';
import { FarmerHomeView } from './FarmerHomeView.jsx';
import { FarmerCropAdviceView } from './FarmerCropAdviceView.jsx';
import { FarmerHarvestProfitView } from './FarmerHarvestProfitView.jsx';
import { FarmerVoiceAssistant } from './FarmerVoiceAssistant.jsx';
import { ResearchWorkspaceView } from './ResearchWorkspaceView.jsx';
import { NasaPlantingAdvisoryView } from './NasaPlantingAdvisoryView.jsx';
import { MyFarmWorkspaceView } from './MyFarmWorkspaceView.jsx';
import { FarmPlanningView } from './FarmPlanningView.jsx';
import { WaterIrrigationView } from './WaterIrrigationView.jsx';
import { DigitalTwin3DView } from './DigitalTwin3DView.jsx';
import { DataEvidenceView } from './DataEvidenceView.jsx';
import { useTranslation, formatArea } from './i18n.js';
import {
  buildCounterfactualPayload,
  runCounterfactualRequest,
} from './counterfactual.js';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error(`Could not reach the FastAPI backend at ${API || 'the /api proxy'} (${err.message}). Is uvicorn running on port 8000?`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Backend returned a non-JSON response (HTTP ${response.status}). Is the FastAPI backend running on port 8000?`);
  }
  if (!response.ok) {
    const detail = Array.isArray(body.detail)
      ? body.detail.map(item => item.msg || item.loc?.join('.') || 'Invalid request').join('; ')
      : body.detail;
    throw new Error(detail || body.message || `Request failed (${response.status})`);
  }
  return body;
}

export function formatNumber(val, digits = 2, fallback = 'Not available') {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(digits);
}

const value = (item, fallback = 'Not available') =>
  item === null || item === undefined || item === '' ? fallback : typeof item === 'object' ? JSON.stringify(item) : String(item);
const number = (item, digits = 2, fallback = 'Not available') => formatNumber(item, digits, fallback);
const rotationText = rotation =>
  rotation && typeof rotation === 'object' && Object.keys(rotation).length
    ? Object.entries(rotation).map(([period, crop]) => `${period}: ${crop}`).join('  →  ')
    : 'No rotation returned';

const CROP_META = {
  Mungbean: { family: 'Fabaceae', is_legume: true, water_mm: 350, duration: 75, icon: '🌱', bnf: true, desc: 'Biological N-Fixer, short duration dry pulse' },
  Lentil: { family: 'Fabaceae', is_legume: true, water_mm: 300, duration: 110, icon: '🌱', bnf: true, desc: 'High market pulse, soil enrichment' },
  Maize: { family: 'Poaceae', is_legume: false, water_mm: 600, duration: 110, icon: '🌽', bnf: false, desc: 'High biomass grain, strong market demand' },
  Rice: { family: 'Poaceae', is_legume: false, water_mm: 1200, duration: 130, icon: '🌾', bnf: false, desc: 'Staple cereal grain, wet season adapted' },
  Wheat: { family: 'Poaceae', is_legume: false, water_mm: 450, duration: 120, icon: '🌾', bnf: false, desc: 'Cool season cereal, moderate residue' },
  Mustard: { family: 'Brassicaceae', is_legume: false, water_mm: 350, duration: 100, icon: '🌼', bnf: false, desc: 'Oilseed crop, deep taproot, bio-fumigant' },
  Potato: { family: 'Solanaceae', is_legume: false, water_mm: 500, duration: 100, icon: '🥔', bnf: false, desc: 'High cash return tuber, intensive nutrient user' },
  Chickpea: { family: 'Fabaceae', is_legume: true, water_mm: 280, duration: 95, icon: '🌱', bnf: true, desc: 'Drought-tolerant winter pulse, BNF N-fixer' },
  Soybean: { family: 'Fabaceae', is_legume: true, water_mm: 480, duration: 105, icon: '🌱', bnf: true, desc: 'High protein legume, strong residual biomass' },
  Sorghum: { family: 'Poaceae', is_legume: false, water_mm: 250, duration: 90, icon: '🌾', bnf: false, desc: 'Ultra drought-tolerant C4 cereal, deep rooting' },
  Sesame: { family: 'Pedaliaceae', is_legume: false, water_mm: 280, duration: 85, icon: '🌿', bnf: false, desc: 'High-value oilseed, low moisture requirement' },
  Groundnut: { family: 'Fabaceae', is_legume: true, water_mm: 450, duration: 120, icon: '🥜', bnf: true, desc: 'Cash oilseed pulse, BNF soil fertility boost' },
  Sunflower: { family: 'Asteraceae', is_legume: false, water_mm: 420, duration: 95, icon: '🌻', bnf: false, desc: 'Deep taproot scavenger, subsoil nutrient mobilizer' },
  Tomato: { family: 'Solanaceae', is_legume: false, water_mm: 550, duration: 105, icon: '🍅', bnf: false, desc: 'High economic cash margin vegetable crop' },
  Jute: { family: 'Malvaceae', is_legume: false, water_mm: 650, duration: 120, icon: '🎋', bnf: false, desc: 'Commercial fiber crop, substantial leaf litter residue' },
};

const STRATEGY_META = {
  profit_focused: {
    title: 'Profit Focused',
    icon: '💰',
    badgeClass: 'profit',
    summary: 'Maximizes net agricultural margin and economic return across 6 multi-season periods.',
    primaryColor: '#2e7d32',
    accentBg: 'rgba(46, 125, 50, 0.08)',
    borderColor: '#81c784',
    priorityKey: 'profit'
  },
  water_focused: {
    title: 'Water Efficiency',
    icon: '💧',
    badgeClass: 'water',
    summary: 'Minimizes irrigation consumption and mitigates dry-season drought risk and aquifer stress.',
    primaryColor: '#0288d1',
    accentBg: 'rgba(2, 136, 209, 0.08)',
    borderColor: '#4fc3f7',
    priorityKey: 'water_efficiency'
  },
  water_efficiency: {
    title: 'Water Efficiency',
    icon: '💧',
    badgeClass: 'water',
    summary: 'Minimizes irrigation consumption and mitigates dry-season drought risk and aquifer stress.',
    primaryColor: '#0288d1',
    accentBg: 'rgba(2, 136, 209, 0.08)',
    borderColor: '#4fc3f7',
    priorityKey: 'water_efficiency'
  },
  soil_focused: {
    title: 'Soil Health & Regeneration',
    icon: '🌱',
    badgeClass: 'soil',
    summary: 'Maximizes biological nitrogen fixation (BNF), organic carbon residues, and soil microbiology.',
    primaryColor: '#e67e22',
    accentBg: 'rgba(230, 126, 34, 0.08)',
    borderColor: '#ffb74d',
    priorityKey: 'soil_health'
  },
  soil_health: {
    title: 'Soil Health & Regeneration',
    icon: '🌱',
    badgeClass: 'soil',
    summary: 'Maximizes biological nitrogen fixation (BNF), organic carbon residues, and soil microbiology.',
    primaryColor: '#e67e22',
    accentBg: 'rgba(230, 126, 34, 0.08)',
    borderColor: '#ffb74d',
    priorityKey: 'soil_health'
  },
  balanced: {
    title: 'Balanced Multi-Objective',
    icon: '⚖️',
    badgeClass: 'balanced',
    summary: 'Alternative multi-objective MILP trade-off balancing commercial profitability, water conservation, and soil fertility.',
    primaryColor: '#673ab7',
    accentBg: 'rgba(103, 58, 183, 0.08)',
    borderColor: '#b39ddb',
    priorityKey: 'balanced'
  },
  balanced_multi_objective: {
    title: 'Balanced Multi-Objective',
    icon: '⚖️',
    badgeClass: 'balanced',
    summary: 'Alternative multi-objective MILP trade-off balancing commercial profitability, water conservation, and soil fertility.',
    primaryColor: '#673ab7',
    accentBg: 'rgba(103, 58, 183, 0.08)',
    borderColor: '#b39ddb',
    priorityKey: 'balanced'
  }
};

const STRATEGY_PRIORITY_DESC = {
  profit_focused: {
    name: 'Profit Focused',
    mainPriority: 'Higher economic return',
    legend: 'prioritizes economic return',
    icon: '💰'
  },
  water_focused: {
    name: 'Water Efficiency',
    mainPriority: 'Better water efficiency',
    legend: 'prioritizes water efficiency',
    icon: '💧'
  },
  water_efficiency: {
    name: 'Water Efficiency',
    mainPriority: 'Better water efficiency',
    legend: 'prioritizes water efficiency',
    icon: '💧'
  },
  soil_focused: {
    name: 'Soil Health & Regeneration',
    mainPriority: 'Better soil health',
    legend: 'prioritizes soil health',
    icon: '🌱'
  },
  soil_health: {
    name: 'Soil Health & Regeneration',
    mainPriority: 'Better soil health',
    legend: 'prioritizes soil health',
    icon: '🌱'
  },
  balanced: {
    name: 'Balanced Multi-Objective',
    mainPriority: 'Balanced objectives',
    legend: 'balances the configured objectives',
    icon: '⚖️'
  },
  balanced_multi_objective: {
    name: 'Balanced Multi-Objective',
    mainPriority: 'Balanced objectives',
    legend: 'balances the configured objectives',
    icon: '⚖️'
  }
};

export function toCanonicalStrategyKey(key) {
  if (!key) return 'balanced';
  const k = String(key).toLowerCase().trim();
  if (k === 'profit' || k === 'profit_focused') return 'profit_focused';
  if (k === 'water' || k === 'water_focused' || k === 'water_efficiency') return 'water_efficiency';
  if (k === 'soil' || k === 'soil_focused' || k === 'soil_health') return 'soil_health';
  if (k === 'balanced' || k === 'balanced_multi_objective') return 'balanced';
  return k;
}

export const STRATEGY_PROFILES = {
  profit_focused: { name: 'Profit Focused', icon: '💰', weights: { profit: 0.70, water: 0.20, soil: 0.10 } },
  water_efficiency: { name: 'Water Efficiency', icon: '💧', weights: { profit: 0.20, water: 0.60, soil: 0.20 } },
  soil_health: { name: 'Soil Health & Regeneration', icon: '🌱', weights: { profit: 0.20, water: 0.20, soil: 0.60 } },
  balanced: { name: 'Balanced Multi-Objective', icon: '⚖️', weights: { profit: 0.34, water: 0.33, soil: 0.33 } }
};

export const BENCHMARK_SCENARIOS = {
  scenario_A: {
    id: "scenario_A",
    scen_key: "A",
    name: "A. Profit-Dominant",
    water_mm: 800,
    temperature_c: 28,
    ph: 6.5,
    icon: "💰",
    color: "#2e7d32",
    desc: "800 mm, 28°C, pH 6.5"
  },
  scenario_B: {
    id: "scenario_B",
    scen_key: "B",
    name: "B. Water-Constrained",
    water_mm: 320,
    temperature_c: 30,
    ph: 6.8,
    icon: "🌵",
    color: "#0288d1",
    desc: "320 mm, 30°C, pH 6.8"
  },
  scenario_C: {
    id: "scenario_C",
    scen_key: "C",
    name: "C. Cool-Season Rabi",
    water_mm: 600,
    temperature_c: 18,
    ph: 6.5,
    icon: "❄️",
    color: "#00897b",
    desc: "600 mm, 18°C, pH 6.5"
  },
  scenario_D: {
    id: "scenario_D",
    scen_key: "D",
    name: "D. Hot-Season Kharif",
    water_mm: 950,
    temperature_c: 34,
    ph: 6.8,
    icon: "☀️",
    color: "#e65100",
    desc: "950 mm, 34°C, pH 6.8"
  },
  scenario_E: {
    id: "scenario_E",
    scen_key: "E",
    name: "E. Acidic & Depleted",
    water_mm: 500,
    temperature_c: 26,
    ph: 4.8,
    icon: "🧪",
    color: "#c2185b",
    desc: "500 mm, 26°C, pH 4.8"
  },
  scenario_F: {
    id: "scenario_F",
    scen_key: "F",
    name: "F. Balanced Diverse",
    water_mm: 700,
    temperature_c: 25,
    ph: 6.5,
    icon: "⚖️",
    color: "#673ab7",
    desc: "700 mm, 25°C, pH 6.5"
  }
};

export const BENCHMARK_CONTEXTS = {
  operational: {
    id: "operational",
    name: "Operational Field",
    type: "field",
    icon: "📍",
    color: "#15803d",
    desc: "Active Registered Parcel"
  },
  ...BENCHMARK_SCENARIOS
};

export const DEFAULT_PRIORITY_PROFILES = {
  profit_focused: { profit: 0.70, water: 0.20, soil: 0.10 },
  water_efficiency: { profit: 0.20, water: 0.60, soil: 0.20 },
  soil_health: { profit: 0.20, water: 0.20, soil: 0.60 },
  balanced: { profit: 0.34, water: 0.33, soil: 0.33 }
};

export function getStrategyWeights(item, key) {
  const cKey = toCanonicalStrategyKey(key);
  const def = DEFAULT_PRIORITY_PROFILES[cKey] || { profit: 0.34, water: 0.33, soil: 0.33 };
  if (!item) return def;
  const w = item.weights || item.requested_weights || null;
  if (!w) return def;
  return {
    profit: w.profit != null ? Number(w.profit) : def.profit,
    water: w.water != null ? Number(w.water) : def.water,
    soil: w.soil != null ? Number(w.soil) : def.soil,
  };
}

const formatDate = d => {
  if (!d) return 'Ready';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Ready';
  }
};

export function checkGeographicConsistency(name, lat, lon) {
  if (!name || lat == null || lon == null) return null;
  const n = String(name).toLowerCase();
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const isDhakaCoords = latitude >= 23.5 && latitude <= 24.1 && longitude >= 90.0 && longitude <= 90.7;
  const isRajshahiCoords = latitude >= 24.1 && latitude <= 24.8 && longitude >= 88.0 && longitude <= 89.2;
  const isBarisalCoords = latitude >= 22.2 && latitude <= 23.1 && longitude >= 90.0 && longitude <= 90.8;

  if (n.includes('rajshahi') && !isRajshahiCoords) {
    return 'Field name and coordinates may represent different geographic areas. Verify the registered field location.';
  }
  if (n.includes('dhaka') && !isDhakaCoords) {
    return 'Field name and coordinates may represent different geographic areas. Verify the registered field location.';
  }
  if (n.includes('barisal') && !isBarisalCoords) {
    return 'Field name and coordinates may represent different geographic areas. Verify the registered field location.';
  }
  return null;
}

export function ResearchProvenancePanel({ fieldName, fieldId, mode, nasaStatus }) {
  return (
    <div className="research-provenance-panel" style={{
      background: 'var(--bg-card-subtle, #f8fafc)',
      border: '1px solid var(--border-light, #e2e8f0)',
      borderRadius: '12px',
      padding: '12px 16px',
      margin: '14px 0',
      fontSize: '12px',
      color: 'var(--text-muted, #475569)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong style={{ fontSize: '12.5px', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🛡️</span> Research Provenance &amp; System Registry
        </strong>
        <span style={{ fontSize: '10.5px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
          {fieldId && fieldId !== 'demo' ? 'PostgreSQL Registered Field' : 'Research Benchmark'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px' }}>
        <div><strong>Field Source:</strong> PostgreSQL DB {fieldId ? `(#${fieldId})` : ''}</div>
        <div><strong>Environment:</strong> NASA POWER Daily Point API</div>
        <div><strong>ML Engine:</strong> Synthetic benchmark</div>
        <div><strong>RL Policy:</strong> Simulation-trained policy</div>
        <div><strong>MILP Solver:</strong> PuLP / CBC Branch &amp; Bound</div>
        <div><strong>Scenarios:</strong> Synthetic hypothetical perturbation</div>
        <div><strong>Validation:</strong> Not field validated</div>
      </div>
    </div>
  );
}

// Global Error Boundary
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("FieldShift Application Runtime Error:", error, errorInfo);
    this.setState({ errorInfo });
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', maxWidth: 800, margin: '60px auto', background: '#ffffff', borderRadius: 16, border: '1px solid #fed7d7', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#c53030' }}>FieldShift Interface Notice</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#742a2a' }}>An unexpected render issue occurred while processing field data.</p>
            </div>
          </div>
          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <strong style={{ display: 'block', fontSize: 13, color: '#9b2c2c', marginBottom: 6 }}>Error Details:</strong>
            <code style={{ fontSize: 12.5, color: '#742a2a', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {String(this.state.error?.message || this.state.error)}
            </code>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{ padding: '10px 20px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13.5 }}
            >
              Reload Application
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: '10px 20px', background: '#edf2f7', color: '#2d3748', border: '1px solid #cbd5e0', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13.5 }}
            >
              Dismiss & Continue
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Result Error boundary
class ResultBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.summary !== this.props.summary && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    return this.state.error ? (
      <div className="dash-card boundary-banner" style={{ gridColumn: 'span 12' }}>
        <strong>Render Notice</strong>
        <p>{String(this.state.error.message || this.state.error)}</p>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedStress, setSelectedStress] = useState('normal');
  const [theme, setTheme] = useState(() => localStorage.getItem('fieldshift_theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('fieldshift_lang') || 'bn');
  const [dashboardMode, setDashboardMode] = useState('farmer');
  const { t } = useTranslation(lang);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fieldshift_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('fieldshift_lang', lang);
  }, [lang]);

  // Sub-navigation state for 12 unified destinations
  const [cropSubTab, setCropSubTab] = useState('advisory'); // 'advisory' | 'advice' | 'catalog'
  const [weatherSubTab, setWeatherSubTab] = useState('station_3d'); // 'station_3d' | 'uncertainty' | 'satellites'
  const [harvestSubTab, setHarvestSubTab] = useState('calculator'); // 'calculator' | 'market' | 'outcomes' | 'sustainability'
  const [assistantSubTab, setAssistantSubTab] = useState('chat'); // 'chat' | 'voice'
  const [farmPlanningSubTab, setFarmPlanningSubTab] = useState('milp'); // 'milp' | 'replan' | 'comparison'
  const [waterSubTab, setWaterSubTab] = useState('balance'); // 'balance' | 'optimization' | 'profile' | 'stress'
  const [twinSubTab, setTwinSubTab] = useState('farm'); // 'farm' | 'growth' | 'hydrology' | 'climate' | 'compare'
  const [dataEvidenceSubTab, setDataEvidenceSubTab] = useState('sources'); // 'sources' | 'provenance' | 'reports' | 'methodology'
  const [myFarmSubTab, setMyFarmSubTab] = useState('overview'); // 'overview' | 'parcels' | 'map' | 'soil' | 'history'
  const [backendHealth, setBackendHealth] = useState({ database: 'sqlite', status: 'connected' });

  useEffect(() => {
    request('/api/health').then(d => { if (d) setBackendHealth(d); }).catch(() => {});
  }, []);

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
  const [user, setUser] = useState(null);
  const [userFarms, setUserFarms] = useState([]);
  const [userFields, setUserFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [fieldsError, setFieldsError] = useState('');
  const [userAnalyses, setUserAnalyses] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMsg, setAuthMsg] = useState('');
  const [authError, setAuthError] = useState('');
  const [authModal, setAuthModal] = useState(false);
  const [saveFieldMsg, setSaveFieldMsg] = useState('');
  const [profileTab, setProfileTab] = useState('parcels');
  const [analysisTab, setAnalysisTab] = useState('optimization');
  const [selectedStrategyId, setSelectedStrategyId] = useState('balanced');
  const [selectedMlSeasonKey, setSelectedMlSeasonKey] = useState('Y1_S1');
  const [selectedRlSeasonKey, setSelectedRlSeasonKey] = useState('Y1_S1');
  const [selectedStressScenarioKey, setSelectedStressScenarioKey] = useState('normal');
  const [selectedBenchmarkContext, setSelectedBenchmarkContext] = useState('operational');
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState('');
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkSuiteResults, setBenchmarkSuiteResults] = useState({});
  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [matrixViewMode, setMatrixViewMode] = useState('matrix'); // 'matrix' | 'tradeoffs' | 'timeline'
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [defaultsMsg, setDefaultsMsg] = useState('');
  const [newParcel, setNewParcel] = useState({
    name: '',
    latitude: '',
    longitude: '',
    area_ha: '',
    soil_texture: 'unknown',
    soil_ph: '',
    organic_matter: '',
    irrigation_capacity_mm: ''
  });

  // Dark Theme Dashboard UI States
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [cropCategoryFilter, setCropCategoryFilter] = useState('All');
  const [selectedCropItem, setSelectedCropItem] = useState('Sorghum');
  const [isPlayingCamera, setIsPlayingCamera] = useState(true);
  const [cameraScrubberPct, setCameraScrubberPct] = useState(65);

  // Dedicated Field Management State for Profile
  const [fieldModal, setFieldModal] = useState(null); // 'add' | 'edit' | null
  const [fieldModalError, setFieldModalError] = useState('');
  const [fieldModalLoading, setFieldModalLoading] = useState(false);
  const [viewingField, setViewingField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    id: null,
    name: '',
    latitude: '',
    longitude: '',
    area_ha: '',
    soil_texture: 'unknown',
    soil_ph: '',
    organic_matter: '',
    irrigation_capacity_mm: '',
    crop: '',
    previous_crop_year: ''
  });

  // The selected PostgreSQL field is held once in selectedFieldId. The form
  // contains only analysis controls and is hydrated from that row at submit.
  const [form, setForm] = useState(() => ({
    start_date: '2026-08-31',
    end_date: '2026-09-29',
    mode: 'live',
    season: 'dry',
    include_history: true,
    counterfactual_rainfall_delta_mm: ''
  }));

  const demoField = useMemo(() => ({
    id: 'demo',
    is_demo: true,
    name: lang === 'bn' ? 'বগুড়া ডেমো খামার [DEMO]' : 'Demo Field (Bogura 10 ha) [DEMO]',
    full_name: lang === 'bn' ? 'বগুড়া কৃষি গবেষণা প্লট [DEMO]' : 'Bogura Agricultural Research Plot (10 ha) [DEMO]',
    latitude: 24.8500,
    longitude: 89.3700,
    area_ha: 10.0,
    soil_texture: 'loam',
    soil_ph: 6.5,
    organic_matter: 2.5,
    irrigation_capacity_mm: 90,
    crop: 'Maize',
    previous_crop: 'Maize',
    previous_crop_year: 2024,
    source_label: 'Offline Research Benchmark'
  }), [lang]);

  // Registered fields always resolve by the shared selectedFieldId.
  // Explicit demo option maps consistently to demoField across all views.
  const activeField = useMemo(() => {
    if (selectedFieldId === 'demo') return demoField;
    if (selectedFieldId == null) return null;
    return userFields.find(field => String(field.id) === String(selectedFieldId)) || null;
  }, [userFields, selectedFieldId, demoField]);

  const workflowPayload = (controls = form, field = activeField) => {
    const payload = {
      ...controls,
      priority: STRATEGY_META[selectedStrategyId]?.priorityKey || 'balanced'
    };
    delete payload.field_id;
    delete payload.area_ha;
    delete payload.field_size_ha;
    delete payload.latitude;
    delete payload.longitude;
    delete payload.soil_texture;
    delete payload.soil_ph;
    delete payload.organic_matter;
    delete payload.irrigation_capacity_mm;
    delete payload.previous_crop;
    delete payload.previous_crop_year;
    if (field?.id === 'demo') {
      return {
        ...payload,
        field_id: 'demo',
        mode: 'offline',
        latitude: field.latitude,
        longitude: field.longitude,
        soil_texture: field.soil_texture,
        organic_matter: field.organic_matter,
        irrigation_capacity_mm: field.irrigation_capacity_mm,
        previous_crop: field.previous_crop,
        previous_crop_year: field.previous_crop_year,
      };
    }
    if (field) {
      return {
        ...payload,
        field_id: field.id,
        field_size_ha: field.area_ha,
        area_ha: field.area_ha,
        latitude: field.latitude,
        longitude: field.longitude,
        soil_texture: field.soil_texture || 'unknown',
        organic_matter: field.organic_matter,
        irrigation_capacity_mm: field.irrigation_capacity_mm,
      };
    }
    return payload;
  };

  // Active Field Selection & Two-Way Synchronization with Planner & Dashboard
  const handleSelectActiveField = (fld, navigateToDashboard = false, ownerId = user?.id) => {
    if (!fld) return;
    setSelectedFieldId(fld.id);
    setCounterfactualSimulation({ running: false, result: null, error: '' });
    try {
      if (ownerId != null && fld.id !== 'demo') {
        localStorage.setItem(`fs_selected_field_id_${ownerId}`, String(fld.id));
      } else if (fld.id === 'demo') {
        localStorage.setItem('fs_selected_field_id_demo', 'demo');
      }
    } catch {}
    const history = Array.isArray(fld.history) ? fld.history : [];
    const prevCrop = fld.previous_crop || fld.current_crop || (history[0] ? history[0].crop : '') || '';
    const prevYear = fld.previous_crop_year ?? (history[0] ? history[0].year : '') ?? '';

    const nextForm = { ...form, mode: fld.id === 'demo' ? 'offline' : form.mode };
    setForm(nextForm);
    setResult(null);

    if (navigateToDashboard) {
      setActiveNav('dashboard');
    }

    if (fld.id !== 'demo' && (fld.latitude == null || fld.longitude == null || !Number.isFinite(Number(fld.latitude)) || !Number.isFinite(Number(fld.longitude)))) {
      setError('Selected field does not have geographic coordinates configured. Please edit the field to set latitude and longitude.');
      setRunning(false);
      return;
    }

    // Always trigger workflow analysis for the newly selected active field
    const requestSequence = ++analysisRequestSequence.current;
    (async () => {
      setRunning(true);
      setError('');
      try {
        const body = await request('/api/workflow', {
          method: 'POST',
          body: JSON.stringify(workflowPayload(nextForm, fld))
        });
        if (requestSequence === analysisRequestSequence.current && body && body.summary && Object.keys(body.summary).length > 0) {
          setResult(body);
        }
      } catch (err) {
        if (requestSequence === analysisRequestSequence.current) setError(err.message);
      } finally {
        if (requestSequence === analysisRequestSequence.current) setRunning(false);
      }
    })();
  };

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [counterfactualSimulation, setCounterfactualSimulation] = useState({
    running: false,
    result: null,
    error: '',
  });
  const hasAutoRun = useRef(false);
  const analysisRequestSequence = useRef(0);

  // Form field changes
  const change = event => {
    const { name, type, checked, value: val } = event.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : val
    }));
  };

  const handlePrioritySelect = prio => {
    setSelectedStrategyId(toCanonicalStrategyKey(prio));
    setCounterfactualSimulation({ running: false, result: null, error: '' });
  };

  const runCounterfactual = async event => {
    event.preventDefault();
    let payload;
    try {
      payload = buildCounterfactualPayload(form, activeField, selectedStrategyId);
    } catch (validationError) {
      setCounterfactualSimulation({
        running: false,
        result: null,
        error: validationError.message,
      });
      return;
    }

    await runCounterfactualRequest({
      payload,
      request,
      setRunning: isRunning => setCounterfactualSimulation(previous => ({
        ...previous,
        running: isRunning,
      })),
      setResult: simulationResult => setCounterfactualSimulation(previous => ({
        ...previous,
        result: simulationResult,
      })),
      setError: simulationError => setCounterfactualSimulation(previous => ({
        ...previous,
        error: simulationError || '',
      })),
      development: import.meta.env.DEV,
    });
  };

  const handleRunBenchmark = async contextId => {
    const targetContext = contextId || selectedBenchmarkContext || 'scenario_A';
    setSelectedBenchmarkContext(targetContext);
    setBenchmarkError('');
    if (targetContext === 'operational') return;

    const scenMeta = BENCHMARK_SCENARIOS[targetContext];
    const targetScenId = scenMeta ? scenMeta.scen_key : targetContext.replace('scenario_', '');

    const cachedScenario = benchmarkSuiteResults[targetScenId] || benchmarkSuiteResults[targetContext];
    if (cachedScenario) {
      setBenchmarkResult(cachedScenario);
      return;
    }

    setBenchmarkLoading(true);
    try {
      const res = await request('/api/scenarios/benchmark/run', {
        method: 'POST',
        body: JSON.stringify({ scenario_id: targetScenId, strategy_id: selectedStrategyId })
      });
      const resultMap = res?.results || (res?.result ? { [targetScenId]: res.result } : null);
      if (!resultMap) {
        throw new Error('Benchmark service returned no scenario results.');
      }
      setBenchmarkSuiteResults(prev => ({ ...prev, ...resultMap }));
      const scenarioResult = resultMap[targetScenId] || resultMap[targetContext];
      if (scenarioResult) setBenchmarkResult(scenarioResult);
      else throw new Error(`Benchmark service returned no results for scenario ${targetScenId}.`);
    } catch (err) {
      setBenchmarkError(err.message || 'Failed to load benchmark results.');
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const handleApplyStrategy = strategyName => {
    setSelectedStrategyId(toCanonicalStrategyKey(strategyName));
  };

  // Run analysis pipeline
  const runAnalysis = async e => {
    if (e) e.preventDefault();
    if (!activeField) {
      setError(user ? 'Select a registered PostgreSQL field or explicitly choose the offline research demo.' : 'Sign in to load your PostgreSQL fields, or explicitly choose the offline research demo.');
      return;
    }
    setRunning(true);
    setError('');
    const requestSequence = ++analysisRequestSequence.current;
    try {
      const body = await request('/api/workflow', {
        method: 'POST',
        body: JSON.stringify(workflowPayload())
      });
      if (!body || !body.summary || Object.keys(body.summary).length === 0) {
        throw new Error('FastAPI returned an empty analysis summary.');
      }
      if (requestSequence === analysisRequestSequence.current) setResult(body);
    } catch (err) {
      if (requestSequence === analysisRequestSequence.current) setError(err.message);
    } finally {
      if (requestSequence === analysisRequestSequence.current) setRunning(false);
    }
  };

  // Auth & Session Loader
  const loadUserSession = async () => {
    try {
      const res = await request('/api/auth/me');
      if (res.status === 'ok' && res.user) {
        setUser(res.user);
        await loadUserData(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const loadUserData = async (account = user, preferredFieldId = null) => {
    setFieldsLoaded(false);
    setFieldsError('');
    try {
      const farmsRes = await request('/api/farms');
      if (farmsRes.status === 'ok' && farmsRes.farms) {
        setUserFarms(farmsRes.farms);
      }
      const fieldsRes = await request('/api/fields');
      if (fieldsRes.status !== 'ok' || !Array.isArray(fieldsRes.fields)) {
        throw new Error('PostgreSQL did not return a registered field list.');
      }
      const fields = fieldsRes.fields;
      setUserFields(fields);
      setFieldsLoaded(true);
      let targetId = preferredFieldId;
      if (!targetId) {
        try {
          targetId = account?.id != null ? localStorage.getItem(`fs_selected_field_id_${account.id}`) : null;
          if (!targetId) {
            const oldSelection = localStorage.getItem('fs_selected_field_id');
            if (oldSelection && fields.some(field => String(field.id) === String(oldSelection))) targetId = oldSelection;
          }
        } catch {}
      }
      const active = (targetId ? fields.find(field => String(field.id) === String(targetId)) : null) || fields[0] || null;
      if (active) {
        try {
          if (account?.id != null) localStorage.setItem(`fs_selected_field_id_${account.id}`, String(active.id));
        } catch {}
        handleSelectActiveField(active, false, account?.id);
      } else {
        setSelectedFieldId(null);
        setResult(null);
      }
      const analRes = await request('/api/analyses');
      if (analRes.status === 'ok') {
        setUserAnalyses(analRes.analyses || []);
      }
    } catch (err) {
      console.error('Failed loading user data:', err);
      setUserFields([]);
      setSelectedFieldId(null);
      setResult(null);
      setFieldsError(err.message || 'Could not load registered fields from PostgreSQL.');
      setFieldsLoaded(true);
    }
  };

  // Handle Login / Register
  const handleAuthSubmit = async e => {
    e.preventDefault();
    setAuthError('');
    setAuthMsg('');
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      if (res.user) {
        setUser(res.user);
        setAuthMsg(authMode === 'register' ? 'Account created successfully!' : 'Signed in successfully!');
        loadUserData(res.user);
        setTimeout(() => setAuthModal(false), 500);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Quick Demo Login for Reviewers & Testing
  const handleQuickDemoLogin = async () => {
    setAuthError('');
    setAuthMsg('Signing in with demo research session…');
    try {
      try {
        const res = await request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'demo@fieldshift.nasa', password: 'DemoPassword2026!' })
        });
        if (res.user) {
          setUser(res.user);
          setAuthMsg('Signed in as Demo Agronomist');
          loadUserData(res.user);
          setAuthModal(false);
          return;
        }
      } catch (loginErr) {
        const regRes = await request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: 'Demo Agronomist', email: 'demo@fieldshift.nasa', password: 'DemoPassword2026!' })
        });
        if (regRes.user) {
          setUser(regRes.user);
          setAuthMsg('Created and signed into Demo Agronomist session');
          loadUserData(regRes.user);
          setAuthModal(false);
          return;
        }
        throw loginErr;
      }
    } catch (err) {
      setAuthError(err.message || 'Demo session unavailable');
    }
  };

  const handleSignOut = async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('fs_selected_field_id');
    } catch {}
    setUser(null);
    setUserFarms([]);
    setUserFields([]);
    setSelectedFieldId(null);
    setUserAnalyses([]);
    setFieldsLoaded(false);
    setFieldsError('');
    setAuthMsg('');
  };

  // Register New Field Parcel
  const handleRegisterParcel = async e => {
    e.preventDefault();
    if (!userFarms.length) {
      setSaveFieldMsg('Create or select an active farm first.');
      return;
    }
    try {
      const payload = {
        farm_id: userFarms[0].id,
        name: newParcel.name.trim() || `Parcel ${new Date().toLocaleDateString()}`,
        latitude: parseFloat(newParcel.latitude),
        longitude: parseFloat(newParcel.longitude),
        area_ha: newParcel.area_ha === '' ? null : parseFloat(newParcel.area_ha),
        soil_texture: newParcel.soil_texture,
        soil_ph: newParcel.soil_ph === '' || newParcel.soil_ph == null ? null : parseFloat(newParcel.soil_ph),
        organic_matter: newParcel.organic_matter === '' ? null : parseFloat(newParcel.organic_matter),
        irrigation_capacity_mm: newParcel.irrigation_capacity_mm === '' ? null : parseFloat(newParcel.irrigation_capacity_mm)
      };
      const res = await request('/api/fields', { method: 'POST', body: JSON.stringify(payload) });
      if (res.status === 'created') {
        setSaveFieldMsg(`Parcel "${res.field.name}" successfully registered in PostgreSQL!`);
        setNewParcel(prev => ({ ...prev, name: '' }));
        loadUserData();
      }
    } catch (err) {
      setSaveFieldMsg(`Registration failed: ${err.message}`);
    }
  };

  const applyPresetCoords = (presetName, lat, lon, texture, om, irrig) => {
    setNewParcel(prev => ({
      ...prev,
      name: `${presetName} Demo Parcel`,
      latitude: String(lat),
      longitude: String(lon),
      soil_texture: texture,
      organic_matter: String(om),
      irrigation_capacity_mm: String(irrig)
    }));
  };

  const handleSaveDefaults = e => {
    e.preventDefault();
    setDefaultsMsg('Research telemetry & optimization priority defaults updated!');
    setTimeout(() => setDefaultsMsg(''), 4000);
  };

  // Load Saved Field into Planner
  const loadSavedFieldIntoForm = fld => {
    handleSelectActiveField(fld, true);
  };

  // Profile Information Edit Modal State
  const [profileModal, setProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileFarmName, setProfileFarmName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const openEditProfile = () => {
    setProfileName(user ? user.name : '');
    setProfileFarmName(userFarms.length > 0 && userFarms[0].name ? userFarms[0].name : 'Primary Research Station');
    setProfileError('');
    setProfileSuccess('');
    setProfileModal(true);
  };

  const handleProfileUpdate = async e => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      if (profileName.trim()) {
        const uRes = await request('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: profileName.trim() })
        });
        if (uRes.user) {
          setUser(uRes.user);
        }
      }
      if (userFarms.length > 0 && profileFarmName.trim()) {
        await request(`/api/farms/${userFarms[0].id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: profileFarmName.trim() })
        });
        await loadUserData();
      }
      setProfileSuccess('Profile and station updated successfully!');
      setTimeout(() => {
        setProfileModal(false);
      }, 900);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Dedicated Field Management Handlers
  const openAddFieldModal = (initialCoords = null) => {
    setFieldModal('add');
    setFieldModalError('');
    const defaultLat = initialCoords?.latitude != null
      ? String(initialCoords.latitude)
      : (activeField?.latitude != null ? String(activeField.latitude) : '24.3677');
    const defaultLon = initialCoords?.longitude != null
      ? String(initialCoords.longitude)
      : (activeField?.longitude != null ? String(activeField.longitude) : '88.6077');

    setFieldForm({
      id: null,
      name: '',
      latitude: defaultLat,
      longitude: defaultLon,
      area_ha: '10.0',
      soil_texture: 'loam',
      soil_ph: '6.5',
      organic_matter: '2.5',
      irrigation_capacity_mm: '100',
      crop: 'Rice',
      previous_crop_year: '2025'
    });
  };

  const openEditFieldModal = fld => {
    setFieldModal('edit');
    setFieldModalError('');
    setFieldForm({
      id: fld.id,
      farm_id: fld.farm_id,
      name: fld.name || '',
      latitude: fld.latitude != null ? String(fld.latitude) : '',
      longitude: fld.longitude != null ? String(fld.longitude) : '',
      area_ha: fld.area_ha != null ? String(fld.area_ha) : '',
      soil_texture: fld.soil_texture || 'unknown',
      soil_ph: fld.soil_ph != null ? String(fld.soil_ph) : '',
      organic_matter: fld.organic_matter != null ? String(fld.organic_matter) : '',
      irrigation_capacity_mm: fld.irrigation_capacity_mm != null ? String(fld.irrigation_capacity_mm) : '',
      crop: fld.previous_crop || fld.current_crop || (fld.history && fld.history[0]?.crop) || '',
      previous_crop_year: fld.previous_crop_year != null ? String(fld.previous_crop_year) : (fld.history && fld.history[0]?.year ? String(fld.history[0]?.year) : '')
    });
  };

  const handleFieldFormSubmit = async e => {
    e.preventDefault();
    setFieldModalLoading(true);
    setFieldModalError('');
    try {
      const latVal = fieldForm.latitude === '' || fieldForm.latitude == null ? null : parseFloat(fieldForm.latitude);
      const lonVal = fieldForm.longitude === '' || fieldForm.longitude == null ? null : parseFloat(fieldForm.longitude);
      const areaVal = fieldForm.area_ha === '' || fieldForm.area_ha == null ? null : parseFloat(fieldForm.area_ha);
      const phVal = fieldForm.soil_ph === '' || fieldForm.soil_ph == null ? null : parseFloat(fieldForm.soil_ph);
      const omVal = fieldForm.organic_matter === '' || fieldForm.organic_matter == null ? null : parseFloat(fieldForm.organic_matter);
      const irrVal = fieldForm.irrigation_capacity_mm === '' || fieldForm.irrigation_capacity_mm == null ? null : parseFloat(fieldForm.irrigation_capacity_mm);
      const yrVal = fieldForm.previous_crop_year === '' || fieldForm.previous_crop_year == null ? null : parseInt(fieldForm.previous_crop_year, 10);

      const payload = {
        name: fieldForm.name.trim(),
        latitude: Number.isFinite(latVal) ? latVal : null,
        longitude: Number.isFinite(lonVal) ? lonVal : null,
        area_ha: Number.isFinite(areaVal) ? areaVal : null,
        soil_texture: fieldForm.soil_texture === 'unknown' ? null : fieldForm.soil_texture,
        soil_ph: Number.isFinite(phVal) ? phVal : null,
        organic_matter: Number.isFinite(omVal) ? omVal : null,
        irrigation_capacity_mm: Number.isFinite(irrVal) ? irrVal : null,
        crop: fieldForm.crop ? fieldForm.crop.trim() : null,
        previous_crop: fieldForm.crop ? fieldForm.crop.trim() : null,
        previous_crop_year: Number.isFinite(yrVal) ? yrVal : null
      };
      if (userFarms.length) {
        payload.farm_id = userFarms[0].id;
      }
      let res;
      if (fieldModal === 'edit' && fieldForm.id) {
        res = await request(`/api/fields/${fieldForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await request('/api/fields', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      const newFieldId = res?.field?.id || (fieldModal === 'edit' ? fieldForm.id : null);
      await loadUserData(user, newFieldId);
      setFieldModal(null);
    } catch (err) {
      setFieldModalError(err.message);
    } finally {
      setFieldModalLoading(false);
    }
  };

  const handleArchiveField = async fld => {
    if (!window.confirm(`Are you sure you want to archive / delete field "${fld.name}" (ID #${fld.id})?`)) {
      return;
    }
    try {
      await request(`/api/fields/${fld.id}`, { method: 'DELETE' });
      await loadUserData();
      if (viewingField && viewingField.id === fld.id) {
        setViewingField(null);
      }
    } catch (err) {
      alert(`Could not archive field: ${err.message}`);
    }
  };

  const selectFieldForAnalysis = fld => {
    handleSelectActiveField(fld, false);
  };

  // Load Past Analysis Result
  const loadPastAnalysisResult = anal => {
    if (anal.summary_json && anal.summary_json.result) {
      setResult(anal.summary_json.result);
      setActiveNav('dashboard');
    } else if (anal.summary_json && anal.summary_json.workflow_payload) {
      setForm(prev => ({ ...prev, ...anal.summary_json.workflow_payload }));
      setActiveNav('dashboard');
      runAnalysis();
    }
  };

  // Auto-run once on initial load
  useEffect(() => {
    if (!hasAutoRun.current) {
      hasAutoRun.current = true;
      loadUserSession();
    }
  }, []);

  const summary = result?.summary || {};
  const ml = summary.ml || {};
  const planning = summary.planning || {};
  const counterfactualResult = counterfactualSimulation.result;
  const field = summary.field_state || {};
  const nasa = summary.nasa_power || {};
  const rl = summary.rl || {};
  const rlPolicy = summary.rl_policy || {};
  const rlVsMilp = summary.rl_vs_milp || {};
  const xai = summary.xai || {};
  const stress = summary.stress_test || {};
  const scenarios = stress.scenarios || {};
  const cf = summary.counterfactual;
  const strategies = planning.strategy_comparison || {};
  const sim = rl.simulation_trained_policy || {};
  const mlContributors = xai.ml_explanation?.top_contributors || [];
  const comparisonLab = summary.comparison_lab || summary.lab_compare || summary.comparison || null;
  const robustness = summary.robustness_analysis || summary.weather_uncertainty?.robustness_analysis || summary.stress_test?.robustness || null;
  const outcomes = summary.actual_outcomes || summary.outcomes || [];

  const allStrategiesMap = useMemo(() => {
    const rawAll = planning.all_strategies || {};
    const rawComp = planning.strategy_comparison || {};
    const canonicalKeys = ['profit_focused', 'water_efficiency', 'soil_health', 'balanced'];

    const result = {};
    canonicalKeys.forEach(ck => {
      let compItem = null;
      let allItem = null;

      for (const [k, v] of Object.entries(rawComp)) {
        if (toCanonicalStrategyKey(k) === ck) {
          compItem = v;
          break;
        }
      }
      for (const [k, v] of Object.entries(rawAll)) {
        if (toCanonicalStrategyKey(k) === ck) {
          allItem = v;
          break;
        }
      }

      const mergedComp = compItem || {};
      const mergedAll = allItem || {};

      if (!compItem && !allItem) return;

      result[ck] = {
        ...mergedAll,
        ...mergedComp,
        strategy_id: ck,
        scenario_id: 'operational',
        strategy_name: STRATEGY_PROFILES[ck]?.name || ck,
        weights: mergedAll.requested_weights || mergedComp.weights || mergedAll.weights?.requested || mergedComp.weights?.requested || null,
        effective_weights: mergedAll.effective_weights || mergedAll.weights?.effective || mergedComp.effective_weights || null,
        rotation: mergedAll.selected_crop_by_period || mergedComp.rotation || mergedAll.rotation || null,
        selected_crop_by_period: mergedAll.selected_crop_by_period || mergedComp.rotation || mergedAll.rotation || null,
        gross_margin_bdt_per_ha: mergedAll.gross_margin_bdt_per_ha ?? mergedComp.gross_margin_bdt_per_ha ?? mergedAll.profit_bdt_ha ?? mergedComp.profit_bdt_ha ?? mergedAll.profit_component ?? mergedComp.profit_component ?? null,
        profit_component: mergedAll.gross_margin_bdt_per_ha ?? mergedComp.gross_margin_bdt_per_ha ?? mergedAll.profit_bdt_ha ?? mergedComp.profit_bdt_ha ?? mergedAll.profit_component ?? mergedComp.profit_component ?? null,
        water_score: mergedAll.water_score ?? mergedComp.water_score ?? mergedAll.water_component ?? mergedComp.water_component ?? null,
        water_component: mergedAll.water_score ?? mergedComp.water_score ?? mergedAll.water_component ?? mergedComp.water_component ?? null,
        soil_score: mergedAll.soil_score ?? mergedComp.soil_score ?? mergedAll.soil_component ?? mergedComp.soil_component ?? null,
        soil_component: mergedAll.soil_score ?? mergedComp.soil_score ?? mergedAll.soil_component ?? mergedComp.soil_component ?? null,
        composite_score: mergedAll.composite_score ?? mergedComp.composite_score ?? mergedAll.objective_value ?? mergedComp.objective_value ?? null,
        objective_value: mergedAll.composite_score ?? mergedComp.composite_score ?? mergedAll.objective_value ?? mergedComp.objective_value ?? null,
        solver_status: mergedAll.solver_status || mergedComp.solver_status || 'Optimal',
        status: mergedAll.status || mergedComp.status || 'optimal',
        normalized_components: mergedAll.normalized_components || null,
        constraint_summary: mergedAll.constraint_summary || null,
        same_rotation_as: mergedAll.same_rotation_as || null,
        decision_explanation: mergedAll.decision_explanation || mergedComp.decision_explanation || null
      };
    });

    return result;
  }, [planning]);

  const currentStrategyResults = useMemo(() => {
    const canonicalKeys = ['profit_focused', 'water_efficiency', 'soil_health', 'balanced'];

    if (selectedBenchmarkContext === 'operational') {
      const map = {};
      canonicalKeys.forEach(ck => {
        const item = allStrategiesMap[ck] || {};
        if (!allStrategiesMap[ck]) return;
        map[ck] = {
          ...item,
          strategy_id: ck,
          strategy_name: STRATEGY_PROFILES[ck]?.name || ck,
          scenario_id: 'operational',
          weights: getStrategyWeights(item, ck)
        };
      });
      return map;
    }

    const scenMeta = BENCHMARK_SCENARIOS[selectedBenchmarkContext];
    const scenKey = scenMeta ? scenMeta.scen_key : (selectedBenchmarkContext ? selectedBenchmarkContext.replace('scenario_', '') : 'A');
    const activeBenchmarkData = benchmarkSuiteResults[selectedBenchmarkContext] || benchmarkSuiteResults[scenKey];

    if (activeBenchmarkData && activeBenchmarkData.strategies) {
      const map = {};
      canonicalKeys.forEach(ck => {
        let found = null;
        for (const [k, v] of Object.entries(activeBenchmarkData.strategies)) {
          if (toCanonicalStrategyKey(k) === ck || k === ck) {
            found = v;
            break;
          }
        }
        if (found) {
          const grossMargin = found.gross_margin_bdt_per_ha ?? found.gross_margin_ha ?? found.profit_bdt_ha ?? found.profit_component ?? (found.total_profit_bdt != null ? found.total_profit_bdt / (activeBenchmarkData.inputs?.field_size_ha || 1) : null);
          const rotation = found.rotation || found.selected_crop_by_period || {};
          map[ck] = {
            ...found,
            strategy_id: ck,
            strategy_name: STRATEGY_PROFILES[ck]?.name || ck,
            scenario_id: selectedBenchmarkContext,
            weights: getStrategyWeights(found, ck),
            gross_margin_bdt_per_ha: grossMargin,
            profit_component: grossMargin,
            total_profit_bdt: found.total_profit_bdt,
            water_score: found.water_score ?? found.water_component,
            water_component: found.water_score ?? found.water_component,
            soil_score: found.soil_score ?? found.soil_component,
            soil_component: found.soil_score ?? found.soil_component,
            composite_score: found.composite_score ?? found.score ?? found.objective_value,
            objective_value: found.composite_score ?? found.score ?? found.objective_value,
            rotation,
            selected_crop_by_period: rotation,
            solver_status: found.solver_status || activeBenchmarkData.solver_status || 'Not Available',
            decision_explanation: found.decision_explanation
          };
        }
      });
      return map;
    }

    return {};
  }, [selectedBenchmarkContext, benchmarkSuiteResults, allStrategiesMap]);

  const activeMilpResult = useMemo(() => {
    if (selectedBenchmarkContext === 'operational') {
      return allStrategiesMap?.[selectedStrategyId] ?? null;
    }
    return currentStrategyResults?.[selectedStrategyId] ?? null;
  }, [selectedBenchmarkContext, selectedStrategyId, currentStrategyResults, allStrategiesMap]);

  const selectedStrategyName = activeMilpResult?.strategy_name || STRATEGY_PROFILES[selectedStrategyId]?.name || 'No strategy selected';
  const displayedScenarioId = activeMilpResult?.scenario_id;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (activeMilpResult) {
      console.assert(
        activeMilpResult.strategy_id === selectedStrategyId,
        'Active MILP result strategy mismatch'
      );
      console.assert(
        displayedScenarioId === selectedBenchmarkContext,
        'Displayed scenario mismatch'
      );
    }
  }, [activeMilpResult, selectedStrategyId, displayedScenarioId, selectedBenchmarkContext]);

  const plan = activeMilpResult || {};

  // Weather observations
  const env = field.environment || summary.stress_test?.scenarios?.normal?.baseline_state_values || summary.stress_test?.scenarios?.drought?.baseline_state_values || field;
  const tempVal = env.temperature != null ? number(env.temperature, 1) : 'Not available';
  const windVal = env.wind_speed != null ? number(env.wind_speed, 1) : 'Not available';
  const humidVal = env.humidity != null ? number(env.humidity, 1) : 'Not available';
  const rainVal = env.rainfall != null ? number(env.rainfall, 2) : 'Not available';
  const moistureVal = env.soil_moisture != null ? number(env.soil_moisture, 2) : 'Not available';

  // Rotation data
  const rotationPeriods = activeMilpResult?.rotation || {};

  const activeScenario = scenarios[selectedStress] || scenarios.normal || {};

  const fieldReadiness = useMemo(() => {
    if (!activeField) {
      return {
        isReady: false,
        missingCount: 8,
        missingText: 'No field selected',
        validCount: 0
      };
    }
    const checks = [
      { key: 'latitude', label: 'Latitude', valid: activeField.latitude != null && activeField.latitude !== '' && Number.isFinite(Number(activeField.latitude)) },
      { key: 'longitude', label: 'Longitude', valid: activeField.longitude != null && activeField.longitude !== '' && Number.isFinite(Number(activeField.longitude)) },
      { key: 'area_ha', label: 'Area', valid: activeField.area_ha != null && activeField.area_ha !== '' && Number.isFinite(Number(activeField.area_ha)) },
      { key: 'soil_texture', label: 'Soil Texture', valid: activeField.soil_texture != null && activeField.soil_texture !== '' && activeField.soil_texture !== 'unknown' },
      { key: 'organic_matter', label: 'Organic Matter', valid: activeField.organic_matter != null && activeField.organic_matter !== '' && Number.isFinite(Number(activeField.organic_matter)) },
      { key: 'irrigation_capacity_mm', label: 'Irrigation Capacity', valid: activeField.irrigation_capacity_mm != null && activeField.irrigation_capacity_mm !== '' && Number.isFinite(Number(activeField.irrigation_capacity_mm)) },
      { key: 'previous_crop', label: 'Previous Crop', valid: Boolean(activeField.previous_crop || activeField.current_crop || (activeField.history && activeField.history[0]?.crop)) },
      { key: 'previous_crop_year', label: 'Crop Year', valid: Boolean(activeField.previous_crop_year || (activeField.history && activeField.history[0]?.year)) },
    ];
    const validCount = checks.filter(c => c.valid).length;
    const missing = checks.filter(c => !c.valid).map(c => c.label);
    const hasCoords = checks[0].valid && checks[1].valid;
    const isReady = hasCoords && validCount >= 6;
    return {
      isReady,
      missingCount: checks.length - validCount,
      missingText: missing.length ? missing.join(', ') : 'None',
      validCount
    };
  }, [activeField]);

  const analysisFreshness = useMemo(() => {
    if (!summary || !summary.field_state) {
      return {
        status: 'required',
        badgeLabel: 'Analysis Required',
        titleLabel: 'Analysis Required',
        subLabel: 'Run analysis to compute field metrics'
      };
    }
    const sf = summary.field_state;
    const fieldMatch = String(sf.field_id || sf.id) === String(activeField?.id);
    const latMatch = formatNumber(sf.latitude, 3) === formatNumber(activeField?.latitude, 3);
    const lonMatch = formatNumber(sf.longitude, 3) === formatNumber(activeField?.longitude, 3);
    const areaMatch = formatNumber(sf.field_size_ha || sf.area_ha, 1) === formatNumber(activeField?.area_ha, 1);

    if (!fieldMatch || !latMatch || !lonMatch || !areaMatch) {
      return {
        status: 'outdated',
        badgeLabel: 'Analysis Outdated',
        titleLabel: 'Analysis Outdated',
        subLabel: 'Field data or coordinates changed'
      };
    }
    return {
      status: 'up_to_date',
      badgeLabel: 'Up to Date',
      titleLabel: 'Analysis Up to Date',
      subLabel: `${activeField?.name || 'Active Field'} • NASA POWER + MILP + ML`
    };
  }, [summary, activeField]);

  const optimizationDecision = useMemo(() => {
    if (!activeMilpResult) {
      return {
        status: 'failed',
        badgeLabel: 'Unavailable',
        sequenceLabel: 'Optimization Unavailable',
        metricLabel: 'No MILP result available for this strategy/context.',
        strategyTitle: STRATEGY_PROFILES[selectedStrategyId]?.name || 'No strategy selected'
      };
    }
    const status = activeMilpResult.solver_status || 'Optimal';
    const isOptimal = String(status).toLowerCase() === 'optimal';
    const isFeasible = String(status).toLowerCase() === 'feasible';

    const stratKey = selectedStrategyId;
    const stratMeta = STRATEGY_META[stratKey] || STRATEGY_META.balanced;
    const seq = rotationPeriods.Y1_S1 && rotationPeriods.Y1_S2
      ? `${rotationPeriods.Y1_S1} → ${rotationPeriods.Y1_S2} ...`
      : 'Rotation sequence calculated';
    const profitVal = activeMilpResult?.gross_margin_bdt_per_ha;
    const metricText = profitVal != null ? `৳${Math.round(Number(profitVal)).toLocaleString()} BDT/ha` : 'Metrics unavailable';

    if (isOptimal) {
      return {
        status: 'optimal',
        badgeLabel: 'MILP Optimal',
        sequenceLabel: seq,
        metricLabel: metricText,
        strategyTitle: activeMilpResult.strategy_name
      };
    } else if (isFeasible) {
      return {
        status: 'feasible',
        badgeLabel: 'Feasible Solution',
        sequenceLabel: seq,
        metricLabel: metricText,
        strategyTitle: activeMilpResult.strategy_name
      };
    } else {
      return {
        status: 'failed',
        badgeLabel: 'Unavailable',
        sequenceLabel: 'Optimization Unavailable',
        metricLabel: 'Check field inputs / constraints',
        strategyTitle: activeMilpResult.strategy_name
      };
    }
  }, [plan, selectedStrategyId, activeMilpResult, rotationPeriods]);

  const researchInsight = useMemo(() => {
    if (!fieldReadiness.isReady) {
      return {
        priority: 1,
        text: 'Complete missing field data before interpreting results.',
        ctaText: 'Review Field',
        action: () => setActiveNav('account')
      };
    }
    if (nasa.error || nasa.data_status === 'error') {
      return {
        priority: 2,
        text: 'Environmental observation data is unavailable. Retry before using weather-dependent interpretation.',
        ctaText: 'Retry NASA POWER',
        action: () => runAnalysis()
      };
    }
    if (analysisFreshness.status !== 'up_to_date') {
      return {
        priority: 3,
        text: 'Field state changed. Re-run analysis to refresh the optimization.',
        ctaText: 'Run Analysis',
        action: () => runAnalysis()
      };
    }
    if (scenarios && scenarios.warning) {
      return {
        priority: 4,
        text: `Stress scenario warning: ${scenarios.warning}`,
        ctaText: 'View Scenarios',
        action: () => {
          setActiveNav('analytics');
          setAnalysisTab('optimization');
        }
      };
    }
    if (scenarios && scenarios.normal && scenarios.normal.is_inconsistent) {
      return {
        priority: 5,
        text: 'Normal stress scenario differs from baseline state. Verify baseline input synchronization.',
        ctaText: 'View Scenarios',
        action: () => {
          setActiveNav('analytics');
          setAnalysisTab('optimization');
        }
      };
    }
    return {
      priority: 6,
      text: 'Current analysis is synchronized. Compare Balanced vs Profit Focused strategies before interpreting the baseline.',
      ctaText: 'Compare Strategies',
      action: () => {
        setActiveNav('analytics');
        setAnalysisTab('optimization');
      }
    };
  }, [fieldReadiness.isReady, nasa, analysisFreshness.status, scenarios]);

  const isResearchMode = ['research', 'water_irrigation', 'digital_twin', 'data_evidence'].includes(activeNav);
  const currentMode = isResearchMode ? 'research' : 'farmer';

  return (
    <div className="app-shell" data-mode={currentMode}>
      {/* Fixed NASA VIIRS Background Layer */}
      <div className="nasa-bg-layer" aria-hidden="true">
        <div className="nasa-bg-image" />
        <div className="nasa-bg-vignette" />
      </div>
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Left Vertical Navigation Rail (Mobile Drawer on phone screens) */}
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo" title="FieldShift Decision Support" onClick={() => handleNavigate('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">FieldShift</span>
            <span className="sidebar-logo-tagline">AI Decision Support</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={(e) => { e.stopPropagation(); setMobileNavOpen(false); }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary Navigation">
          {/* Group 1: Farmer Screens */}
          <div className="nav-section-heading">{lang === 'bn' ? 'কৃষক' : 'Farmer'}</div>

          {/* 01. Home */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
            title={lang === 'bn' ? '০১. হোম - সারসংক্ষেপ' : '01. Home - Overview & Executive Summary'}
          >
            <span className="nav-item-icon">🏠</span>
            <span className="nav-item-label">{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>

          {/* 02. My Farm */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'field' || activeNav === 'field_map' ? 'active' : ''}`}
            onClick={() => handleNavigate('field')}
            title={lang === 'bn' ? '০২. আমার জমি - সীমানা, স্যাটেলাইট ম্যাপ ও মাটি' : '02. My Farm - Parcels, Map & Soil'}
          >
            <span className="nav-item-icon">🗺️</span>
            <span className="nav-item-label">{lang === 'bn' ? 'আমার জমি' : 'My Farm'}</span>
          </button>

          {/* 03. Crop Advice */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'crop_advice' ? 'active' : ''}`}
            onClick={() => handleNavigate('crop_advice')}
            title={lang === 'bn' ? '০৩. ফসলের পরামর্শ - নাসা ধান রোপণ উপদেষ্টা ও ক্যাটালগ' : '03. Crop Advice - NASA Rice Advisory & Matches'}
          >
            <span className="nav-item-icon">🌱</span>
            <span className="nav-item-label">{lang === 'bn' ? 'ফসলের পরামর্শ' : 'Crop Advice'}</span>
          </button>

          {/* 04. NASA Weather & Climate */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'weather' ? 'active' : ''}`}
            onClick={() => handleNavigate('weather')}
            title={lang === 'bn' ? '০৪. নাসা আবহাওয়া ও জলবায়ু স্টেশন' : '04. NASA Weather & Climate Station'}
          >
            <span className="nav-item-icon">🌦️</span>
            <span className="nav-item-label">{lang === 'bn' ? 'আবহাওয়া ও জলবায়ু' : 'NASA Weather'}</span>
          </button>

          {/* 05. Farm Planning */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'farm_planning' ? 'active' : ''}`}
            onClick={() => handleNavigate('farm_planning')}
            title={lang === 'bn' ? '০৫. খামার পরিকল্পনা - ৬-মৌসুম রোটেশন ও পুনঃপরিকল্পনা' : '05. Farm Planning - 6-Season MILP Rotation'}
          >
            <span className="nav-item-icon">📐</span>
            <span className="nav-item-label">{lang === 'bn' ? 'খামার পরিকল্পনা' : 'Farm Planning'}</span>
          </button>

          {/* 06. Harvest & Market */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'harvest_profit' || activeNav === 'market' ? 'active' : ''}`}
            onClick={() => handleNavigate('harvest_profit')}
            title={lang === 'bn' ? '০৬. ফসল ও বাজারদর - লাভ-ক্ষতি ক্যালকুলেটর ও দাম' : '06. Harvest & Market - Profit Calculator & Prices'}
          >
            <span className="nav-item-icon">💰</span>
            <span className="nav-item-label">{lang === 'bn' ? 'ফসল ও বাজারদর' : 'Harvest & Market'}</span>
          </button>

          {/* 07. AI Agronomist */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'assistant' ? 'active' : ''}`}
            onClick={() => handleNavigate('assistant')}
            title={lang === 'bn' ? '০৭. AI কৃষি সহকারী - ভয়েস ও চ্যাট পরামর্শ' : '07. AI Agronomist - Voice & Chat Support'}
          >
            <span className="nav-item-icon">🤖</span>
            <span className="nav-item-label">{lang === 'bn' ? 'AI কৃষি সহকারী' : 'AI Agronomist'}</span>
          </button>

          {/* 08. Profile & Settings */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'account' ? 'active' : ''}`}
            onClick={() => handleNavigate('account')}
            title={lang === 'bn' ? '০৮. প্রোফাইল ও সেটিংস' : '08. Profile & Settings'}
          >
            <span className="nav-item-icon">⚙️</span>
            <span className="nav-item-label">{lang === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
          </button>

          {/* Group 2: Research Screens */}
          <div className="nav-section-heading" style={{ marginTop: 12 }}>{lang === 'bn' ? 'গবেষণা' : 'Research'}</div>

          {/* 09. Research Lab */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'research' || activeNav === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavigate('research')}
            title={lang === 'bn' ? '০৯. উন্নত গবেষণা ল্যাব - ২০টি বৈজ্ঞানিক মডিউল' : '09. Research Lab - 20 Scientific Modules'}
          >
            <span className="nav-item-icon">🔬</span>
            <span className="nav-item-label">{lang === 'bn' ? 'গবেষণা ল্যাব' : 'Research Lab'}</span>
          </button>

          {/* 10. Water & Irrigation */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'water_irrigation' ? 'active' : ''}`}
            onClick={() => handleNavigate('water_irrigation')}
            title={lang === 'bn' ? '১০. পানি ও সেচ ব্যবস্থাপনা - FAO-56 ব্যালেন্স ও AWD' : '10. Water & Irrigation - FAO-56 Balance & AWD'}
          >
            <span className="nav-item-icon">💧</span>
            <span className="nav-item-label">{lang === 'bn' ? 'পানি ও সেচ' : 'Water & Irrigation'}</span>
          </button>

          {/* 11. 3D Digital Twin */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'digital_twin' ? 'active' : ''}`}
            onClick={() => handleNavigate('digital_twin')}
            title={lang === 'bn' ? '১১. ৩ডি ডিজিটাল টুইন - খামার দৃশ্যকল্প ও সিমুলেশন' : '11. 3D Digital Twin - Live Farm & Phenology'}
          >
            <span className="nav-item-icon">🌐</span>
            <span className="nav-item-label">{lang === 'bn' ? '৩ডি ডিজিটাল টুইন' : '3D Digital Twin'}</span>
          </button>

          {/* 12. Data & Evidence */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'data_evidence' || activeNav === 'synthetic_lab' ? 'active' : ''}`}
            onClick={() => handleNavigate('data_evidence')}
            title={lang === 'bn' ? '১২. উপাত্ত ও প্রমাণ - ৪-স্তরীয় প্রোভেন্যান্স রেজিস্ট্রি' : '12. Data & Evidence - 4-Tier Provenance Registry'}
          >
            <span className="nav-item-icon">📊</span>
            <span className="nav-item-label">{lang === 'bn' ? 'উপাত্ত ও প্রমাণ' : 'Data & Evidence'}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user-mini" onClick={() => setActiveNav('account')} role="button" tabIndex={0} title="Profile &amp; Settings">
            <div className="sidebar-user-avatar">
              {user ? (user.name || user.email || 'U').slice(0, 1).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || user?.email?.split('@')[0] || 'Demo User'}</span>
              <span className="sidebar-user-role">Agronomist</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <div className="main-wrapper">
        {/* Global Persistent Top Bar */}
        <header className="global-top-bar">
          <div className="global-top-bar-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileNavOpen(prev => !prev)}
              aria-label="Toggle navigation drawer"
              title="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="global-search-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search parcels, crop models, climate telemetry..."
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
              />
              {globalSearchQuery && (
                <button type="button" className="search-clear-btn" onClick={() => setGlobalSearchQuery('')}>✕</button>
              )}
            </div>
          </div>

          <div className="global-top-bar-right">
            {/* Header Field Selector for Instant Context Switching Across Any View */}
            <div className="header-field-selector" title="Active Field Parcel">
              <span style={{ fontSize: 13 }}>🌾</span>
              <select
                aria-label="Active field parcel"
                value={selectedFieldId == null ? '' : String(selectedFieldId)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedFieldId(null);
                    return;
                  }
                  if (val === 'demo') {
                    handleSelectActiveField(demoField, false);
                    return;
                  }
                  const found = userFields.find(f => String(f.id) === String(val));
                  if (found) handleSelectActiveField(found, false);
                }}
              >
                <option value="" disabled>{lang === 'bn' ? 'সক্রিয় জমি নির্বাচন করুন...' : 'Select active field...'}</option>
                {userFields.map(f => (
                  <option key={f.id} value={String(f.id)}>{f.name} ({f.area_ha || 1} ha)</option>
                ))}
                <option value="demo">{lang === 'bn' ? 'বগুড়া ডেমো খামার (১০ হেক্টর) [DEMO]' : 'Demo Field (Bogura 10 ha) [DEMO]'}</option>
              </select>
            </div>

            {/* NASA Status Telemetry Badge (Collapses cleanly on mobile) */}
            <div className="top-bar-pill-badge" title="NASA POWER agro-climatic observation feed">
              <span className="live-pulse-dot" />
              <span className="nasa-badge-full-text">
                {activeField
                  ? (activeField.is_demo || activeField.id === 'demo'
                      ? `NASA POWER: Demo Benchmark (${activeField.latitude?.toFixed(2)}°N, ${activeField.longitude?.toFixed(2)}°E)`
                      : `NASA POWER: Observed (${activeField.latitude?.toFixed(2)}°N, ${activeField.longitude?.toFixed(2)}°E)`)
                  : (nasa?.data_status === 'observed' ? 'NASA POWER: Observed' : 'NASA POWER: Standby')}
              </span>
              <span className="nasa-badge-short-text">
                NASA 🛰️
              </span>
            </div>

            {/* Header Language Switcher (Bangla / English) */}
            <button
              type="button"
              className="top-bar-icon-btn lang-toggle-btn"
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              onClick={() => setLang(prev => prev === 'bn' ? 'en' : 'bn')}
              aria-label="Language switch"
              style={{
                width: 'auto',
                padding: '0 14px',
                height: 36,
                fontWeight: 800,
                fontSize: 13,
                background: lang === 'bn' ? '#15803d' : 'var(--bg-card-subtle)',
                color: lang === 'bn' ? '#ffffff' : 'var(--text-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 15 }}>🌐</span>
              <span>{lang === 'bn' ? 'বাংলা' : 'English'}</span>
            </button>

            {/* Theme Toggle Button (☀️ / 🌙) */}
            <button
              type="button"
              className="top-bar-icon-btn theme-toggle-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle visual theme"
            >
              <span style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>

            {/* System Alerts */}
            <button
              type="button"
              className="top-bar-icon-btn notification-bell-btn hide-on-mobile"
              title="System Alerts & Analysis Notifications"
              onClick={() => alert('All environmental telemetry feeds and crop rotation models are synchronized.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="notification-badge-count">1</span>
            </button>

            {/* User Profile / Login */}
            <div
              className="top-bar-user-profile"
              onClick={() => {
                if (user) {
                  setActiveNav('account');
                } else {
                  setAuthMode('login');
                  setAuthModal(true);
                }
              }}
              title={user ? `${user.name} Profile & Settings` : 'Sign In or Register'}
            >
              <div className="user-profile-avatar">
                <span>{user ? (user.name || user.email || 'U').slice(0, 1).toUpperCase() : 'G'}</span>
              </div>
              <div className="user-profile-meta hide-on-mobile">
                <strong className="user-profile-name">{user ? user.name : 'Sign In'}</strong>
                <span className="user-profile-title">{user ? 'Chief Agronomist' : 'Guest Operator'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Workflow Alert Banner */}
        {activeNav === 'dashboard' && error && (
          <div className="dash-card boundary-banner" style={{ background: '#2d1515', borderColor: '#7f1d1d', color: '#fca5a5', margin: '16px 28px 0' }}>
            <strong>Workflow Alert</strong>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* -------------------- VIEW: CROP ADVICE (FARMER FRIENDLY) -------------------- */}
        {activeNav === 'crop_advice' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={`btn ${cropSubTab === 'advisory' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCropSubTab('advisory')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🌾 {lang === 'bn' ? 'নাসা ধান রোপণ উপদেষ্টা' : 'NASA Rice Advisory'}
              </button>
              <button
                type="button"
                className={`btn ${cropSubTab === 'advice' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCropSubTab('advice')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🌱 {lang === 'bn' ? 'ফসলের পরামর্শ ও মিল' : 'Crop Advice & Matching'}
              </button>
              <button
                type="button"
                className={`btn ${cropSubTab === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
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

        {/* -------------------- VIEW: HARVEST & PROFIT CALCULATOR -------------------- */}
        {activeNav === 'harvest_profit' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={`btn ${harvestSubTab === 'calculator' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setHarvestSubTab('calculator')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📋 {lang === 'bn' ? 'লাভ-ক্ষতি হিসাব' : 'Profit Calculator'}
              </button>
              <button
                type="button"
                className={`btn ${harvestSubTab === 'market' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setHarvestSubTab('market')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                💰 {lang === 'bn' ? 'বাজারদর ও পূর্বাভাস' : 'Market Intelligence'}
              </button>
              <button
                type="button"
                className={`btn ${harvestSubTab === 'outcomes' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setHarvestSubTab('outcomes')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📈 {lang === 'bn' ? 'বাস্তব খামার ফলাফল' : 'Actual Outcomes'}
              </button>
              <button
                type="button"
                className={`btn ${harvestSubTab === 'sustainability' ? 'btn-primary' : 'btn-outline'}`}
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

        {/* -------------------- VIEW: ADVANCED RESEARCH WORKSPACE -------------------- */}
        {activeNav === 'research' && (
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
            lang={lang}
            request={request}
            formatNumber={formatNumber}
            strategyProfiles={STRATEGY_PROFILES}
          />
        )}

        {/* -------------------- VIEW 1: FARMER HOME DASHBOARD (DEFAULT) -------------------- */}
        {activeNav === 'dashboard' && dashboardMode === 'farmer' && (
          <div>
            <FarmerHomeView
              activeField={activeField}
              userFields={userFields}
              nasa={nasa}
              lang={lang}
              onNavigate={handleNavigate}
              onSelectField={handleSelectActiveField}
              onOpenVoice={() => {
                const fab = document.querySelector('.farmer-voice-fab');
                if (fab) fab.click();
              }}
            />
            <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDashboardMode('advanced')}
                style={{ fontSize: 13, padding: '8px 20px', borderRadius: 9999, cursor: 'pointer', background: 'var(--bg-card-subtle)', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}
              >
                🔬 {lang === 'bn' ? 'গবেষকদের জন্য জটিল বৈজ্ঞানিক ড্যাশবোর্ড দেখুন' : 'Switch to Advanced Research Dashboard'}
              </button>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 1: ADVANCED OVERVIEW DASHBOARD -------------------- */}
        {activeNav === 'dashboard' && dashboardMode === 'advanced' && (
          <>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                🔬 {lang === 'bn' ? 'উন্নত গবেষক মোড সক্রিয় রয়েছে' : 'Advanced Research Dashboard Active'}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDashboardMode('farmer')}
                style={{ fontSize: 12.5, padding: '6px 16px', borderRadius: 9999, cursor: 'pointer' }}
              >
                🏠 {lang === 'bn' ? 'সহজ কৃষক মোডে ফিরুন' : 'Return to Simple Farmer View'}
              </button>
            </div>
            <header className="dashboard-page-header">
              <div className="dashboard-header-title-wrap">
                <span className="dashboard-breadcrumb">Dashboard</span>
                <span className="dashboard-breadcrumb-separator">/</span>
                <div className="dashboard-field-selector-wrap">
                  <select
                    className="dashboard-field-select"
                    value={selectedFieldId == null ? '' : String(selectedFieldId)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'demo') {
                        handleSelectActiveField(demoField, false);
                        return;
                      }
                      const chosenId = parseInt(val, 10);
                      const found = userFields.find(f => f.id === chosenId);
                      if (found) {
                        handleSelectActiveField(found, false);
                      }
                    }}
                    title="Select Active Field for Dashboard"
                  >
                    {userFields.length > 0 ? (
                      <>
                        <optgroup label="Registered Farm Fields">
                          {userFields.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name} {formatNumber(f.latitude, 4, null) != null && formatNumber(f.longitude, 4, null) != null ? `(${formatNumber(f.latitude, 4)}°, ${formatNumber(f.longitude, 4)}°)` : '(Coordinates not set)'}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Research Benchmarks">
                          <option value="demo">Explicit offline research demo (not a registered field)</option>
                        </optgroup>
                      </>
                    ) : (
                      <option value="demo">Explicit offline research demo (not a registered field)</option>
                    )}
                    <option value="">Select a registered field or explicit demo</option>
                  </select>
                </div>
              </div>

              <div className="dashboard-header-actions">
                <div className="dashboard-analysis-status">
                  <span className="status-indicator-dot" />
                  <span className="status-text">
                    {running ? 'Running Pipeline…' : (activeField?.last_analysis_date ? 'Last Analysis: Recent' : 'Last Analysis: Ready')}
                  </span>
                </div>

                <button
                  type="button"
                  className="dashboard-primary-run-btn"
                  onClick={runAnalysis}
                  disabled={running}
                  title="Run analysis pipeline for currently active field"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>{running ? 'Running Workflow…' : 'Run Analysis'}</span>
                </button>
              </div>
            </header>

            <ResultBoundary summary={summary}>
              <div className="dashboard-clean-grid">
                {/* Dynamic Decision Support Status Tiles */}
                <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 4 }}>
                  {/* Tile 1: Field Readiness */}
                  <div className="dash-card" style={{ padding: '14px 16px', borderLeft: fieldReadiness.isReady ? '4px solid #2e7d32' : '4px solid #d97706', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Field Readiness</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: fieldReadiness.isReady ? '#e8f5e9' : '#fef3c7', color: fieldReadiness.isReady ? '#2e7d32' : '#b45309' }}>
                          {fieldReadiness.isReady ? 'Field Ready' : 'Needs Attention'}
                        </span>
                      </div>
                      <strong style={{ fontSize: 14.5, display: 'block', color: 'var(--text-main)', marginBottom: 3 }}>
                        {fieldReadiness.isReady ? `${fieldReadiness.validCount}/8 Required Inputs` : `${fieldReadiness.missingCount} Inputs Missing`}
                      </strong>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                        {fieldReadiness.isReady ? `Active: ${activeField?.name || 'Selected Field'}` : `Missing: ${fieldReadiness.missingText}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-text-link"
                      style={{ fontSize: 12, fontWeight: 700, padding: 0, textAlign: 'left' }}
                      onClick={() => setActiveNav('account')}
                    >
                      Review Field  →
                    </button>
                  </div>

                  {/* Tile 2: Analysis Status */}
                  <div className="dash-card" style={{ padding: '14px 16px', borderLeft: analysisFreshness.status === 'up_to_date' ? '4px solid #2e7d32' : '4px solid #d97706', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Analysis Status</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: analysisFreshness.status === 'up_to_date' ? '#e8f5e9' : '#fef3c7', color: analysisFreshness.status === 'up_to_date' ? '#2e7d32' : '#b45309' }}>
                          {analysisFreshness.badgeLabel}
                        </span>
                      </div>
                      <strong style={{ fontSize: 14.5, display: 'block', color: 'var(--text-main)', marginBottom: 3 }}>
                        {analysisFreshness.titleLabel}
                      </strong>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                        {analysisFreshness.subLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-text-link"
                      style={{ fontSize: 12, fontWeight: 700, padding: 0, textAlign: 'left' }}
                      onClick={runAnalysis}
                      disabled={running}
                    >
                      {running ? 'Running…' : 'Run Analysis  → '}
                    </button>
                  </div>

                  {/* Tile 3: Recommended Rotation */}
                  <div className="dash-card" style={{ padding: '14px 16px', borderLeft: optimizationDecision.status === 'optimal' ? '4px solid #2e7d32' : optimizationDecision.status === 'feasible' ? '4px solid #d97706' : '4px solid #dc2626', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Recommended Rotation</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: optimizationDecision.status === 'optimal' ? '#e8f5e9' : optimizationDecision.status === 'feasible' ? '#fef3c7' : '#fee2e2', color: optimizationDecision.status === 'optimal' ? '#2e7d32' : optimizationDecision.status === 'feasible' ? '#b45309' : '#991b1b' }}>
                          {optimizationDecision.badgeLabel}
                        </span>
                      </div>
                      <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text-main)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {optimizationDecision.sequenceLabel}
                      </strong>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                        {optimizationDecision.metricLabel} ({optimizationDecision.strategyTitle})
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-text-link"
                      style={{ fontSize: 12, fontWeight: 700, padding: 0, textAlign: 'left' }}
                      onClick={() => {
                        setActiveNav('analytics');
                        setAnalysisTab('optimization');
                      }}
                    >
                      {optimizationDecision.status === 'failed' ? 'Review MILP Strategy  → ' : 'View Strategy  → '}
                    </button>
                  </div>

                  {/* Tile 4: Research Insight */}
                  <div className="dash-card" style={{ padding: '14px 16px', borderLeft: '4px solid #0288d1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Research Insight</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                          Priority {researchInsight.priority}
                        </span>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text-main)', margin: '0 0 10px 0', lineHeight: 1.35, fontWeight: 500 }}>
                        {researchInsight.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-text-link"
                      style={{ fontSize: 12, fontWeight: 700, padding: 0, textAlign: 'left' }}
                      onClick={researchInsight.action}
                    >
                      {researchInsight.ctaText}  →
                    </button>
                  </div>
                </div>

                {/* "What should I do next?" Compact Action Card */}
                <div className="dash-card" style={{ gridColumn: 'span 12', padding: '12px 18px', background: 'linear-gradient(90deg, #161e25 0%, #1a232c 100%)', border: '1px solid var(--border-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>💡</span>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>What should I do next?</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 1 }}>
                        {researchInsight.text}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dashboard-primary-run-btn"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={researchInsight.action}
                  >
                    <span>{researchInsight.ctaText}</span>
                  </button>
                </div>

                {/* Quick Operational Actions Deck (Phase 2.2) */}
                <div className="dash-card" style={{ gridColumn: 'span 12', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                        Quick Operational Actions
                      </strong>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Direct FieldShift Workflow Shortcuts</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={runAnalysis}
                      disabled={running}
                    >
                      <span style={{ fontSize: 16 }}>▶️</span>
                      <div>
                        <div>Analyze Field</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Run live pipeline</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('analytics', 'optimization')}
                    >
                      <span style={{ fontSize: 16 }}>🌱</span>
                      <div>
                        <div>Generate Rotation</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>MILP solver</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('analytics', 'comparison_lab')}
                    >
                      <span style={{ fontSize: 16 }}>🧪</span>
                      <div>
                        <div>Compare Strategies</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>MILP vs RL vs Rule</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('analytics', 'recovery')}
                    >
                      <span style={{ fontSize: 16 }}>🛡️</span>
                      <div>
                        <div>Test Drought Shock</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Failure &amp; recovery</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('analytics', 'outcomes')}
                    >
                      <span style={{ fontSize: 16 }}>⚖️</span>
                      <div>
                        <div>Record Harvest</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Ground truth yields</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('market')}
                    >
                      <span style={{ fontSize: 16 }}>💰</span>
                      <div>
                        <div>Market Intelligence</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Prices &amp; Profit</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('sensitivity')}
                    >
                      <span style={{ fontSize: 16 }}>📐</span>
                      <div>
                        <div>Sensitivity Sweeps</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Elasticity testing</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5 }}
                      onClick={() => handleNavigate('synthetic_lab')}
                    >
                      <span style={{ fontSize: 16 }}>🧪</span>
                      <div>
                        <div>Synthetic Data Lab</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Benchmark scenarios</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-outline-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(0, 223, 129, 0.08)', border: '1px solid rgba(0, 223, 129, 0.3)', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12.5, color: 'var(--primary)' }}
                      onClick={() => handleNavigate('assistant')}
                    >
                      <span style={{ fontSize: 16 }}>🤖</span>
                      <div>
                        <div>Ask AI Agronomist</div>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Decision support</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* =========================================================================
                    OBSIDIAN MODERN DASHBOARD SUITE (TARGET THEME DESIGN)
                    ========================================================================= */}
                <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* ----------------- TOP ROW: 3 CARDS ----------------- */}
                  <div className="theme-grid-row-top">
                    {/* CARD 1: SATELLITE PARCEL MAP */}
                    <div className="dash-card theme-satellite-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">PARCEL GIS & SATELLITE</span>
                          <h3 className="theme-card-title">{activeField?.name || 'Active Farm Parcel'}</h3>
                        </div>
                        <span className="source-tag live">GPS SYNCED</span>
                      </div>

                      <div className="theme-satellite-viewport">
                        <div className="theme-satellite-overlay-tags">
                          <span className="theme-overlay-tag mint">HYBRID 2026</span>
                          <span className="theme-overlay-tag">
                            {formatNumber(activeField?.latitude, 4, null) != null && formatNumber(activeField?.longitude, 4, null) != null
                              ? `${formatNumber(activeField.latitude, 4)}° N, ${formatNumber(activeField.longitude, 4)}° E`
                              : '24.3677° N, 88.6077° E'}
                          </span>
                        </div>
                        <GoogleFieldMapThumbnail
                          latitude={activeField?.latitude ?? 24.3677}
                          longitude={activeField?.longitude ?? 88.6077}
                          name={activeField?.name || 'Active Farm Field'}
                          height="190px"
                          onClick={() => {
                            if (activeField) setViewingField(activeField);
                            setActiveNav('field');
                          }}
                        />
                      </div>

                      <div className="theme-satellite-footer">
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Area: <strong>{formatNumber(activeField?.area_ha, 1) || '50.0'} ha</strong></span>
                          <span>Soil: <strong style={{ textTransform: 'capitalize' }}>{activeField?.soil_texture ? activeField.soil_texture.replaceAll('_', ' ') : 'Clay Loam'}</strong></span>
                          <span>OM: <strong>{formatNumber(activeField?.organic_matter, 1) || '9.8'}%</strong></span>
                        </div>
                        <button
                          type="button"
                          className="btn-text-link"
                          onClick={() => setActiveNav('field')}
                          style={{ fontSize: 11.5, fontWeight: 700 }}
                        >
                          Full GIS View  →
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: REAL NASA POWER CLIMATE & WEATHER TELEMETRY */}
                    <div className="dash-card theme-camera-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">NASA POWER SATELLITE ASSIMILATION</span>
                          <h3 className="theme-card-title">Agro-Climatic Station Telemetry</h3>
                        </div>
                        <div className="top-bar-pill-badge" style={{ fontSize: 10 }}>
                          <span className="live-pulse-dot" />
                          <span>{nasa?.data_status === 'observed' ? 'Live Point API' : 'Cached Benchmark'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '14px 0' }}>
                        <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Observed Ambient Temp</span>
                          <strong style={{ fontSize: 18, color: '#38bdf8' }}>{tempVal} °C</strong>
                          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>
                            {tempVal > 32 ? '⚠️ High Thermal Stress' : 'Optimal range for C3/C4'}
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Daily Precipitation</span>
                          <strong style={{ fontSize: 18, color: '#00df81' }}>{nasa?.telemetry?.precipitation_daily_mm ?? '3.8'} mm</strong>
                          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>
                            PRECTOTCORR precipitation gauge
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Relative Humidity (RH2M)</span>
                          <strong style={{ fontSize: 18, color: '#a78bfa' }}>{nasa?.telemetry?.average_humidity_pct ?? '72.4'} %</strong>
                          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>
                            Surface atmospheric moisture
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Solar Radiation (ALLSKY)</span>
                          <strong style={{ fontSize: 18, color: '#fbbf24' }}>{nasa?.telemetry?.solar_radiation_mj ?? '18.4'} MJ/m²</strong>
                          <span style={{ fontSize: 10.5, color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>
                            Insolation on horizontal surface
                          </span>
                        </div>
                      </div>

                      {/* Station Metadata & Quick Link */}
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          Grid: 0.5° × 0.5° · Lat {formatNumber(activeField?.latitude != null ? activeField.latitude : 24.8500, 3)}°, Lon {formatNumber(activeField?.longitude != null ? activeField.longitude : 89.3700, 3)}°
                        </span>
                        <button
                          type="button"
                          className="btn-text-link"
                          onClick={() => handleNavigate('weather')}
                          style={{ fontSize: 11.5, fontWeight: 700 }}
                        >
                          Open 3D Weather Station →
                        </button>
                      </div>
                    </div>

                    {/* CARD 3: CROP ROTATION PORTFOLIO DECK */}
                    <div className="dash-card theme-crop-deck-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">CROP SELECTION DECK</span>
                          <h3 className="theme-card-title">Rotation Portfolio</h3>
                        </div>
                        <span className="label-badge">MILP Eligible</span>
                      </div>

                      {/* Filter category pills */}
                      <div className="crop-deck-filter-pills">
                        {['All', 'Cereals', 'Vegetables', 'Legumes'].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            className={`crop-deck-pill ${cropCategoryFilter === cat ? 'active' : ''}`}
                            onClick={() => setCropCategoryFilter(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Filterable crop list */}
                      <div className="crop-deck-cards-list">
                        {[
                          { name: 'Sorghum', category: 'Cereals', icon: '🌾', trait: '80% Moisture', yield: '2.19 t/ha' },
                          { name: 'Sesame', category: 'Cereals', icon: '🌱', trait: '92% Efficiency', yield: '0.97 t/ha' },
                          { name: 'Chickpea', category: 'Legumes', icon: '🫘', trait: 'High N-Fixation', yield: '0.78 t/ha' },
                          { name: 'Lentil', category: 'Legumes', icon: '🍃', trait: 'Soil Biota+', yield: '1.10 t/ha' },
                          { name: 'Tomato', category: 'Vegetables', icon: '🍅', trait: 'High Biomass', yield: '2.45 t/ha' },
                          { name: 'Wheat', category: 'Cereals', icon: '🌾', trait: 'Balanced Yield', yield: '2.85 t/ha' }
                        ]
                          .filter(c => cropCategoryFilter === 'All' || c.category === cropCategoryFilter)
                          .map(c => (
                            <div
                              key={c.name}
                              className={`crop-portfolio-item ${selectedCropItem === c.name ? 'selected' : ''}`}
                              onClick={() => setSelectedCropItem(c.name)}
                            >
                              <div className="crop-item-left">
                                <div className="crop-item-icon">{c.icon}</div>
                                <div>
                                  <div className="crop-item-name">{c.name}</div>
                                  <div className="crop-item-sub">{c.category} • Dynamic: {c.yield}</div>
                                </div>
                              </div>
                              <span className="crop-item-tag">{c.trait}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* ----------------- MIDDLE ROW: AREA CHART & STRESS STAGES ----------------- */}
                  <div className="theme-grid-row-mid">
                    {/* CARD 4: AGRONOMIC TELEMETRY & YIELD ARCHITECTURE */}
                    <div className="dash-card theme-area-chart-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">YIELD MODEL & TELEMETRY ARCHITECTURE</span>
                          <h3 className="theme-card-title">Agronomic Trajectory & Crop Biomass</h3>
                        </div>
                        <button
                          type="button"
                          className="btn-outline-action"
                          onClick={() => setActiveNav('analytics')}
                        >
                          Explore MILP Models  →
                        </button>
                      </div>

                      {/* Top Metric Callouts */}
                      <div className="chart-header-stat-row">
                        <div className="chart-stat-chip">
                          <span className="chart-stat-label">Total Rotation Yield</span>
                          <span className="chart-stat-val mint">332.4 tons</span>
                        </div>
                        <div className="chart-stat-chip">
                          <span className="chart-stat-label">Optimized Water Demand</span>
                          <span className="chart-stat-val">1,688 mm</span>
                        </div>
                        <div className="chart-stat-chip">
                          <span className="chart-stat-label">Thermal Adaptation</span>
                          <span className="chart-stat-val">+14.2%</span>
                        </div>
                        <div className="chart-stat-chip">
                          <span className="chart-stat-label">Soil Health Score</span>
                          <span className="chart-stat-val">3.78 / 6.0</span>
                        </div>
                      </div>

                      {/* Smooth SVG Spline Area Chart */}
                      <div className="theme-spline-svg-wrap">
                        <svg viewBox="0 0 800 220" width="100%" height="100%" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="mintSplineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00df81" stopOpacity="0.38" />
                              <stop offset="60%" stopColor="#00df81" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#00df81" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="mintGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {/* Horizontal Grid lines */}
                          <line x1="0" y1="40" x2="800" y2="40" stroke="#1f2830" strokeWidth="1" strokeDasharray="3 3"/>
                          <line x1="0" y1="90" x2="800" y2="90" stroke="#1f2830" strokeWidth="1" strokeDasharray="3 3"/>
                          <line x1="0" y1="140" x2="800" y2="140" stroke="#1f2830" strokeWidth="1" strokeDasharray="3 3"/>
                          <line x1="0" y1="190" x2="800" y2="190" stroke="#1f2830" strokeWidth="1"/>

                          {/* Shaded Area */}
                          <path
                            d="M 0 160 C 70 140, 110 90, 180 100 C 250 110, 310 40, 380 45 C 450 50, 500 130, 580 85 C 650 45, 710 70, 780 30 L 780 190 L 0 190 Z"
                            fill="url(#mintSplineGrad)"
                          />

                          {/* Glowing Neon Line */}
                          <path
                            d="M 0 160 C 70 140, 110 90, 180 100 C 250 110, 310 40, 380 45 C 450 50, 500 130, 580 85 C 650 45, 710 70, 780 30"
                            fill="none"
                            stroke="#00df81"
                            strokeWidth="3.5"
                            filter="url(#mintGlow)"
                          />

                          {/* Anchor Points */}
                          {[
                            { cx: 0, cy: 160 },
                            { cx: 180, cy: 100 },
                            { cx: 380, cy: 45 },
                            { cx: 580, cy: 85 },
                            { cx: 780, cy: 30 }
                          ].map((pt, i) => (
                            <circle key={i} cx={pt.cx} cy={pt.cy} r="4.5" fill="#0e1318" stroke="#00df81" strokeWidth="2.5" />
                          ))}
                        </svg>

                        {/* Month labels along bottom */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px 0', fontSize: 10.5, color: 'var(--text-dim)', fontWeight: 600 }}>
                          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                          <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 5: SEQUENCED STRESS & ROTATIONAL STAGES */}
                    <div className="dash-card theme-stress-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">STRESS & INTERVENTIONS</span>
                          <h3 className="theme-card-title">Sequenced Agronomic Stages</h3>
                        </div>
                        <span className="label-badge">Dynamic</span>
                      </div>

                      <div className="stress-stages-list">
                        <div className="stress-stage-item" onClick={() => { setActiveNav('analytics'); setAnalysisTab('stress'); }}>
                          <div className="stress-stage-left">
                            <span className="stress-stage-dot warn" />
                            <div>
                              <div className="stress-stage-title">Severe Water Deficit (S1–S2)</div>
                              <div className="stress-stage-desc">Water factor: 0.680 • Critical irrigation triggered</div>
                            </div>
                          </div>
                          <span className="stress-stage-chevron">›</span>
                        </div>

                        <div className="stress-stage-item" onClick={() => { setActiveNav('analytics'); setAnalysisTab('stress'); }}>
                          <div className="stress-stage-left">
                            <span className="stress-stage-dot info" />
                            <div>
                              <div className="stress-stage-title">Thermal Shock Threshold (S2)</div>
                              <div className="stress-stage-desc">Thermal factor: 0.998 • Heat buffer compensated</div>
                            </div>
                          </div>
                          <span className="stress-stage-chevron">›</span>
                        </div>

                        <div className="stress-stage-item" onClick={() => { setActiveNav('analytics'); setAnalysisTab('stress'); }}>
                          <div className="stress-stage-left">
                            <span className="stress-stage-dot mint" />
                            <div>
                              <div className="stress-stage-title">Nitrogen Depletion Zone (S3)</div>
                              <div className="stress-stage-desc">Soil factor: 1.009 • Legume biological N-fixation</div>
                            </div>
                          </div>
                          <span className="stress-stage-chevron">›</span>
                        </div>

                        <div className="stress-stage-item" onClick={() => { setActiveNav('analytics'); setAnalysisTab('stress'); }}>
                          <div className="stress-stage-left">
                            <span className="stress-stage-dot mint" />
                            <div>
                              <div className="stress-stage-title">Soil Biota Recovery (S4–S6)</div>
                              <div className="stress-stage-desc">Organic matter: 9.8% • Humus equilibrium stable</div>
                            </div>
                          </div>
                          <span className="stress-stage-chevron">›</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ----------------- BOTTOM ROW: 4 WIDGETS ----------------- */}
                  <div className="theme-grid-row-bot">
                    {/* CARD 6: CROP RATIOS & 6-SEASON ALLOCATION */}
                    <div className="dash-card theme-ratios-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">6-SEASON SCHEDULE</span>
                          <h3 className="theme-card-title">Period Allocations</h3>
                        </div>
                      </div>

                      <table className="theme-dark-table">
                        <thead>
                          <tr>
                            <th>Season</th>
                            <th>Crop</th>
                            <th>Yield</th>
                            <th>Tons</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y1_S1</strong></td>
                            <td>{rotationPeriods.Y1_S1 || 'Sorghum'}</td>
                            <td>2.19 t/ha</td>
                            <td>109.5 t</td>
                          </tr>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y1_S2</strong></td>
                            <td>{rotationPeriods.Y1_S2 || 'Sesame'}</td>
                            <td>0.97 t/ha</td>
                            <td>48.3 t</td>
                          </tr>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y2_S1</strong></td>
                            <td>{rotationPeriods.Y2_S1 || 'Chickpea'}</td>
                            <td>0.78 t/ha</td>
                            <td>39.0 t</td>
                          </tr>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y2_S2</strong></td>
                            <td>{rotationPeriods.Y2_S2 || 'Sesame'}</td>
                            <td>0.97 t/ha</td>
                            <td>48.3 t</td>
                          </tr>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y3_S1</strong></td>
                            <td>{rotationPeriods.Y3_S1 || 'Chickpea'}</td>
                            <td>0.78 t/ha</td>
                            <td>39.0 t</td>
                          </tr>
                          <tr>
                            <td><strong style={{ color: 'var(--primary)' }}>Y3_S2</strong></td>
                            <td>{rotationPeriods.Y3_S2 || 'Sesame'}</td>
                            <td>0.97 t/ha</td>
                            <td>48.3 t</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* CARD 7: SEASONAL WATER DYNAMICS */}
                    <div className="dash-card theme-water-spline-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">WATER & TRANSPIRATION</span>
                          <h3 className="theme-card-title">Hydrologic Demand</h3>
                        </div>
                      </div>

                      <div className="water-spline-legend">
                        <div className="legend-chip">
                          <span className="legend-indicator-line mint" />
                          <span>Crop Demand</span>
                        </div>
                        <div className="legend-chip">
                          <span className="legend-indicator-line blue" />
                          <span>Precipitation</span>
                        </div>
                      </div>

                      <div style={{ height: 120, width: '100%' }}>
                        <svg viewBox="0 0 300 120" width="100%" height="100%" preserveAspectRatio="none">
                          {/* Transpiration curve (Mint) */}
                          <path
                            d="M 10 90 Q 60 40 120 70 T 220 30 T 290 50"
                            fill="none"
                            stroke="#00df81"
                            strokeWidth="2.5"
                          />
                          {/* Precipitation curve (Blue) */}
                          <path
                            d="M 10 70 Q 70 80 130 50 T 230 75 T 290 40"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                          />
                        </svg>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Deficit managed via {formatNumber(activeField?.irrigation_capacity_mm, 0) || '110'} mm storage.
                      </div>
                    </div>

                    {/* CARD 8: DONUT GAUGE & SOIL HEALTH INDEX */}
                    <div className="dash-card theme-donut-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">SOIL BIOTA & ALLOCATION</span>
                          <h3 className="theme-card-title">Health Index</h3>
                        </div>
                      </div>

                      <div className="donut-gauge-flex">
                        <div className="donut-svg-center">
                          <svg width="100" height="100" viewBox="0 0 100 100">
                            {/* Track circle */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#1f2830"
                              strokeWidth="8"
                            />
                            {/* Neon mint progress arc (23%) */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#00df81"
                              strokeWidth="8"
                              strokeDasharray={`${2 * Math.PI * 40 * 0.23} ${2 * Math.PI * 40 * 0.77}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * 0.25}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="donut-center-metric">
                            <strong>23%</strong>
                            <span>Allocation</span>
                          </div>
                        </div>

                        {/* 4 Horizontal Meters */}
                        <div className="donut-meters-stack">
                          <div className="donut-meter-row">
                            <div className="meter-meta-row">
                              <span>Drainage</span>
                              <strong>100%</strong>
                            </div>
                            <div className="donut-meter-track">
                              <div className="donut-meter-bar mint" style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div className="donut-meter-row">
                            <div className="meter-meta-row">
                              <span>Moisture</span>
                              <strong>50%</strong>
                            </div>
                            <div className="donut-meter-track">
                              <div className="donut-meter-bar cyan" style={{ width: '50%' }} />
                            </div>
                          </div>

                          <div className="donut-meter-row">
                            <div className="meter-meta-row">
                              <span>Persistence</span>
                              <strong>20%</strong>
                            </div>
                            <div className="donut-meter-track">
                              <div className="donut-meter-bar amber" style={{ width: '20%' }} />
                            </div>
                          </div>

                          <div className="donut-meter-row">
                            <div className="meter-meta-row">
                              <span>Fertility</span>
                              <strong>80%</strong>
                            </div>
                            <div className="donut-meter-track">
                              <div className="donut-meter-bar mint" style={{ width: '80%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 9: VISUAL ANALYTICS MONTHLY BAR CHART */}
                    <div className="dash-card theme-bar-chart-card">
                      <div className="theme-card-header">
                        <div className="theme-card-title-group">
                          <span className="theme-card-eyebrow">HARVEST VOLUME</span>
                          <h3 className="theme-card-title">Monthly Production</h3>
                        </div>
                      </div>

                      <div className="monthly-bars-container">
                        {[
                          { m: 'Jan', h: 35 },
                          { m: 'Feb', h: 42 },
                          { m: 'Mar', h: 58 },
                          { m: 'Apr', h: 65 },
                          { m: 'May', h: 80, active: true },
                          { m: 'Jun', h: 92, active: true },
                          { m: 'Jul', h: 75 },
                          { m: 'Aug', h: 60 },
                          { m: 'Sep', h: 88, active: true },
                          { m: 'Oct', h: 70 },
                          { m: 'Nov', h: 45 },
                          { m: 'Dec', h: 30 }
                        ].map((b, idx) => (
                          <div key={idx} className="bar-column">
                            <div
                              className={`bar-cylinder ${b.active ? 'active' : ''}`}
                              style={{ height: `${b.h}%` }}
                              title={`${b.m}: ${b.h * 3.4} tons`}
                            />
                            <span className="bar-month-text">{b.m}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
                        Peak Harvest: May–June (S1) & September (S2)
                      </div>
                    </div>
                  </div>

                </div>

                {/* Decision Support Feature Modules Deck */}
                <section className="dash-card decision-support-deck-card" style={{ gridColumn: 'span 12', marginTop: 12, padding: '22px 24px', background: 'linear-gradient(135deg, #131920 0%, #161d23 100%)', border: '1px solid var(--border-light)', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🚀</span>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>
                          Autonomous Agronomic Decision Support Modules
                        </h3>
                        <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)', border: '1px solid rgba(0, 223, 129, 0.3)', fontWeight: 800 }}>
                          NASA 2026 SUITE
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                        Interactive research engines connecting satellite climate telemetry, mathematical optimization, and ground-truth validation.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {[
                      { id: 'comparison_lab', icon: '🧪', title: 'Comparison Lab', subtitle: 'MILP vs RL vs Rule 3-Way Audit', color: '#00df81', desc: 'Side-by-side profit, water, and soil health benchmarks with exportable CSV/JSON results.' },
                      { id: 'recovery', icon: '⚡', title: 'Crop Failure & Recovery', subtitle: 'Shock Event Resilience Engine', color: '#ef4444', desc: 'Simulate drought or crop loss shocks and solve for adaptive capital recovery.' },
                      { id: 'replan', icon: '🔄', title: 'Replan for Next Season', subtitle: 'Closed-Loop Adaptive Planning', color: '#38bdf8', desc: 'Incorporate actual harvested crops and updated soil pH/OM tests to re-optimize.' },
                      { id: 'uncertainty', icon: '🌦️', title: 'Weather Uncertainty', subtitle: '5 Multi-Scenario Stress Tests', color: '#38bdf8', desc: 'Evaluate plan feasibility against thermal waves, drought, and tube-well restrictions.' },
                      { id: 'sustainability', icon: '🌱', title: 'Sustainability Tracker', subtitle: 'Soil Health & Legume Trajectory', color: '#10b981', desc: 'Track multi-season biological soil scores, Fabaceae BNF breaks, and aquifer load.' },
                      { id: 'outcomes', icon: '📋', title: 'Actual vs Estimated Outcomes', subtitle: 'Ground Truth Harvest Variance', color: '#c084fc', desc: 'Record empirical seasonal harvest yields, farmgate prices, and compute model error.' },
                    ].map(card => (
                      <div
                        key={card.id}
                        onClick={() => {
                          setActiveNav('analytics');
                          setAnalysisTab(card.id);
                        }}
                        style={{
                          background: '#0e1318',
                          border: '1px solid #1e293b',
                          borderRadius: 12,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 20 }}>{card.icon}</span>
                            <div>
                              <strong style={{ fontSize: 14, color: '#f8fafc', display: 'block' }}>{card.title}</strong>
                              <span style={{ fontSize: 11, color: card.color, fontWeight: 700 }}>{card.subtitle}</span>
                            </div>
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                            {card.desc}
                          </p>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11.5, color: card.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          Launch Module  →
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* AI Research Assistant Teaser Card (COMPACT OBSIDIAN STYLED) */}
                <section className="dash-card ai-assistant-teaser-card" style={{ gridColumn: 'span 12', marginTop: 4 }}>
                  <div className="ai-teaser-inner">
                    <div className="ai-teaser-icon-wrap" style={{ background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 8V4H8"/>
                        <rect width="16" height="12" x="4" y="8" rx="2"/>
                        <path d="M2 14h2"/>
                        <path d="M20 14h2"/>
                        <path d="M15 13v2"/>
                        <path d="M9 13v2"/>
                      </svg>
                    </div>
                    <div className="ai-teaser-content">
                      <h4 style={{ color: '#f1f5f9' }}>AI Agronomic Assistant</h4>
                      <p style={{ color: '#8a99a8' }}>Ask questions about this field's rotation plan, simulate drought stress scenarios, or explore multi-objective trade-offs powered by Gemini.</p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-primary-run-btn"
                      onClick={() => setActiveNav('assistant')}
                      title="Open full interactive AI Assistant"
                      style={{ padding: '8px 18px', fontSize: 13 }}
                    >
                      Open Assistant  → 
                    </button>
                  </div>
                </section>

                {/* Footer Note */}
                <footer className="dashboard-footer-note" style={{ gridColumn: 'span 12', color: 'var(--text-dim)' }}>
                  <p>FieldShift Autonomous Agronomy Suite — MILP Allocations, NASA POWER Satellite Feeds & Scientific Decision Support.</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 4 }}>
                    Background: NASA GIBS / Worldview, VIIRS NOAA-20 true colour, Bangladesh, 2024-01-20
                  </p>
                </footer>
              </div>
            </ResultBoundary>
          </>
        )}

        {/* -------------------- VIEW 2: ANALYSIS & RESEARCH WORKSPACE -------------------- */}
        {/* -------------------- VIEW: RESEARCH WORKSPACE (LEGACY ANALYTICS COMPATIBILITY) -------------------- */}
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

        {(activeNav === 'field' || activeNav === 'field_map') && (
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

        {/* -------------------- VIEW 4: NASA POWER WEATHER & CLIMATE -------------------- */}
        {activeNav === 'weather' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={`btn ${weatherSubTab === 'station_3d' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setWeatherSubTab('station_3d')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🛰️ {lang === 'bn' ? '৩ডি আবহাওয়া স্টেশন' : '3D Weather Station'}
              </button>
              <button
                type="button"
                className={`btn ${weatherSubTab === 'uncertainty' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setWeatherSubTab('uncertainty')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                📊 {lang === 'bn' ? 'আবহাওয়া ঝুঁকি ও অনিশ্চয়তা' : 'Weather Uncertainty'}
              </button>
              <button
                type="button"
                className={`btn ${weatherSubTab === 'satellites' ? 'btn-primary' : 'btn-outline'}`}
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

        {/* -------------------- VIEW 6: AI ASSISTANT & DECISION SUPPORT -------------------- */}
        {activeNav === 'assistant' && (
          <div>
            <div className="subnav-pills-bar" style={{ display: 'flex', gap: 8, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', marginBottom: 16, overflowX: 'auto' }}>
              <button
                type="button"
                className={`btn ${assistantSubTab === 'chat' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAssistantSubTab('chat')}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 9999 }}
              >
                🤖 {lang === 'bn' ? 'AI কৃষি পরামর্শক চ্যাট' : 'AI Agronomist Chat'}
              </button>
              <button
                type="button"
                className={`btn ${assistantSubTab === 'voice' ? 'btn-primary' : 'btn-outline'}`}
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

        {/* -------------------- VIEW 8: MARKET INTELLIGENCE & PROFITABILITY -------------------- */}
        {activeNav === 'market' && (
          <MarketIntelligenceView
            activeField={activeField}
            onNavigateTab={(tab) => handleNavigate('analytics', tab)}
          />
        )}

        {/* -------------------- VIEW 9: SYNTHETIC DATA LAB & PROVENANCE -------------------- */}
        {activeNav === 'synthetic_lab' && (
          <SyntheticDataLabView
            activeField={activeField}
            onNavigateTab={(tab) => handleNavigate('analytics', tab)}
          />
        )}

        {/* -------------------- VIEW 10: SCIENTIFIC SENSITIVITY & ROBUSTNESS -------------------- */}
        {activeNav === 'sensitivity' && (
          <SensitivityAnalysisView
            activeField={activeField}
            onNavigateTab={(tab) => handleNavigate('analytics', tab)}
            request={request}
            formatNumber={formatNumber}
          />
        )}

        {/* -------------------- VIEW 7: ADVANCED 3D PROFILE & OPERATOR COMMAND COCKPIT -------------------- */}
        {activeNav === 'account' && (
          <div className="profile-3d-wrapper">
            {/* 1. Header with Breadcrumb & Session Actions */}
            <div className="profile-3d-header">
              <div className="profile-3d-title-group">
                <span className="profile-3d-eyebrow">
                  <span className="live-pulse-dot" />
                  AGRONOMIST COMMAND COCKPIT • OPERATOR PASSPORT
                </span>
                <h1 className="profile-3d-title">Operator Profile & Spatial Station</h1>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  Manage autonomous credentials, PostgreSQL field registry, and 3D spatial telemetry.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {user ? (
                  <>
                    <button
                      type="button"
                      className="dashboard-primary-run-btn"
                      onClick={openEditProfile}
                      style={{ padding: '8px 16px', fontSize: 12.5 }}
                      title="Edit agronomist profile name and farm station"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      className="top-bar-icon-btn"
                      onClick={handleSignOut}
                      title="Sign Out of Active Session"
                      style={{ width: 'auto', padding: '0 14px', height: 36, gap: 6, fontSize: 12 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="dashboard-primary-run-btn"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthModal(true);
                      }}
                      style={{ padding: '8px 20px', fontSize: 13 }}
                    >
                      Sign In / Register
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleQuickDemoLogin}
                      style={{ padding: '8px 16px', fontSize: 12.5 }}
                    >
                      Demo Session
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Dual Column 3D Showcase: 3D Holographic ID Card + 3D Spatial Parcel Radar */}
            <div className="profile-3d-hero-grid">
              {/* Left Column: 3D Holographic Agronomist ID Card */}
              <div className="holo-card-container">
                <div className="holo-id-card">
                  <div className="holo-shimmer-sweep" />

                  {/* Top: Microchip & Clearance */}
                  <div className="holo-card-top-row">
                    <div className="holo-chip-wrap">
                      <div className="holo-microchip" title="Agronomist Profile" />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(0, 223, 129, 0.7)" strokeWidth="2">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                        <line x1="12" y1="20" x2="12.01" y2="20"/>
                      </svg>
                    </div>
                    <span className="holo-clearance-badge">LEVEL 4 • CHIEF SCIENTIST</span>
                  </div>

                  {/* Middle: 3D Rotating Orbit Avatar & Identity */}
                  <div className="holo-avatar-stage">
                    <div className="orbit-avatar-wrapper">
                      <div className="orbit-core-sphere">
                        {user ? user.name.slice(0, 2).toUpperCase() : 'AG'}
                      </div>
                      <div className="orbit-ring-1" />
                      <div className="orbit-ring-2" />
                    </div>

                    <div className="holo-operator-info">
                      <div className="holo-operator-name">
                        {user ? user.name : 'Guest Agronomist'}
                        {user && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#00df81">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        )}
                      </div>
                      <span className="holo-operator-role">Chief Agronomist & Decision Architect</span>
                      <span className="holo-operator-email">{user ? user.email : 'guest@fieldshift.local'}</span>
                    </div>
                  </div>

                  {/* Holographic Specification Grid */}
                  <div className="holo-card-specs-grid">
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">Authority Source</span>
                      <span className="holo-spec-value">PostgreSQL Synced</span>
                    </div>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">Active Station</span>
                      <span className="holo-spec-value">
                        {userFarms.find(farm => farm.id === activeField?.farm_id)?.name || 'Station Alpha'}
                      </span>
                    </div>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">Account Status</span>
                      <span className="holo-spec-value">{user ? 'Signed in' : 'Guest / demo mode'}</span>
                    </div>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">Member Since</span>
                      <span className="holo-spec-value">
                        {user && user.created_at ? formatDate(user.created_at) : 'Oct 3, 2026'}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Verification Status */}
                  <div className="holo-card-actions">
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
                      {user ? 'Signed in' : 'Guest / demo mode'}
                    </span>
                    <button
                      type="button"
                      className="btn-text-link"
                      onClick={openEditProfile}
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      Configure Profile  →
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Spatial Parcel Radar & Topographic Terrain Card */}
              <div className="spatial-terrain-card">
                <div className="theme-card-header" style={{ marginBottom: 8 }}>
                  <div className="theme-card-title-group">
                    <span className="theme-card-eyebrow">SPATIAL GIS & 3D TERRAIN RADAR</span>
                    <h3 className="theme-card-title" style={{ fontSize: 18 }}>
                      {activeField ? (activeField.is_demo ? `${activeField.name}` : activeField.name) : (lang === 'bn' ? 'কোনো জমি নির্বাচিত নেই' : 'No Field Selected')}
                    </h3>
                  </div>
                  <span className="source-tag live">
                    {activeField ? (activeField.is_demo ? 'Demo Benchmark' : `Field ID #${activeField.id}`) : 'No Selection'}
                  </span>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Authoritative parcel boundary and high-resolution topography projected from PostgreSQL GIS.
                </p>

                {/* 3D Perspective Terrain Viewport */}
                <div className="spatial-terrain-viewport">
                  <div className="spatial-mesh-overlay" />
                  <GoogleFieldMapThumbnail
                    latitude={activeField?.latitude ?? 24.8500}
                    longitude={activeField?.longitude ?? 89.3700}
                    name={activeField?.name || 'Active Farm Field'}
                    height="200px"
                    onClick={() => setActiveNav('field')}
                  />
                  <div className="spatial-hud-floating">
                    <div className="spatial-hud-chip">
                      <span>GPS:</span>
                      <strong>
                        {formatNumber(activeField?.latitude, 4, null) != null && formatNumber(activeField?.longitude, 4, null) != null
                          ? `${formatNumber(activeField.latitude, 4)}°, ${formatNumber(activeField.longitude, 4)}°`
                          : '24.8500°, 89.3700°'}
                      </strong>
                    </div>
                    <div className="spatial-hud-chip">
                      <span>Area:</span>
                      <strong>{formatNumber(activeField?.area_ha, 1) || '10.0'} ha</strong>
                    </div>
                  </div>
                </div>

                {/* 4 Spatial Telemetry Data Blocks */}
                <div className="spatial-telemetry-row">
                  <div className="spatial-telemetry-item">
                    <span className="holo-spec-label">Soil Texture</span>
                    <strong style={{ fontSize: 13, color: '#f1f5f9', textTransform: 'capitalize' }}>
                      {activeField?.soil_texture ? activeField.soil_texture.replaceAll('_', ' ') : 'Loam'}
                    </strong>
                  </div>
                  <div className="spatial-telemetry-item">
                    <span className="holo-spec-label">Organic Matter</span>
                    <strong style={{ fontSize: 13, color: 'var(--primary)' }}>
                      {formatNumber(activeField?.organic_matter, 1) || '2.5'}%
                    </strong>
                  </div>
                  <div className="spatial-telemetry-item">
                    <span className="holo-spec-label">Irrigation Cap</span>
                    <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                      {formatNumber(activeField?.irrigation_capacity_mm, 0) || '90'} mm
                    </strong>
                  </div>
                  <div className="spatial-telemetry-item">
                    <span className="holo-spec-label">Previous Crop</span>
                    <strong style={{ fontSize: 13, color: '#fbbf24' }}>
                      {activeField?.previous_crop || 'Maize'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn-text-link"
                    onClick={() => handleSelectActiveField(activeField, true)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  >
                    Open in Dashboard  →
                  </button>
                  <button
                    type="button"
                    className="dashboard-primary-run-btn"
                    onClick={() => setActiveNav('field')}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    Launch 3D Parcel Manager
                  </button>
                </div>
              </div>
            </div>

            {/* 3. 3D Holographic KPI Cubes Grid */}
            <div className="profile-3d-kpi-grid">
              <div className="kpi-3d-cube">
                <div className="kpi-cube-top">
                  <span className="kpi-cube-label">Managed Parcels</span>
                  <div className="kpi-cube-icon">🗺️</div>
                </div>
                <div>
                  <div className="kpi-cube-value">
                    {!user ? 'Guest' : !fieldsLoaded ? 'Loading...' : `${userFields.length} Registered`}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {userFields.reduce((acc, f) => acc + (Number(f.area_ha) || 0), 0).toFixed(1)} ha total farm footprint
                  </span>
                </div>
              </div>

              <div className="kpi-3d-cube">
                <div className="kpi-cube-top">
                  <span className="kpi-cube-label">Active Field Target</span>
                  <div className="kpi-cube-icon">🛰️</div>
                </div>
                <div>
                  <div className="kpi-cube-value" style={{ color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeField ? (activeField.is_demo ? `${activeField.name}` : activeField.name) : (lang === 'bn' ? 'অনির্ধারিত' : 'Unassigned')}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {activeField ? (activeField.is_demo ? 'Demo Benchmark • Active for Analysis' : `Field ID #${activeField.id} • Active for Analysis`) : 'Target unassigned'}
                  </span>
                </div>
              </div>

              <div className="kpi-3d-cube">
                <div className="kpi-cube-top">
                  <span className="kpi-cube-label">Optimization Stack</span>
                  <div className="kpi-cube-icon">⚡</div>
                </div>
                <div>
                  <div className="kpi-cube-value" style={{ color: '#38bdf8' }}>
                    MILP + RL + ML
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Multi-objective Pareto engines active
                  </span>
                </div>
              </div>

              <div className="kpi-3d-cube">
                <div className="kpi-cube-top">
                  <span className="kpi-cube-label">Climate Telemetry</span>
                  <div className="kpi-cube-icon">🌦️</div>
                </div>
                <div>
                  <div className="kpi-cube-value" style={{ color: '#fbbf24' }}>
                    NASA POWER Synced
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Empirical point telemetry hydrated
                  </span>
                </div>
              </div>
            </div>

            {/* 4. 3D Stratigraphy Soil Horizon Core & Physical Soil Passport */}
            <div className="soil-3d-core-card">
              <div className="theme-card-header" style={{ marginBottom: 4 }}>
                <div className="theme-card-title-group">
                  <span className="theme-card-eyebrow">PHYSICAL STRATIGRAPHY & SOIL HORIZONS</span>
                  <h3 className="theme-card-title" style={{ fontSize: 17 }}>Active Horizon Depth Core & Soil Matrix</h3>
                </div>
                <button
                  type="button"
                  className="btn-outline-action"
                  onClick={() => setActiveNav('field')}
                >
                  Edit Soil Core Parameters  →
                </button>
              </div>

              <div className="soil-3d-core-flex">
                {/* 3D Vertical Cylinder */}
                <div className="soil-3d-cylinder">
                  <div className="soil-cylinder-layer-a">A-Horizon (0–15 cm) • 9.8% OM</div>
                  <div className="soil-cylinder-layer-b">B-Horizon (15–40 cm) • FC 32%</div>
                  <div className="soil-cylinder-layer-c">C-Horizon (40+ cm) • Drainage</div>
                </div>

                {/* Horizon Detailed Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">A-Horizon Topsoil</span>
                      <strong style={{ fontSize: 12.5, color: '#f1f5f9' }}>Organic Matter: 9.8%</strong>
                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>High Microbial Biota & Rootzone</span>
                    </div>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">B-Horizon Subsoil</span>
                      <strong style={{ fontSize: 12.5, color: '#f1f5f9' }}>Clay Loam Substratum</strong>
                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Field Capacity: 32% • PWP: 18%</span>
                    </div>
                    <div className="holo-spec-box">
                      <span className="holo-spec-label">C-Horizon Bedrock</span>
                      <strong style={{ fontSize: 12.5, color: '#f1f5f9' }}>Weathered Floor</strong>
                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Ksat Drainage: 14.2 mm/h</span>
                    </div>
                  </div>

                  {/* Proportional soil bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#111820', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>USDA Texture Ratio:</span>
                    <div style={{ flex: 1, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: '32%', background: '#d97706' }} title="Sand 32%" />
                      <div style={{ width: '34%', background: '#0284c7' }} title="Silt 34%" />
                      <div style={{ width: '34%', background: '#16a34a' }} title="Clay 34%" />
                    </div>
                    <span style={{ fontSize: 11, color: '#f1f5f9' }}>Sand 32% • Silt 34% • Clay 34%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. System Terminal Diagnostics & Registered Parcels Quick-Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Terminal Diagnostics */}
              <div className="terminal-hud-card">
                <div className="terminal-hud-header">
                  <span style={{ color: 'var(--primary)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em' }}>
                    ● SYSTEM COMMAND TELEMETRY [LIVE]
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PORT 8000 / 5173</span>
                </div>
                <div className="terminal-logs-stream">
                  <div className="terminal-line-ok">[SYSTEM] Database Engine: {backendHealth?.database || 'sqlite'} ({backendHealth?.status || 'connected'})</div>
                  <div className="terminal-line-ok">[CLIMATE] NASA POWER data mode: {nasa?.data_mode || 'cache'}</div>
                  <div className="terminal-line-ok">[SOLVER] PuLP CBC MILP engine active</div>
                  <div className="terminal-line-ok">[SOLVER_OK] MILP CBC dynamic rotation optimization Pareto active</div>
                  <div className="terminal-line-dim">[INFO] Active field target: {activeField ? `#${activeField.id} (${activeField.name})` : 'Unassigned'}</div>
                </div>
              </div>

              {/* Registered Farm Parcels Hub */}
              <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="theme-card-header" style={{ marginBottom: 8 }}>
                    <div className="theme-card-title-group">
                      <span className="theme-card-eyebrow">POSTGRESQL PARCEL REGISTRY</span>
                      <h3 className="theme-card-title" style={{ fontSize: 16 }}>Registered Farm Parcels</h3>
                    </div>
                    <span className="field-count-pill" style={{ background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)', border: '1px solid rgba(0, 223, 129, 0.3)' }}>
                      {userFields.length} Fields
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Field boundaries, stratigraphy cores, and Google Maps GPS markers are centralized in the dedicated manager.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {userFields.slice(0, 2).map(f => (
                      <div
                        key={f.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: f.id === activeField?.id ? 'rgba(0, 223, 129, 0.08)' : '#18222b',
                          border: `1px solid ${f.id === activeField?.id ? 'var(--primary)' : 'var(--border-light)'}`,
                          borderRadius: 8
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{f.name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {formatNumber(f.latitude, 4)}°, {formatNumber(f.longitude, 4)}° • {f.area_ha} ha
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-text-link"
                          onClick={() => handleSelectActiveField(f, false)}
                          style={{ fontSize: 11.5, fontWeight: 700 }}
                        >
                          {f.id === activeField?.id ? 'Active Field ✓' : 'Select Field'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    className="dashboard-primary-run-btn"
                    onClick={() => setActiveNav('field')}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12.5, padding: '8px 14px' }}
                  >
                    Open Field & Parcel Manager →
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setActiveNav('field');
                      openAddFieldModal();
                    }}
                    style={{ fontSize: 12.5, padding: '8px 14px' }}
                  >
                    + Add Field
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= GLOBAL MODALS LAYER ================= */}

            {/* ADD / EDIT FIELD MODAL */}
            {fieldModal && (
              <div className="modal-backdrop" onClick={() => !fieldModalLoading && setFieldModal(null)}>
                <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h3>{fieldModal === 'edit' ? `Edit Field: ${fieldForm.name || 'Parcel'}` : 'Add New Agricultural Field'}</h3>
                    <button type="button" className="modal-close-btn" onClick={() => !fieldModalLoading && setFieldModal(null)}>×</button>
                  </div>
                  <form onSubmit={handleFieldFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px' }}>
                      <div className="form-group">
                        <label>Field Name *</label>
                        <input
                          className="input-box"
                          placeholder="e.g. North Plot 1"
                          value={fieldForm.name}
                          onChange={e => setFieldForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>

                      {/* Interactive Google Maps Field Location Picker */}
                      <div className="form-group">
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>Interactive Field Location (Google Maps) *</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click or drag marker to set coordinates</span>
                        </label>
                        <GoogleFieldMapPicker
                          latitude={fieldForm.latitude}
                          longitude={fieldForm.longitude}
                          onChange={(lat, lng) => {
                            setFieldForm(prev => ({
                              ...prev,
                              latitude: String(lat),
                              longitude: String(lng)
                            }));
                          }}
                          onLocationNameChange={(locName) => {
                            if (!fieldForm.name || fieldForm.name.startsWith('Field') || fieldForm.name.startsWith('Parcel')) {
                              setFieldForm(prev => ({ ...prev, name: prev.name || locName }));
                            }
                          }}
                        />
                      </div>

                      {/* Precise Synced Latitude & Longitude Inputs */}
                      <div className="form-grid-inner">
                        <div className="form-group">
                          <label>Latitude (° N) *</label>
                          <input
                            className="input-box"
                            type="number"
                            step="0.0001"
                            value={fieldForm.latitude}
                            onChange={e => setFieldForm(prev => ({ ...prev, latitude: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Longitude (° E) *</label>
                          <input
                            className="input-box"
                            type="number"
                            step="0.0001"
                            value={fieldForm.longitude}
                            onChange={e => setFieldForm(prev => ({ ...prev, longitude: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-grid-inner">
                        <div className="form-group">
                          <label>Field Size (ha) *</label>
                          <input
                            className="input-box"
                            type="number"
                            step="0.1"
                            value={fieldForm.area_ha}
                            onChange={e => setFieldForm(prev => ({ ...prev, area_ha: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Soil Texture</label>
                          <select
                            className="input-box"
                            value={fieldForm.soil_texture}
                            onChange={e => setFieldForm(prev => ({ ...prev, soil_texture: e.target.value }))}
                          >
                            <option value="loam">Loam</option>
                            <option value="silty_loam">Silty Loam</option>
                            <option value="clay_loam">Clay Loam</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-grid-inner">
                        <div className="form-group">
                          <label>Soil pH (0 - 14)</label>
                          <input
                            className="input-box"
                            type="number"
                            step="0.1"
                            min="0"
                            max="14"
                            placeholder="e.g. 6.5"
                            value={fieldForm.soil_ph}
                            onChange={e => setFieldForm(prev => ({ ...prev, soil_ph: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Organic Matter (%)</label>
                          <input
                            className="input-box"
                            type="number"
                            step="0.1"
                            value={fieldForm.organic_matter}
                            onChange={e => setFieldForm(prev => ({ ...prev, organic_matter: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="form-grid-inner">
                        <div className="form-group">
                          <label>Irrigation Capacity (mm)</label>
                          <input
                            className="input-box"
                            type="number"
                            step="1"
                            value={fieldForm.irrigation_capacity_mm}
                            onChange={e => setFieldForm(prev => ({ ...prev, irrigation_capacity_mm: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Previous Crop Year</label>
                          <input
                            className="input-box"
                            type="number"
                            step="1"
                            value={fieldForm.previous_crop_year}
                            onChange={e => setFieldForm(prev => ({ ...prev, previous_crop_year: e.target.value }))}
                          />
                        </div>
                      </div>

                      {fieldModalError && (
                        <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{fieldModalError}</p>
                      )}
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '14px 22px', borderTop: '1px solid var(--border-light)', background: '#ffffff', flexShrink: 0, boxShadow: '0 -2px 10px rgba(0,0,0,0.04)' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setFieldModal(null)}
                        disabled={fieldModalLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="run-cta-btn"
                        style={{ padding: '8px 20px', fontSize: 13.5 }}
                        disabled={fieldModalLoading}
                      >
                        {fieldModalLoading ? 'Saving…' : (fieldModal === 'edit' ? 'Update Field' : 'Save New Field')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW FIELD DETAILS MODAL */}
            {viewingField && (
              <div className="modal-backdrop" onClick={() => setViewingField(null)}>
                <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{viewingField.name}</h3>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Field ID #{viewingField.id} • Farm Station #{viewingField.farm_id}</span>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={() => setViewingField(null)}>×</button>
                  </div>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px' }}>
                    {/* Read-only Google Maps Field Location View */}
                    <div className="form-group">
                      <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Field Parcel Satellite Map</label>
                      <GoogleFieldMapPicker
                        latitude={viewingField.latitude}
                        longitude={viewingField.longitude}
                        readOnly={true}
                        onChange={() => {}}
                      />
                    </div>

                    {/* Parameters Table */}
                    <div className="field-metrics-table">
                      <div className="metric-cell">
                        <span>Field Size:</span>
                        <strong>{viewingField.area_ha != null ? `${viewingField.area_ha} ha` : 'Not provided'}</strong>
                      </div>
                      <div className="metric-cell">
                        <span>Soil Texture:</span>
                        <strong style={{ textTransform: 'capitalize' }}>{viewingField.soil_texture ? viewingField.soil_texture.replaceAll('_', ' ') : 'Not provided'}</strong>
                      </div>
                      <div className="metric-cell">
                        <span>Soil pH:</span>
                        <strong>{viewingField.soil_ph != null ? viewingField.soil_ph : 'Not provided'}</strong>
                      </div>
                      <div className="metric-cell">
                        <span>Organic Matter:</span>
                        <strong>{viewingField.organic_matter != null ? `${viewingField.organic_matter} %` : 'Not provided'}</strong>
                      </div>
                      <div className="metric-cell">
                        <span>Irrigation Capacity:</span>
                        <strong>{viewingField.irrigation_capacity_mm != null ? `${viewingField.irrigation_capacity_mm} mm` : 'Not provided'}</strong>
                      </div>
                    </div>

                    {/* Crop History Table */}
                    <div>
                      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Crop History Records</h4>
                      {viewingField.history && viewingField.history.length > 0 ? (
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
                          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--bg-card-subtle)' }}>
                              <tr>
                                <th style={{ padding: '8px 12px' }}>Year</th>
                                <th style={{ padding: '8px 12px' }}>Crop</th>
                                <th style={{ padding: '8px 12px' }}>Season</th>
                                <th style={{ padding: '8px 12px' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewingField.history.map((hist, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid var(--border-light)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>{hist.year}</td>
                                  <td style={{ padding: '8px 12px' }}><span className="crop-chip">{hist.crop}</span></td>
                                  <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{hist.season || 'Annual'}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{hist.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
                          No prior crop rotations recorded for this field parcel.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1px solid var(--border-light)', background: '#ffffff', flexShrink: 0, boxShadow: '0 -2px 10px rgba(0,0,0,0.04)' }}>
                    <button
                      type="button"
                      className="btn-field-archive"
                      onClick={() => {
                        handleArchiveField(viewingField);
                      }}
                    >
                      Archive Field
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        className="btn-field-action"
                        onClick={() => {
                          const fld = viewingField;
                          setViewingField(null);
                          openEditFieldModal(fld);
                        }}
                      >
                        Edit Field
                      </button>
                      <button
                        type="button"
                        className="btn-select-analysis"
                        onClick={() => {
                          const fld = viewingField;
                          setViewingField(null);
                          selectFieldForAnalysis(fld);
                        }}
                      >
                        Select for Analysis  → 
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OPERATOR PROFILE EDIT MODAL */}
            {profileModal && (
              <div className="modal-backdrop" onClick={() => !profileLoading && setProfileModal(false)}>
                <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h3>Edit Agronomist Profile & Station</h3>
                    <button type="button" className="modal-close-btn" onClick={() => !profileLoading && setProfileModal(false)}>×</button>
                  </div>
                  <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px' }}>
                      <div className="form-group">
                        <label>Operator Full Name *</label>
                        <input
                          className="input-box"
                          value={profileName}
                          onChange={e => setProfileName(e.target.value)}
                          placeholder="e.g. Dani"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Agricultural Research Station / Farm Name *</label>
                        <input
                          className="input-box"
                          value={profileFarmName}
                          onChange={e => setProfileFarmName(e.target.value)}
                          placeholder="e.g. Dhaka Research Basin Station #27"
                          required
                        />
                      </div>
                      {profileError && (
                        <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{profileError}</p>
                      )}
                      {profileSuccess && (
                        <p style={{ color: '#27ae60', fontSize: 13, margin: 0 }}>{profileSuccess}</p>
                      )}
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border-light)', background: '#ffffff', flexShrink: 0, boxShadow: '0 -2px 10px rgba(0,0,0,0.04)' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setProfileModal(false)}
                        disabled={profileLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="run-cta-btn"
                        style={{ padding: '8px 20px', fontSize: 13.5 }}
                        disabled={profileLoading}
                      >
                        {profileLoading ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* AUTHENTICATION / LOGIN / REGISTER MODAL */}
            {authModal && (
              <div className="modal-backdrop" onClick={() => setAuthModal(false)}>
                <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                  <div className="modal-header">
                    <h3>{authMode === 'register' ? 'Register Agronomist Account' : 'Sign In to FieldShift'}</h3>
                    <button type="button" className="modal-close-btn" onClick={() => setAuthModal(false)}>×</button>
                  </div>
                  <form onSubmit={handleAuthSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 22px' }}>
                      <div className="auth-tabs" style={{ display: 'flex', gap: 8, marginBottom: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                        <button
                          type="button"
                          className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                          onClick={() => { setAuthMode('login'); setAuthError(''); setAuthMsg(''); }}
                          style={{ fontWeight: 600, padding: '6px 12px', background: authMode === 'login' ? 'rgba(0, 223, 129, 0.15)' : 'transparent', color: authMode === 'login' ? 'var(--primary)' : 'inherit', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                          onClick={() => { setAuthMode('register'); setAuthError(''); setAuthMsg(''); }}
                          style={{ fontWeight: 600, padding: '6px 12px', background: authMode === 'register' ? 'rgba(0, 223, 129, 0.15)' : 'transparent', color: authMode === 'register' ? 'var(--primary)' : 'inherit', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Create Account
                        </button>
                      </div>

                      {authMode === 'register' && (
                        <div className="form-group">
                          <label>Full Name *</label>
                          <input
                            className="input-box"
                            value={authForm.name}
                            onChange={e => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Dr. Jane Doe"
                            required
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          className="input-box"
                          type="email"
                          value={authForm.email}
                          onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. farmer@fieldshift.local"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Password *</label>
                        <input
                          className="input-box"
                          type="password"
                          value={authForm.password}
                          onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter your password"
                          required
                        />
                      </div>

                      {authError && (
                        <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{authError}</p>
                      )}
                      {authMsg && (
                        <p style={{ color: '#27ae60', fontSize: 13, margin: 0 }}>{authMsg}</p>
                      )}
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderTop: '1px solid var(--border-light)' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleQuickDemoLogin}
                        style={{ fontSize: 12 }}
                      >
                        Use Demo Session
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setAuthModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="run-cta-btn"
                          style={{ padding: '8px 18px', fontSize: 13 }}
                        >
                          {authMode === 'register' ? 'Register' : 'Sign In'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

        {/* Floating Farmer Voice Assistant Component */}
        <FarmerVoiceAssistant
          activeField={activeField}
          nasa={nasa}
          lang={lang}
          onNavigate={handleNavigate}
          onOpenAssistant={() => handleNavigate('assistant')}
        />

        {/* Mobile Persistent Bottom Navigation Bar (Visible only on narrow screens <= 768px) */}
        <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
            title="Home"
          >
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'field' || activeNav === 'field_map' ? 'active' : ''}`}
            onClick={() => handleNavigate('field')}
            title="My Farm"
          >
            <span className="mobile-nav-icon">🗺️</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'জমি' : 'Farm'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'crop_advice' ? 'active' : ''}`}
            onClick={() => handleNavigate('crop_advice')}
            title="Crop Advice & Planting"
          >
            <span className="mobile-nav-icon">🌱</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'পরামর্শ' : 'Crops'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'farm_planning' ? 'active' : ''}`}
            onClick={() => handleNavigate('farm_planning')}
            title="Farm Planning"
          >
            <span className="mobile-nav-icon">📐</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'পরিকল্পনা' : 'Plan'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'research' || activeNav === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavigate('research')}
            title="Research Lab"
          >
            <span className="mobile-nav-icon">🔬</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'ল্যাব' : 'Lab'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${mobileNavOpen ? 'active' : ''}`}
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="Open full 12-section menu drawer"
            title="Menu"
          >
            <span className="mobile-nav-icon">☰</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'মেন্যু' : 'Menu'}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
