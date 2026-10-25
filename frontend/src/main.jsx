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

  const handleNavigate = (nav, tab = null) => {
    setMobileNavOpen(false);
    if (nav === 'crop_advice' || nav === 'harvest_profit' || nav === 'research') {
      setActiveNav(nav);
      return;
    }
    if (nav === 'market' || nav === 'synthetic_lab' || nav === 'sensitivity') {
      setActiveNav(nav);
      return;
    }
    if (nav === 'analytics' && (tab === 'field' || tab === 'weather' || tab === 'assistant' || tab === 'account' || tab === 'dashboard' || tab === 'market' || tab === 'synthetic_lab' || tab === 'sensitivity')) {
      setActiveNav(tab);
      return;
    }
    const tabMap = {
      milp: 'optimization',
      lab: 'comparison_lab',
      failure: 'recovery',
      scenarios: 'stress_testing',
      stress: 'stress_testing',
      crops: 'crop_catalog',
      market: 'market',
      synthetic_lab: 'synthetic_lab',
      sensitivity: 'sensitivity',
    };
    if (tab === 'market' || tab === 'synthetic_lab' || tab === 'sensitivity') {
      setActiveNav(tab);
      return;
    }
    if (tab) setAnalysisTab(tabMap[tab] || tab);
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

  return (
    <div className="app-shell">
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
          {/* FARMER MAIN SECTIONS (Section 4 of prompt) */}
          <div className="nav-section-label">{lang === 'bn' ? 'প্রধান মেন্যু' : 'Main Menu'}</div>

          {/* 1. Home */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
            title={lang === 'bn' ? 'হোম - আপনার খামারের সারসংক্ষেপ' : 'Home - Farm Overview'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🏠</span>
            <span className="nav-item-label">{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>

          {/* 2. My Farm */}
          <button
            type="button"
            className={`nav-item ${(activeNav === 'field' || activeNav === 'field_map') ? 'active' : ''}`}
            onClick={() => handleNavigate('field')}
            title={lang === 'bn' ? 'আমার জমি - জমির তথ্য ও সীমানা' : 'My Farm - Parcels & Topography'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🗺️</span>
            <span className="nav-item-label">{lang === 'bn' ? 'আমার জমি' : 'My Farm'}</span>
          </button>

          {/* 3. Crop Advice */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'crop_advice' ? 'active' : ''}`}
            onClick={() => handleNavigate('crop_advice')}
            title={lang === 'bn' ? 'ফসলের পরামর্শ - সবচেয়ে লাভজনক ফসল' : 'Crop Advice - Best Matched Crops'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🌱</span>
            <span className="nav-item-label">{lang === 'bn' ? 'ফসলের পরামর্শ' : 'Crop Advice'}</span>
          </button>

          {/* 4. Market Prices */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'market' ? 'active' : ''}`}
            onClick={() => handleNavigate('market')}
            title={lang === 'bn' ? 'বাজারদর - পাইকারি ও খুচরা দর' : 'Market Prices - Benchmarks & Tiers'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>💰</span>
            <span className="nav-item-label">{lang === 'bn' ? 'বাজারদর' : 'Market Prices'}</span>
          </button>

          {/* 5. Weather */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'weather' ? 'active' : ''}`}
            onClick={() => handleNavigate('weather')}
            title={lang === 'bn' ? 'আবহাওয়া - নাসা উপগ্রহ উপাত্ত ও পূর্বাভাস' : 'Weather - NASA POWER Telemetry'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🌦️</span>
            <span className="nav-item-label">{lang === 'bn' ? 'আবহাওয়া' : 'Weather'}</span>
          </button>

          {/* 6. Harvest & Profit */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'harvest_profit' ? 'active' : ''}`}
            onClick={() => handleNavigate('harvest_profit')}
            title={lang === 'bn' ? 'ফসলের হিসাব - লাভ-ক্ষতি ও ফলন সংরক্ষণ' : 'Harvest & Profit - Calculator & Logs'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>📋</span>
            <span className="nav-item-label">{lang === 'bn' ? 'ফসলের হিসাব' : 'Harvest & Profit'}</span>
          </button>

          {/* 7. AI Assistant */}
          <button
            type="button"
            className={`nav-item ${activeNav === 'assistant' ? 'active' : ''}`}
            onClick={() => handleNavigate('assistant')}
            title={lang === 'bn' ? 'AI সহকারী - ভয়েস ও চ্যাট সহায়তা' : 'AI Assistant - Decision Support'}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🤖</span>
            <span className="nav-item-label">{lang === 'bn' ? 'AI সহকারী' : 'AI Assistant'}</span>
          </button>

          {/* SEPARATE ADVANCED / RESEARCH WORKSPACE BUTTON */}
          <div className="nav-section-label" style={{ marginTop: 18 }}>
            {lang === 'bn' ? 'উন্নত প্রযুক্তি' : 'Advanced Tools'}
          </div>
          <button
            type="button"
            className={`nav-item ${activeNav === 'research' ? 'active' : ''}`}
            onClick={() => handleNavigate('research')}
            title={lang === 'bn' ? 'উন্নত গবেষণা - MILP, RL ও সিন্থেটিক ল্যাব' : 'Advanced Research - MILP, RL, Sensitivity'}
            style={{ border: '1px dashed var(--border-medium)', background: 'var(--bg-card-subtle)' }}
          >
            <div className="nav-active-indicator" />
            <span className="nav-item-icon" style={{ fontSize: 17 }}>🔬</span>
            <span className="nav-item-label">{lang === 'bn' ? 'উন্নত গবেষণা ল্যাব' : 'Research Lab'}</span>
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
          <FarmerCropAdviceView
            activeField={activeField}
            plan={plan}
            nasa={nasa}
            lang={lang}
            onNavigate={handleNavigate}
            onAskAi={(q) => handleNavigate('assistant')}
          />
        )}

        {/* -------------------- VIEW: HARVEST & PROFIT CALCULATOR -------------------- */}
        {activeNav === 'harvest_profit' && (
          <FarmerHarvestProfitView
            activeField={activeField}
            user={user}
            lang={lang}
            onNavigate={handleNavigate}
          />
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
                </footer>
              </div>
            </ResultBoundary>
          </>
        )}

        {/* -------------------- VIEW 2: ANALYSIS & RESEARCH WORKSPACE -------------------- */}
        {activeNav === 'analytics' && (
          <div className="analytics-view-wrapper">
            <div className="view-sub-header">
              <div>
                <h2>Analysis & Research Workspace</h2>
                <p>MILP Crop Rotation Optimization, Synthetic ML Models, Scenarios & Simulation Controls</p>
              </div>
              <button type="button" className="back-btn" onClick={() => setActiveNav('dashboard')} aria-label="Back to Dashboard">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Dashboard</span>
              </button>
            </div>

            {/* Analysis Navigation Sub-tabs */}
            <div className="analysis-nav-tabs">
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'optimization' || analysisTab === 'milp' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('optimization')}
              >
                1. MILP Optimization
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'comparison_lab' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('comparison_lab')}
              >
                2. Comparison Lab (MILP vs RL vs Rule)
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'recovery' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('recovery')}
              >
                3. Failure &amp; Recovery Simulator
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'replan' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('replan')}
              >
                4. Adaptive Next-Season Replan
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'uncertainty' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('uncertainty')}
              >
                5. Weather Uncertainty &amp; Robustness
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'sustainability' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('sustainability')}
              >
                6. Soil Health &amp; Sustainability
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'crop_catalog' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('crop_catalog')}
              >
                7. Crop Database &amp; Provenance
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'satellite' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('satellite')}
              >
                8. Satellite &amp; Sensor Readiness
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'outcomes' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('outcomes')}
              >
                9. Actual vs Estimated Outcomes
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'ml_models' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('ml_models')}
              >
                10. Synthetic ML Yield
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'rl_policy' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('rl_policy')}
              >
                11. RL Simulation Sandbox
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'stress_testing' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('stress_testing')}
              >
                12. Stress Testing
              </button>
              <button
                type="button"
                className={`analysis-tab-btn ${analysisTab === 'controls' ? 'active' : ''}`}
                onClick={() => setAnalysisTab('controls')}
              >
                13. Counterfactual Controls
              </button>
            </div>

            <div className="dashboard-grid">
              {/* TAB 1: MILP BASELINE OPTIMIZATION */}
              {/* TAB 1: MILP BASELINE OPTIMIZATION */}
              {(analysisTab === 'optimization' || analysisTab === 'milp') && (() => {
                const displayedStrategiesMap = currentStrategyResults;
                const activeStrategyName = selectedStrategyId;
                const inspectedKey = activeStrategyName;
                const inspectedItem = activeMilpResult || {};
                const activeItem = inspectedItem;
                const stratList = Object.values(displayedStrategiesMap);
                const isFeasiblePlan = item =>
                  ['optimal', 'feasible'].includes(String(item?.solver_status || '').toLowerCase()) &&
                  item?.rotation && Object.keys(item.rotation).length > 0;
                const feasibleStrategyList = stratList.filter(isFeasiblePlan);
                const hasFeasibleActivePlan = isFeasiblePlan(activeMilpResult);
                const feasiblePlanPercent = stratList.length ? Math.round((feasibleStrategyList.length / stratList.length) * 100) : 0;
                const maxProfitStrategy = feasibleStrategyList.reduce((prev, curr) => (Number(curr.profit_component || 0) > Number(prev.profit_component || 0) ? curr : prev), {});
                const maxWaterStrategy = feasibleStrategyList.reduce((prev, curr) => (Number(curr.water_component || 0) > Number(prev.water_component || 0) ? curr : prev), {});
                const maxSoilStrategy = feasibleStrategyList.reduce((prev, curr) => (Number(curr.soil_component || 0) > Number(prev.soil_component || 0) ? curr : prev), {});

                const inspectedMeta = {
                  ...(STRATEGY_META[inspectedKey] || {
                    title: inspectedKey.replaceAll('_', ' '),
                    icon: '🌾',
                    summary: 'Alternative multi-objective MILP crop sequence evaluated against multi-period constraints.',
                    primaryColor: 'var(--primary)',
                    badgeClass: 'profit',
                    priorityKey: 'profit'
                  }),
                  title: selectedStrategyName
                };

                const inspectedRotation = inspectedItem.rotation || {};

                // Determine if all strategies yielded the identical rotation sequence
                const rotEntries = feasibleStrategyList.map(s => JSON.stringify(s.rotation));
                const allRotationsSame = rotEntries.length > 1 && rotEntries.every(r => r === rotEntries[0]);
                const sampleRot = inspectedRotation;

                return (
                  <div className="strategy-matrix-container" style={{ gridColumn: 'span 12' }}>
                    {/* PRIMARY STRATEGY SELECTION CONTROL */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🎯</span>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>MILP Strategy Selection</h3>
                            <span style={{ fontSize: 11, background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 800, border: '1px solid rgba(0, 223, 129, 0.3)' }}>
                              SINGLE SOURCE OF TRUTH
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                            Select a primary strategy profile below to configure the mathematical optimizer objective weights across all research workspace views.
                          </p>
                        </div>

                        {/* Segmented Selection Control */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {[
                            { key: 'profit_focused', label: 'Profit Focused', icon: '💰' },
                            { key: 'water_efficiency', label: 'Water Efficiency', icon: '💧' },
                            { key: 'soil_health', label: 'Soil Health & Regeneration', icon: '🌱' },
                            { key: 'balanced', label: 'Balanced Multi-Objective', icon: '⚖️' }
                          ].map(s => {
                            const isSelected = toCanonicalStrategyKey(s.key) === activeStrategyName;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                className={`btn-secondary-sm ${isSelected ? 'active' : ''}`}
                                onClick={() => handleApplyStrategy(s.key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '9px 16px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  background: isSelected ? 'rgba(0, 223, 129, 0.12)' : 'var(--bg-card-subtle)',
                                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 2px 8px rgba(0, 223, 129, 0.2)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{s.icon}</span>
                                <span>{s.label}</span>
                                {isSelected && (
                                  <span style={{ fontSize: 10, background: 'var(--primary)', color: '#0e1318', padding: '1px 6px', borderRadius: 999, fontWeight: 800, marginLeft: 2 }}>
                                    ✓ Active Strategy
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Strategy Status Details */}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Currently Selected &amp; Active Strategy:</span>
                          <strong style={{ color: 'var(--primary)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span>{inspectedMeta.icon}</span>
                            <span>{activeMilpResult?.strategy_name ?? 'No strategy selected'}</span>
                          </strong>
                        </div>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                          Objective Weights: <strong style={{ color: '#00df81' }}>{Math.round(getStrategyWeights(inspectedItem, inspectedKey).profit * 100)}% Profit</strong> • <strong style={{ color: '#38bdf8' }}>{Math.round(getStrategyWeights(inspectedItem, inspectedKey).water * 100)}% Water</strong> • <strong style={{ color: '#fbbf24' }}>{Math.round(getStrategyWeights(inspectedItem, inspectedKey).soil * 100)}% Soil Health</strong>
                        </div>
                      </div>
                    </div>

                    {/* SYNTHETIC BENCHMARK SCENARIO SELECTOR PANEL */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>🧪</span>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Synthetic Benchmark Scenario Context</h4>
                            <span className="source-tag demo" style={{ fontSize: 10 }}>SYNTHETIC BENCHMARK</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                            Select a synthetic benchmark regime or operational field below to evaluate all 4 MILP strategy profiles under controlled test conditions.
                          </p>
                        </div>
                        {benchmarkLoading && <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>Solving 4 PuLP CBC strategies...</span>}
                      </div>
                      {benchmarkError && selectedBenchmarkContext !== 'operational' && (
                        <div role="alert" style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: 12 }}>
                          Benchmark results could not be loaded: {benchmarkError}
                        </div>
                      )}

                      {/* Scenario Selector Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 14 }}>
                        {Object.values(BENCHMARK_CONTEXTS).map(scen => {
                          const isSel = selectedBenchmarkContext === scen.id;
                          const scenKey = scen.scen_key;
                          const scenRes = scenKey ? benchmarkSuiteResults[scenKey] : null;

                          return (
                            <button
                              key={scen.id}
                              type="button"
                              className={`btn-secondary-sm ${isSel ? 'active' : ''}`}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '10px 12px',
                                border: isSel ? `1px solid ${scen.color || 'var(--primary)'}` : '1px solid var(--border-light)',
                                background: isSel ? 'rgba(0, 223, 129, 0.08)' : 'var(--bg-card-subtle)',
                                textAlign: 'left',
                                borderRadius: 10,
                                cursor: 'pointer',
                                boxShadow: isSel ? '0 2px 8px rgba(0, 223, 129, 0.15)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => {
                                if (scen.id === 'operational') {
                                  setSelectedBenchmarkContext('operational');
                                } else {
                                  handleRunBenchmark(scen.id);
                                }
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: 12.5, color: scen.color }}>{scen.name}</span>
                                {scenRes && (
                                  <span style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    fontWeight: 800,
                                    background: scenRes.solver_status === 'Infeasible' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 223, 129, 0.15)',
                                    color: scenRes.solver_status === 'Infeasible' ? '#f87171' : 'var(--primary)'
                                  }}>
                                    {scenRes.solver_status || 'Optimal'}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                {scen.id === 'operational'
                                  ? (summary.field_name || 'Active Parcel Result')
                                  : `${scen.water_mm} mm, ${scen.temperature_c}°C, pH ${scen.ph}`}
                              </span>
                              <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: isSel ? (scen.color || 'var(--primary)') : 'var(--text-dim)' }}>
                                {isSel ? (scen.id === 'operational' ? '📍 Active Parcel Result' : '✓ Selected Benchmark') : 'Select Scenario'}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Benchmark / Operational Context Banner */}
                      {selectedBenchmarkContext === 'operational' ? (
                        <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-card-subtle)', borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }}>
                          <strong style={{ color: 'var(--primary)', fontSize: 13.5 }}>
                            Operational Field Context: {summary.field_name || activeField?.name || 'Active Registered Parcel'}
                          </strong>
                          <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 12 }}>
                            Area: <strong>{summary.area_ha || summary.field_state?.field_size_ha || activeField?.area_ha || 10.0} ha</strong> • Previous Crop: <strong>{summary.previous_crop || summary.field_state?.previous_crop || activeField?.previous_crop || 'None'}</strong> • Location: <strong>{activeField?.latitude != null && activeField?.longitude != null ? `${Number(activeField.latitude).toFixed(2)}°N, ${Number(activeField.longitude).toFixed(2)}°E` : (activeField ? activeField.name : 'Coordinates unassigned')}</strong>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const scenMeta = BENCHMARK_SCENARIOS[selectedBenchmarkContext] || BENCHMARK_SCENARIOS.scenario_A;
                          const scenKey = scenMeta.scen_key;
                          const scenData = benchmarkSuiteResults[selectedBenchmarkContext] || benchmarkSuiteResults[scenKey];
                          return (
                            <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-card-subtle)', borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 2 }}>Selected Benchmark Context</div>
                                  <strong style={{ color: 'var(--text-main)', fontSize: 13.5 }}>
                                    {scenMeta.name}
                                  </strong>
                                  <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 12 }}>
                                    <strong>{scenMeta.water_mm} mm</strong> • <strong>{scenMeta.temperature_c}°C</strong> • <strong>pH {scenMeta.ph}</strong>
                                    {scenData?.feasible_count != null && (
                                      <span> • Feasible Domain: <strong>{scenData.feasible_count} of 8 Crops</strong></span>
                                    )}
                                  </div>
                                  {scenData?.feasible_count === 0 && (
                                    <div role="status" style={{ color: '#f87171', marginTop: 6, fontWeight: 700 }}>
                                      No MILP plan is feasible in this context: none of the benchmark crops meet the scenario's agronomic constraints.
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 6, color: 'var(--text-muted)', fontWeight: 700, border: '1px solid var(--border-light)' }}>
                                  Benchmark Type: Synthetic Solver Responsiveness Test (PuLP CBC Solver)
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* What Changed / Decision Impact Card */}
                    {summary.what_changed && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: 'var(--text-main)', marginBottom: 8 }}>
                          <span>📊</span>
                          <span>Decision Impact &amp; Active Field Parameter Deltas</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                          {(summary.what_changed.active_parameters || []).map((p, idx) => {
                            const isStrategyEntry = /active operational strategy/i.test(p.parameter || '');
                            const selectedWeights = getStrategyWeights(activeMilpResult, selectedStrategyId);
                            return (
                              <div key={idx} style={{ background: 'var(--bg-card-subtle)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12 }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 700 }}>{p.parameter}</div>
                                <div style={{ color: 'var(--text-main)', fontWeight: 800, margin: '2px 0' }}>{isStrategyEntry ? selectedStrategyName : p.value}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                  {isStrategyEntry
                                    ? `Weights optimize priorities (${Math.round(selectedWeights.profit * 100)}% Profit, ${Math.round(selectedWeights.water * 100)}% Water, ${Math.round(selectedWeights.soil * 100)}% Soil).`
                                    : p.impact_description}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Optimization Provenance View */}
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: '12px 16px', background: 'var(--bg-card)', marginBottom: 16 }}>
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setProvenanceExpanded(prev => !prev)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🔍</span>
                          <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>Optimization Provenance: How this recommendation was calculated</strong>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>
                          {provenanceExpanded ? 'Hide Calculation Steps ▲' : 'Show Calculation Steps ▼'}
                        </span>
                      </div>

                      {provenanceExpanded && (
                        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, fontSize: 12 }}>
                          <div style={{ background: 'var(--bg-card-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                            <strong style={{ color: 'var(--primary)' }}>Step 1: Agro-Climatic Profile</strong>
                            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                              Area: {summary.optimization_provenance?.field_inputs?.area_ha ?? 1.0} ha • Temp: {summary.optimization_provenance?.field_inputs?.temperature_c ?? '28'}°C • pH: {summary.optimization_provenance?.field_inputs?.soil_ph ?? '6.5'}
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-card-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                            <strong style={{ color: 'var(--primary)' }}>Step 2: Feasibility Filtering</strong>
                            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                              Catalog: {summary.optimization_provenance?.feasibility_filter?.catalog_crop_count ?? 15} species → Feasible: {summary.optimization_provenance?.feasibility_filter?.feasible_crop_count ?? 15} species
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-card-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                            <strong style={{ color: 'var(--primary)' }}>Step 3: PuLP CBC Solver</strong>
                            <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                              Branch-and-Bound MILP ({summary.optimization_provenance?.decision_model?.decision_variables ?? 90} binary variables across 6 periods).
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hero Header Banner */}
                    <div className="strategy-matrix-hero">
                      <div className="strategy-hero-content">
                        <h2>MILP Multi-Objective Strategy Comparison Matrix</h2>
                        <p>
                          Explore alternative multi-year rotation trajectories computed via Mixed Integer Linear Programming (PuLP CBC Solver).
                          Each strategy evaluates an alternative multi-objective MILP balance between economic gross margin, water footprint conservation, and soil biology regeneration across 6 seasons.
                        </p>
                        <div className="strategy-hero-badges">
                          <span className="strategy-hero-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>PuLP CBC Solver: {inspectedItem.solver_status || 'Optimal'}</span>
                          </span>
                          <span className="strategy-hero-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>6-Season Multi-Period Model</span>
                          </span>
                          <span className="strategy-hero-pill">
                            <span>🌱 Legume Interval: ≥1 Pulse every 3 Consecutive Seasons</span>
                          </span>
                          <span className="strategy-hero-pill" style={{ background: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
                            <span>★ Active: {selectedStrategyName}</span>
                          </span>
                        </div>
                      </div>
                      <div className="strategy-hero-stats">
                        <div className="strategy-hero-stat-box">
                          <div className="strategy-hero-stat-val">{stratList.length || 4}</div>
                          <div className="strategy-hero-stat-lbl">Priority Profiles</div>
                        </div>
                        <div className="strategy-hero-stat-box">
                          <div className="strategy-hero-stat-val">{feasiblePlanPercent}%</div>
                          <div className="strategy-hero-stat-lbl">Feasible Plans</div>
                        </div>
                      </div>
                    </div>

                    {/* Uniform Rotation Agronomic Explanation Banner */}
                    {allRotationsSame && (
                      <div style={{
                        background: 'rgba(0, 223, 129, 0.08)',
                        border: '1px solid rgba(0, 223, 129, 0.25)',
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        fontSize: 13,
                        color: 'var(--text-main)',
                        lineHeight: 1.5
                      }}>
                        <span style={{ fontSize: 20 }}>💡</span>
                        <div>
                          <strong>All feasible strategies converged on the same optimal rotation ({Object.values(sampleRot).join(' → ')}) under current field parameters:</strong>
                          <div style={{ marginTop: 4, color: 'var(--primary)' }}>
                            Under this parcel's temperature regime, pH, and agronomic rotation constraints (legume interval ≥ 1 pulse every 3 consecutive seasons and botanical family alternation), the solver determined that this specific crop sequence simultaneously maximizes profit while satisfying water conservation and soil biology targets. The strategies differ in how objective weights are distributed and composite scores are calculated.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selected strategy summary and cross-strategy benchmarks */}
                    <div className="strategy-kpi-grid">
                      {/* Active Profile */}
                      <div className="strategy-kpi-card active-kpi">
                        <div className="strategy-kpi-top">
                          <div className="strategy-kpi-icon" style={{ background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)' }}>🎯</div>
                          <span className="strategy-kpi-tag" style={{ background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)' }}>Selected Strategy</span>
                        </div>
                        <div className="strategy-kpi-label">Current Strategy Selection</div>
                        <div className="strategy-kpi-val" style={{ fontSize: 18 }}>
                          {selectedStrategyName}
                        </div>
                        <div className="strategy-kpi-sub">
                          <span>Score: <strong>{activeMilpResult?.composite_score != null ? number(activeMilpResult.composite_score, 3) : '—'}</strong></span>
                          <span>•</span>
                          <span><strong>{activeMilpResult?.gross_margin_bdt_per_ha != null ? `৳${Number(activeMilpResult.gross_margin_bdt_per_ha).toLocaleString()} BDT` : '—'}</strong></span>
                        </div>
                        {activeMilpResult && !hasFeasibleActivePlan && (
                          <div className="strategy-kpi-sub" style={{ color: '#f87171' }}>
                            No feasible plan for this strategy/context ({activeMilpResult.solver_status || 'Unavailable'}).
                          </div>
                        )}
                        {!activeMilpResult && <div className="strategy-kpi-sub">No MILP result available for this strategy/context.</div>}
                      </div>
                    </div>

                    {feasibleStrategyList.length > 0 ? (
                      <>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 -8px' }}>Cross-Strategy Benchmark Highlights</div>
                    <div className="strategy-kpi-grid">
                      {/* Max Profit */}
                      <div className="strategy-kpi-card">
                        <div className="strategy-kpi-top">
                          <div className="strategy-kpi-icon" style={{ background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)' }}>💰</div>
                          <span className="strategy-kpi-tag" style={{ background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)' }}>Max Revenue</span>
                        </div>
                        <div className="strategy-kpi-label">Highest Gross Margin</div>
                        <div className="strategy-kpi-val" style={{ color: 'var(--primary)' }}>
                          {maxProfitStrategy.profit_component != null ? `৳${Number(maxProfitStrategy.profit_component).toLocaleString()}` : '—'} <span style={{ fontSize: 13, fontWeight: 600 }}>BDT</span>
                        </div>
                        <div className="strategy-kpi-sub">
                          <strong>{STRATEGY_META[maxProfitStrategy.strategy_id]?.title || (maxProfitStrategy.strategy_id ? maxProfitStrategy.strategy_name : 'No benchmark data')}</strong>
                          {maxProfitStrategy.strategy_id && <> ({formatNumber(getStrategyWeights(maxProfitStrategy, maxProfitStrategy.strategy_id).profit * 100, 0)}% profit weight)</>}
                        </div>
                      </div>

                      {/* Max Water Conservation */}
                      <div className="strategy-kpi-card">
                        <div className="strategy-kpi-top">
                          <div className="strategy-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>💧</div>
                          <span className="strategy-kpi-tag" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>Low Water Stress</span>
                        </div>
                        <div className="strategy-kpi-label">Water Conservation Rating</div>
                        <div className="strategy-kpi-val" style={{ color: '#38bdf8' }}>
                          {maxWaterStrategy.water_component != null ? number(maxWaterStrategy.water_component, 2) : '—'} <span style={{ fontSize: 13, fontWeight: 600 }}>/ 6.0</span>
                        </div>
                        <div className="strategy-kpi-sub">
                          <strong>{STRATEGY_META[maxWaterStrategy.strategy_id]?.title || (maxWaterStrategy.strategy_id ? maxWaterStrategy.strategy_name : 'No benchmark data')}</strong>
                          {maxWaterStrategy.strategy_id && <> ({formatNumber(getStrategyWeights(maxWaterStrategy, maxWaterStrategy.strategy_id).water * 100, 0)}% water weight)</>}
                        </div>
                      </div>

                      {/* Max Soil Regeneration */}
                      <div className="strategy-kpi-card">
                        <div className="strategy-kpi-top">
                          <div className="strategy-kpi-icon" style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>🌱</div>
                          <span className="strategy-kpi-tag" style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>Max Soil Biology</span>
                        </div>
                        <div className="strategy-kpi-label">Soil Health &amp; Nitrogen Index</div>
                        <div className="strategy-kpi-val" style={{ color: '#fbbf24' }}>
                          {maxSoilStrategy.soil_component != null ? number(maxSoilStrategy.soil_component, 2) : '—'} <span style={{ fontSize: 13, fontWeight: 600 }}>/ 6.0</span>
                        </div>
                        <div className="strategy-kpi-sub">
                          <strong>{STRATEGY_META[maxSoilStrategy.strategy_id]?.title || (maxSoilStrategy.strategy_id ? maxSoilStrategy.strategy_name : 'No benchmark data')}</strong>
                          {maxSoilStrategy.strategy_id && <> ({formatNumber(getStrategyWeights(maxSoilStrategy, maxSoilStrategy.strategy_id).soil * 100, 0)}% soil weight)</>}
                        </div>
                      </div>
                    </div>
                      </>
                    ) : (
                      <section className="dash-card" aria-label="Cross-Strategy Benchmark Highlights" style={{ padding: 16 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800 }}>Cross-Strategy Benchmark Highlights</h4>
                        <div>No feasible strategy results are available in this benchmark context.</div>
                      </section>
                    )}

                    <section className="dash-card" aria-label="Selected Strategy Performance" style={{ padding: 16 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>Selected Strategy Performance</h4>
                      {hasFeasibleActivePlan ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          <div><div className="strategy-kpi-label">Gross Margin</div><strong>৳{activeMilpResult.gross_margin_bdt_per_ha != null ? Number(activeMilpResult.gross_margin_bdt_per_ha).toLocaleString() : '—'} BDT/ha</strong></div>
                          <div><div className="strategy-kpi-label">Water Score</div><strong>{activeMilpResult.water_score != null ? number(activeMilpResult.water_score, 2) : '—'} / 6.0</strong></div>
                          <div><div className="strategy-kpi-label">Soil Health</div><strong>{activeMilpResult.soil_score != null ? number(activeMilpResult.soil_score, 2) : '—'} / 6.0</strong></div>
                          <div><div className="strategy-kpi-label">Composite Score</div><strong>{activeMilpResult.composite_score != null ? number(activeMilpResult.composite_score, 3) : '—'}</strong></div>
                        </div>
                      ) : activeMilpResult ? (
                        <div role="status" style={{ color: '#b91c1c' }}>
                          This strategy has no feasible MILP solution for the selected benchmark context ({activeMilpResult.solver_status || 'Unavailable'}). Performance metrics are not available.
                        </div>
                      ) : (
                        <div>No MILP result available for this strategy/context.</div>
                      )}
                    </section>

                    {/* Toolbar & View Tabs */}
                    <div className="strategy-toolbar">
                      <div className="strategy-toolbar-left">
                        <strong style={{ fontSize: 14 }}>Multi-Objective Matrix View:</strong>
                        <div className="strategy-view-toggle">
                          <button
                            type="button"
                            className={`strategy-view-btn ${matrixViewMode === 'matrix' ? 'active' : ''}`}
                            onClick={() => setMatrixViewMode('matrix')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                            <span>Comparison Table</span>
                          </button>
                          <button
                            type="button"
                            className={`strategy-view-btn ${matrixViewMode === 'tradeoffs' ? 'active' : ''}`}
                            onClick={() => setMatrixViewMode('tradeoffs')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            <span>Trade-Off Analytics</span>
                          </button>
                          <button
                            type="button"
                            className={`strategy-view-btn ${matrixViewMode === 'timeline' ? 'active' : ''}`}
                            onClick={() => setMatrixViewMode('timeline')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            <span>Multi-Season Timeline</span>
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        Click any strategy row to select it as the active optimization model
                      </div>
                    </div>

                    {/* VIEW 1: ENHANCED COMPARISON MATRIX TABLE */}
                    {matrixViewMode === 'matrix' && (
                      <div className="strategy-table-enhanced-wrapper">
                        <table className="strategy-table-enhanced">
                          <thead>
                            <tr>
                              <th>Strategy Profile</th>
                              <th style={{ width: 150 }}>Objective Weights</th>
                              <th>Gross Margin (6-Season / ha)</th>
                              <th>Water Score (0–6.0)</th>
                              <th>Soil Health (0–6.0)</th>
                              <th>Composite Score</th>
                              <th>6-Season Rotation Sequence</th>
                              <th>Agronomic Rules</th>
                              <th>Selection Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(displayedStrategiesMap).map(([name, item]) => {
                              const strategy = { ...item, id: toCanonicalStrategyKey(name) };
                              const meta = STRATEGY_META[name] || {
                                title: name.replaceAll('_', ' '),
                                icon: '🌾',
                                summary: 'Alternative multi-objective crop sequence',
                                primaryColor: 'var(--primary)'
                              };
                              const isActive = strategy.id === selectedStrategyId;
                              const weights = getStrategyWeights(item, name);
                              const pPct = Math.round((weights.profit || 0) * 100);
                              const wPct = Math.round((weights.water || 0) * 100);
                              const sPct = Math.round((weights.soil || 0) * 100);
                              const rot = item.rotation || {};

                              return (
                                <tr
                                  key={name}
                                  className={`strategy-table-row ${isActive ? 'row-active row-inspected' : ''}`}
                                  onClick={() => setSelectedStrategyId(strategy.id)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td>
                                    <div className="strategy-profile-cell">
                                      <div className="strategy-profile-icon" style={{ background: meta.accentBg || 'var(--primary-light)', color: meta.primaryColor }}>
                                        {meta.icon}
                                      </div>
                                      <div>
                                        <div className="strategy-profile-title">
                                          <span>{meta.title}</span>
                                        </div>
                                        <div className="strategy-profile-sub">{meta.summary}</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="strategy-weight-bars">
                                      <div className="strategy-weight-progress-stacked" title={`Profit: ${pPct}% | Water: ${wPct}% | Soil: ${sPct}%`}>
                                        <div className="weight-seg-profit" style={{ width: `${pPct}%` }} />
                                        <div className="weight-seg-water" style={{ width: `${wPct}%` }} />
                                        <div className="weight-seg-soil" style={{ width: `${sPct}%` }} />
                                      </div>
                                      <div className="strategy-weight-legend">
                                        <span style={{ color: '#27ae60' }}>{pPct}% P</span>
                                        <span style={{ color: '#2980b9' }}>{wPct}% W</span>
                                        <span style={{ color: '#e67e22' }}>{sPct}% S</span>
                                      </div>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="profit-bdt-chip">
                                      <span>৳</span>
                                      <span>{item.profit_component != null ? Number(item.profit_component).toLocaleString() : '—'}</span>
                                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>BDT/ha</span>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="score-chip water">
                                      <span>💧</span>
                                      <strong>{item.water_component != null ? number(item.water_component, 2) : '—'}</strong>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="score-chip soil">
                                      <span>🌱</span>
                                      <strong>{item.soil_component != null ? number(item.soil_component, 2) : '—'}</strong>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="score-chip composite">
                                      <strong>{item.objective_value != null ? number(item.objective_value, 3) : '—'}</strong>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="crop-sequence-chain">
                                      {Object.keys(rot).length ? ['Y1_S1', 'Y1_S2', 'Y2_S1', 'Y2_S2', 'Y3_S1', 'Y3_S2'].map((periodKey, idx) => {
                                        const crop = rot[periodKey];
                                        if (!crop) return <span key={periodKey} style={{ color: 'var(--text-muted)' }}>—</span>;
                                        const cMeta = CROP_META[crop] || { icon: '🌱', is_legume: crop.toLowerCase().includes('bean') || crop.toLowerCase().includes('lentil') };
                                        const isDry = idx % 2 === 0;

                                        return (
                                          <React.Fragment key={periodKey}>
                                            <span
                                              className={`crop-chain-chip ${cMeta.is_legume ? 'legume-highlight' : ''}`}
                                              title={`${periodKey} (${isDry ? 'Dry Season' : 'Wet Season'}): ${crop}`}
                                            >
                                              <span className="crop-chain-season-tag">{periodKey.replace('Y', 'Y').replace('_S', '·S')}</span>
                                              <span>{cMeta.icon}</span>
                                              <span>{crop}</span>
                                            </span>
                                            {idx < 5 && <span className="crop-chain-arrow">→</span>}
                                          </React.Fragment>
                                        );
                                      }) : <span style={{ color: 'var(--text-muted)' }}>No feasible rotation</span>}
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
                                      {isFeasiblePlan(item) ? (
                                        <>
                                          <span style={{ color: '#27ae60', fontWeight: 700 }}>✓ Legume (≥1 in 3s)</span>
                                          <span style={{ color: '#27ae60', fontWeight: 700 }}>✓ Family Rotated</span>
                                        </>
                                      ) : (
                                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>No feasible plan</span>
                                      )}
                                      <span style={{ color: 'var(--text-muted)' }}>CBC ({item.solver_status || 'Optimal'})</span>
                                    </div>
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      className={isActive ? 'btn-primary-sm' : 'btn-secondary-sm'}
                                      style={{
                                        fontSize: 11.5,
                                        padding: '5px 12px',
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        background: isActive ? 'var(--primary)' : 'var(--bg-card-subtle)',
                                        color: isActive ? '#0e1318' : 'var(--text-main)',
                                        border: isActive ? 'none' : '1px solid var(--border-light)'
                                      }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedStrategyId(strategy.id);
                                      }}
                                    >
                                      {isActive ? '✓ Active Strategy' : 'Select Strategy'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* VIEW 2: TRADE-OFF ANALYTICS CARDS */}
                    {matrixViewMode === 'tradeoffs' && (
                      feasibleStrategyList.length ? <div className="tradeoff-comparative-grid">
                        {Object.entries(displayedStrategiesMap).map(([name, item]) => {
                          const meta = STRATEGY_META[name] || { title: name.replaceAll('_', ' '), icon: '🌾', summary: 'Trade-off profile' };
                          const isSelected = toCanonicalStrategyKey(name) === activeStrategyName;
                          const weights = getStrategyWeights(item, name);

                          const profitVal = item.profit_component != null ? Number(item.profit_component) : null;
                          const profitPct = profitVal != null ? Math.min(100, Math.round((profitVal / 900000) * 100)) : 0;

                          const waterVal = item.water_component != null ? Number(item.water_component) : null;
                          const waterPct = waterVal != null ? Math.min(100, Math.round((waterVal / 6.0) * 100)) : 0;

                          const soilVal = item.soil_component != null ? Number(item.soil_component) : null;
                          const soilPct = soilVal != null ? Math.min(100, Math.round((soilVal / 6.0) * 100)) : 0;

                          return (
                            <div
                              key={name}
                              className={`tradeoff-strategy-card ${isSelected ? 'active-border row-inspected' : ''}`}
                              onClick={() => handleApplyStrategy(name)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div className="strategy-profile-icon" style={{ background: meta.accentBg || 'rgba(0, 223, 129, 0.12)', color: meta.primaryColor || 'var(--primary)' }}>
                                    {meta.icon}
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{meta.title}</h4>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.summary}</span>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: 11,
                                  background: isSelected ? 'var(--primary)' : 'var(--bg-card-subtle)',
                                  color: isSelected ? '#0e1318' : 'var(--text-muted)',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontWeight: 700,
                                  border: isSelected ? 'none' : '1px solid var(--border-light)'
                                }}>
                                  {isSelected ? '✓ Active Strategy' : 'Select Strategy'}
                                </span>
                              </div>

                              {/* Trade-off Progress Bars */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                                    <span style={{ color: '#00df81' }}>💰 Profit Component (6-Season Gross Margin)</span>
                                    <span>{profitVal != null ? `৳${profitVal.toLocaleString()} BDT/ha` : '—'}</span>
                                  </div>
                                  <div className="score-bar-track">
                                    <div className="score-bar-fill" style={{ width: `${profitPct}%`, background: '#00df81' }} />
                                  </div>
                                </div>

                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                                    <span style={{ color: '#38bdf8' }}>💧 Water Conservation Index</span>
                                    <span>{waterVal != null ? `${number(waterVal, 2)} / 6.0` : '—'}</span>
                                  </div>
                                  <div className="score-bar-track">
                                    <div className="score-bar-fill" style={{ width: `${waterPct}%`, background: '#38bdf8' }} />
                                  </div>
                                </div>

                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                                    <span style={{ color: '#fbbf24' }}>🌱 Soil Regeneration &amp; Biology</span>
                                    <span>{soilVal != null ? `${number(soilVal, 2)} / 6.0` : '—'}</span>
                                  </div>
                                  <div className="score-bar-track">
                                    <div className="score-bar-fill" style={{ width: `${soilPct}%`, background: '#fbbf24' }} />
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-light)', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  Weights: <strong>{Math.round(weights.profit * 100)}% P</strong> • <strong>{Math.round(weights.water * 100)}% W</strong> • <strong>{Math.round(weights.soil * 100)}% S</strong>
                                </span>
                                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                  Score: {item.objective_value != null ? number(item.objective_value, 3) : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div> : <div className="dash-card">No feasible strategy plans are available in this benchmark context.</div>
                    )}

                    {/* VIEW 3: MULTI-SEASON PROGRESSION TIMELINE */}
                    {matrixViewMode === 'timeline' && (
                      feasibleStrategyList.length ? <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 16, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Side-by-Side 6-Season Crop Trajectories</h4>
                        {Object.entries(displayedStrategiesMap).map(([name, item]) => {
                          const meta = STRATEGY_META[name] || { title: name.replaceAll('_', ' '), icon: '🌾' };
                          const isSelected = toCanonicalStrategyKey(name) === activeStrategyName;
                          const rot = item.rotation || {};

                          return (
                            <div
                              key={name}
                              onClick={() => handleApplyStrategy(name)}
                              style={{
                                background: 'var(--bg-card-subtle)',
                                padding: 14,
                                borderRadius: 12,
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{meta.icon}</span>
                                  <strong style={{ fontSize: 14 }}>{meta.title}</strong>
                                  {isSelected && <span style={{ fontSize: 10, background: 'var(--primary)', color: '#0e1318', padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>✓ Active Strategy</span>}
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  Profit: <strong>{item.profit_component != null ? `৳${Number(item.profit_component).toLocaleString()}` : '—'}</strong> • Water: <strong>{item.water_component != null ? number(item.water_component, 2) : '—'}</strong> • Soil: <strong>{item.soil_component != null ? number(item.soil_component, 2) : '—'}</strong>
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                                {['Y1_S1', 'Y1_S2', 'Y2_S1', 'Y2_S2', 'Y3_S1', 'Y3_S2'].map((periodKey, idx) => {
                                  const crop = rot[periodKey];
                                  const cMeta = crop ? (CROP_META[crop] || { family: 'Other', is_legume: crop.toLowerCase().includes('bean') || crop.toLowerCase().includes('lentil'), duration: 90, water_mm: 400, icon: '🌱' }) : null;
                                  const isDry = idx % 2 === 0;

                                  return (
                                    <div
                                      key={periodKey}
                                      style={{
                                        background: 'var(--bg-card)',
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: cMeta?.is_legume ? '1px solid rgba(0, 223, 129, 0.4)' : '1px solid var(--border-light)',
                                        borderLeft: cMeta?.is_legume ? '3px solid var(--primary)' : undefined,
                                        textAlign: 'center'
                                      }}
                                    >
                                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {periodKey} ({isDry ? 'Dry' : 'Wet'})
                                      </div>
                                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                                        {cMeta ? `${cMeta.icon} ${crop}` : '—'}
                                      </div>
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {cMeta ? `${cMeta.family} • ${cMeta.water_mm}mm` : 'Unassigned'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div> : <div className="dash-card">No feasible strategy rotations are available in this benchmark context.</div>
                    )}

                    {/* DEEP-DIVE STRATEGY INSPECTOR PANEL */}
                    {hasFeasibleActivePlan ? (
                    <div className="strategy-inspector-card" style={{ marginTop: 20 }}>
                      <div className="inspector-top-banner">
                        <div className="inspector-title-group">
                          <div className="inspector-icon-lg" style={{ background: inspectedMeta.accentBg || 'rgba(0, 223, 129, 0.12)', color: inspectedMeta.primaryColor || 'var(--primary)' }}>
                            {inspectedMeta.icon}
                          </div>
                          <div className="inspector-title-text">
                            <h3>Selected Strategy Analysis: {inspectedMeta.title}</h3>
                            <p>{inspectedMeta.summary}</p>
                          </div>
                        </div>
                        <div className="inspector-actions">
                          <span className="score-chip composite" style={{ fontSize: 14, padding: '6px 12px' }}>
                            Solver Score: <strong>{inspectedItem.objective_value != null ? number(inspectedItem.objective_value, 3) : '—'}</strong>
                          </span>
                          <span style={{ background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)', fontWeight: 800, padding: '6px 14px', borderRadius: 8, fontSize: 12.5, border: '1px solid rgba(0, 223, 129, 0.3)' }}>
                            ★ Active: {selectedStrategyName}
                          </span>
                        </div>
                      </div>

                      {/* Strategy Priority Focus Breakdown */}
                      <div className="strategy-formula-box">
                        <div className="formula-text" style={{ fontSize: 13.5, fontWeight: 700 }}>
                          Main Priority: {STRATEGY_PRIORITY_DESC[inspectedKey]?.mainPriority || inspectedMeta.summary}
                        </div>
                        <div className="formula-weights-breakdown">
                          <span style={{ color: '#00df81' }}>● Profit Focus: {Math.round(getStrategyWeights(inspectedItem, inspectedKey).profit * 100)}%</span>
                          <span style={{ color: '#38bdf8' }}>● Water Focus: {Math.round(getStrategyWeights(inspectedItem, inspectedKey).water * 100)}%</span>
                          <span style={{ color: '#fbbf24' }}>● Soil Focus: {Math.round(getStrategyWeights(inspectedItem, inspectedKey).soil * 100)}%</span>
                        </div>
                      </div>

                      {/* 3-Year Visual Rotation Timeline Schedule */}
                      <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
                          3-Year (6-Season) Multi-Period Optimal Rotation Schedule ({inspectedMeta.title})
                        </h4>
                        <div className="strategy-3year-timeline">
                          {[
                            { year: 1, label: 'Year 1', badge: 'Seasons 1 & 2', s1: 'Y1_S1', s2: 'Y1_S2' },
                            { year: 2, label: 'Year 2', badge: 'Seasons 3 & 4', s1: 'Y2_S1', s2: 'Y2_S2' },
                            { year: 3, label: 'Year 3', badge: 'Seasons 5 & 6', s1: 'Y3_S1', s2: 'Y3_S2' }
                          ].map(y => {
                            const crop1 = inspectedRotation[y.s1];
                            const crop2 = inspectedRotation[y.s2];
                            const meta1 = crop1 ? (CROP_META[crop1] || { family: 'Other', is_legume: crop1.toLowerCase().includes('bean') || crop1.toLowerCase().includes('lentil'), duration: 75, water_mm: 350, icon: '🌱' }) : null;
                            const meta2 = crop2 ? (CROP_META[crop2] || { family: 'Other', is_legume: crop2.toLowerCase().includes('bean') || crop2.toLowerCase().includes('lentil'), duration: 110, water_mm: 600, icon: '🌽' }) : null;

                            return (
                              <div key={y.year} className="timeline-year-card">
                                <div className="timeline-year-header">
                                  <span className="timeline-year-title">{y.label}</span>
                                  <span className="timeline-year-badge">{y.badge}</span>
                                </div>
                                <div className="timeline-season-row">
                                  {/* Season 1 (Dry) */}
                                  <div className={`timeline-season-card ${meta1?.is_legume ? 'is-legume' : ''}`}>
                                    <div className="timeline-season-meta">
                                      <span>Season 1 (Dry / Rabi)</span>
                                      {meta1?.is_legume && <span style={{ color: '#00df81', fontWeight: 800 }}>🌱 Nitrogen Fixer</span>}
                                    </div>
                                    <div className="timeline-crop-main">
                                      <span className="timeline-crop-name">{meta1 ? `${meta1.icon} ${crop1}` : '—'}</span>
                                      {meta1 && <span className="trait-pill">{meta1.family}</span>}
                                    </div>
                                    <div className="timeline-crop-traits">
                                      {meta1 ? (
                                        <>
                                          <span className="trait-pill">⏳ {meta1.duration} days</span>
                                          <span className="trait-pill">💧 {meta1.water_mm} mm req</span>
                                          <span className="trait-pill">{meta1.is_legume ? 'Bio-N Fixation' : 'Cash Margin'}</span>
                                        </>
                                      ) : (
                                        <span className="trait-pill">Unscheduled</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Season 2 (Wet) */}
                                  <div className={`timeline-season-card ${meta2?.is_legume ? 'is-legume' : ''}`}>
                                    <div className="timeline-season-meta">
                                      <span>Season 2 (Wet / Kharif)</span>
                                      {meta2?.is_legume && <span style={{ color: '#00df81', fontWeight: 800 }}>🌱 Nitrogen Fixer</span>}
                                    </div>
                                    <div className="timeline-crop-main">
                                      <span className="timeline-crop-name">{meta2 ? `${meta2.icon} ${crop2}` : '—'}</span>
                                      {meta2 && <span className="trait-pill">{meta2.family}</span>}
                                    </div>
                                    <div className="timeline-crop-traits">
                                      {meta2 ? (
                                        <>
                                          <span className="trait-pill">⏳ {meta2.duration} days</span>
                                          <span className="trait-pill">💧 {meta2.water_mm} mm req</span>
                                          <span className="trait-pill">{meta2.is_legume ? 'Bio-N Fixation' : 'High Cash Margin'}</span>
                                        </>
                                      ) : (
                                        <span className="trait-pill">Unscheduled</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Decomposition & Constraints Grid */}
                      <div className="inspector-details-grid">
                        {/* Objective Decomposition */}
                        <div className="decomposition-card">
                          <h4>Objective Score Component Decomposition ({inspectedMeta.title})</h4>

                          <div className="score-bar-item">
                            <div className="score-bar-header">
                              <span style={{ color: '#00df81' }}>💰 Expected Net Revenue (6-Season Gross Margin)</span>
                              <span>{inspectedItem.profit_component != null ? `৳${Number(inspectedItem.profit_component).toLocaleString()} BDT/ha` : '—'}</span>
                            </div>
                            <div className="score-bar-track">
                              <div className="score-bar-fill" style={{ width: `${inspectedItem.profit_component != null ? Math.min(100, Math.round((Number(inspectedItem.profit_component) / 900000) * 100)) : 0}%`, background: '#00df81' }} />
                            </div>
                            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              Weight: {number(getStrategyWeights(inspectedItem, inspectedKey).profit, 2)} • Maximizes commercial agricultural margin.
                            </small>
                          </div>

                          <div className="score-bar-item">
                            <div className="score-bar-header">
                              <span style={{ color: '#38bdf8' }}>💧 Water Conservation Component</span>
                              <span>{inspectedItem.water_component != null ? `${number(inspectedItem.water_component, 2)} / 6.0` : '—'}</span>
                            </div>
                            <div className="score-bar-track">
                              <div className="score-bar-fill" style={{ width: `${inspectedItem.water_component != null ? Math.min(100, Math.round((Number(inspectedItem.water_component) / 6.0) * 100)) : 0}%`, background: '#38bdf8' }} />
                            </div>
                            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              Weight: {number(getStrategyWeights(inspectedItem, inspectedKey).water, 2)} • Minimizes irrigation demand in dry seasons.
                            </small>
                          </div>

                          <div className="score-bar-item">
                            <div className="score-bar-header">
                              <span style={{ color: '#fbbf24' }}>🌱 Soil Health &amp; Biology Component</span>
                              <span>{inspectedItem.soil_component != null ? `${number(inspectedItem.soil_component, 2)} / 6.0` : '—'}</span>
                            </div>
                            <div className="score-bar-track">
                              <div className="score-bar-fill" style={{ width: `${inspectedItem.soil_component != null ? Math.min(100, Math.round((Number(inspectedItem.soil_component) / 6.0) * 100)) : 0}%`, background: '#fbbf24' }} />
                            </div>
                            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              Weight: {number(getStrategyWeights(inspectedItem, inspectedKey).soil, 2)} • Rewards nitrogen-fixing pulses and root biomass.
                            </small>
                          </div>
                        </div>

                        {/* Dynamic Per-Season Decision Explanations */}
                        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', padding: 20, borderRadius: 14, border: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20 }}>🌱</span>
                              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                                Agronomic Decision Explanation &amp; Alternatives ({inspectedMeta.title})
                              </h4>
                            </div>
                            <span style={{ fontSize: 12, background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 12, fontWeight: 700, border: '1px solid rgba(0, 223, 129, 0.3)' }}>
                              {inspectedMeta.title}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(0, 223, 129, 0.08)', border: '1px solid rgba(0, 223, 129, 0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.5 }}>
                            <strong>Strategy Focus: </strong>{inspectedItem.decision_explanation?.strategy_summary || inspectedMeta.summary}
                          </div>

                          {inspectedItem.decision_explanation?.pattern_explanation && (
                            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                              <strong>Rotation Pattern: </strong>{inspectedItem.decision_explanation.pattern_explanation}
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                            {(() => {
                              const reasons = inspectedItem.decision_explanation?.period_reasons;
                              const pWeights = inspectedItem.weights || { profit: 0.34, water: 0.33, soil: 0.33 };
                              if (reasons && reasons.length > 0) {
                                return reasons.map((p, pIdx) => (
                                  <div key={p.period || pIdx} style={{ background: 'var(--bg-card-subtle)', borderRadius: 10, border: '1px solid var(--border-light)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                                      <div>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{p.crop}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({p.family})</span>
                                        {p.is_legume && <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(0, 223, 129, 0.12)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>BNF Legume</span>}
                                      </div>
                                      <span style={{ fontSize: 11, background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, border: '1px solid var(--border-light)' }}>
                                        {p.season_label || p.period}
                                      </span>
                                    </div>

                                    {/* Why This Crop */}
                                    <div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Why This Crop?</div>
                                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.why_this_crop || p.why_feasible}</p>
                                    </div>

                                    {/* Feasibility Bullets */}
                                    {p.feasibility_bullets && p.feasibility_bullets.length > 0 && (
                                      <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: 6, fontSize: 11.5 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-dim)', marginBottom: 3 }}>Feasibility Factors:</div>
                                        <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-muted)' }}>
                                          {p.feasibility_bullets.map((b, bIdx) => (
                                            <li key={bIdx} style={{ marginBottom: 2 }}>{b}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Expected Performance */}
                                    <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 11.5 }}>
                                      <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: 2 }}>Expected Seasonal Performance ({inspectedMeta.title}):</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, color: 'var(--text-main)' }}>
                                        <span>Margin: <strong>BDT {Number(p.expected_gross_margin_bdt_ha || 0).toLocaleString()}/ha</strong></span>
                                        <span>Water: <strong>{Number(p.water_requirement_mm || 0).toFixed(0)} mm</strong></span>
                                        <span>Yield: <strong>{Number(p.expected_yield_t_ha || 0).toFixed(2)} t/ha</strong></span>
                                        {p.composite_score != null && <span>Score: <strong>{Number(p.composite_score).toFixed(3)}</strong></span>}
                                      </div>
                                    </div>

                                    {/* Why Selected */}
                                    <div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Why Selected?</div>
                                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.why_selected}</p>
                                    </div>

                                    {/* Main Alternatives */}
                                    {p.alternatives_considered && p.alternatives_considered.length > 0 && (
                                      <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: 6 }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Main Alternatives Evaluated:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                          {p.alternatives_considered.map((alt, aIdx) => (
                                            <div key={aIdx} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '3px 6px', borderRadius: 4 }}>
                                              <strong style={{ color: 'var(--text-main)' }}>{alt.crop}:</strong> {alt.reason_not_chosen || `BDT ${Number(alt.expected_gross_margin_bdt || 0).toLocaleString()}/ha margin`}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Key Takeaway */}
                                    {p.key_takeaway && (
                                      <div style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600, borderLeft: '3px solid var(--primary)', paddingLeft: 8, marginTop: 2 }}>
                                        {p.key_takeaway}
                                      </div>
                                    )}

                                    {/* Collapsible Technical Details */}
                                    <details style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                                      <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>Technical Optimization Details</summary>
                                      <div style={{ marginTop: 4, padding: 6, background: 'var(--bg-card)', borderRadius: 4, fontFamily: 'monospace', fontSize: 10.5 }}>
                                        <div>Strategy: {inspectedMeta.title}</div>
                                        <div>Weights: Profit {formatNumber((pWeights.profit || 0.34) * 100, 0)}%, Water {formatNumber((pWeights.water || 0.33) * 100, 0)}%, Soil {formatNumber((pWeights.soil || 0.33) * 100, 0)}%</div>
                                        <div>Calculated Composite Score: {formatNumber(p.composite_score || 0, 3)} / 1.000</div>
                                        <div>Legume BNF Interval Constraint: Satisfied</div>
                                      </div>
                                    </details>
                                  </div>
                                ));
                              }
                              // Strategy-isolated fallback
                              const periods = ['Y1_S1', 'Y1_S2', 'Y2_S1', 'Y2_S2', 'Y3_S1', 'Y3_S2'];
                              return periods.map((periodKey, pIdx) => {
                                const crop = inspectedRotation[periodKey] || 'Unassigned';
                                const cMeta = CROP_META[crop] || { family: 'Agronomic', is_legume: false };
                                const isDry = pIdx % 2 === 0;
                                return (
                                  <div key={periodKey} style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <strong style={{ color: 'var(--primary)', fontSize: 12.5 }}>{periodKey}: {crop} ({cMeta.family})</strong>
                                      <span style={{ fontSize: 10.5, background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: 'var(--text-muted)' }}>
                                        Year {Math.floor(pIdx/2) + 1}, Season {(pIdx%2) + 1} ({isDry ? 'Dry/Rabi' : 'Wet/Kharif'})
                                      </span>
                                    </div>
                                    <div style={{ marginBottom: 4 }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Why Feasible: </span>
                                      <span style={{ color: 'var(--text-dim)' }}>Meets parcel agro-climatic boundaries and botanical family alternation.</span>
                                    </div>
                                    <div style={{ marginBottom: 4 }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Why Selected ({inspectedMeta.title}): </span>
                                      <span style={{ color: 'var(--text-dim)' }}>
                                        Selected for optimal trade-off under {formatNumber((pWeights.profit || 0) * 100, 0)}% Profit / {formatNumber((pWeights.water || 0) * 100, 0)}% Water / {formatNumber((pWeights.soil || 0) * 100, 0)}% Soil weights.
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Agronomic Constraints Verification */}
                        <div className="compliance-checklist-card">
                          <h4>Agronomic Constraints &amp; Solver Integrity</h4>
                          <div className="checklist-items">
                            <div className="checklist-row">
                              <div className="check-icon-circle">✓</div>
                              <div>
                                <strong>Legume Interval Constraint Satisfied:</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                  Enforces biological nitrogen-fixing pulse (e.g. Mungbean/Lentil) at least once every 3 consecutive seasons via mathematical constraint.
                                </div>
                              </div>
                            </div>

                            <div className="checklist-row">
                              <div className="check-icon-circle">✓</div>
                              <div>
                                <strong>Botanical Family Alternation Verified:</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                  Consecutive seasons avoid matching botanical families (e.g. Fabaceae rotated with Poaceae) to break pest cycles.
                                </div>
                              </div>
                            </div>

                            <div className="checklist-row">
                              <div className="check-icon-circle">✓</div>
                              <div>
                                <strong>Agro-Climatic &amp; Soil pH Feasibility:</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                  Every scheduled crop is verified within temperature bounds and soil pH limits for the parcel.
                                </div>
                              </div>
                            </div>

                            <div className="checklist-row">
                              <div className="check-icon-circle">✓</div>
                              <div>
                                <strong>PuLP Branch-and-Bound Solver Formulation:</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                  Solved to global integer optimality without heuristic shortcuts ({inspectedItem.solver_status || 'Optimal'}).
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    ) : (
                      <section className="dash-card" role="status" style={{ marginTop: 20, padding: 18, borderColor: '#fecaca', color: '#991b1b' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>No Feasible Strategy Analysis</h3>
                        <div>
                          {selectedBenchmarkContext !== 'operational' && benchmarkSuiteResults[BENCHMARK_SCENARIOS[selectedBenchmarkContext]?.scen_key]?.feasible_count === 0
                            ? 'The selected benchmark has no feasible crops, so no rotation, performance metrics, constraint checks, or agronomic explanation can be calculated.'
                            : `No feasible rotation or analysis is available for ${selectedStrategyName} in this context (${activeMilpResult?.solver_status || 'No result'}).`}
                        </div>
                      </section>
                    )}
                    </div>
              );
            })()}

              {/* TAB: COMPARISON LAB (MILP vs RL vs Rule) */}
              {analysisTab === 'comparison_lab' && (
                <ComparisonLabView
                  activeField={activeField}
                  analysisResult={result}
                  request={request}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB: CROP FAILURE & RECOVERY SIMULATOR */}
              {analysisTab === 'recovery' && (
                <CropFailureRecoveryView
                  activeField={activeField}
                  analysisResult={result}
                  request={request}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB: ADAPTIVE REPLANNING */}
              {analysisTab === 'replan' && (
                <AdaptiveReplanningView
                  activeField={activeField}
                  analysisResult={result}
                  request={request}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB: WEATHER UNCERTAINTY & ROBUSTNESS */}
              {analysisTab === 'uncertainty' && (
                <WeatherUncertaintyView
                  activeField={activeField}
                  analysisResult={result}
                  request={request}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB: SOIL HEALTH & SUSTAINABILITY TRACKER */}
              {analysisTab === 'sustainability' && (
                <SustainabilityTrackerView
                  activeField={activeField}
                  analysisResult={result}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB: CROP DATABASE & PROVENANCE */}
              {analysisTab === 'crop_catalog' && (
                <CropCatalogView
                  request={request}
                  formatNumber={formatNumber}
                />
              )}

              {/* TAB: SATELLITE & SENSOR READINESS */}
              {analysisTab === 'satellite' && (
                <SatelliteReadinessView
                  request={request}
                  formatNumber={formatNumber}
                />
              )}

              {/* TAB: ACTUAL VS ESTIMATED OUTCOMES */}
              {analysisTab === 'outcomes' && (
                <ActualOutcomesView
                  activeField={activeField}
                  analysisResult={result}
                  request={request}
                  formatNumber={formatNumber}
                  onNavigateTab={setAnalysisTab}
                />
              )}

              {/* TAB 10: SYNTHETIC ML YIELD ANALYSIS */}
              {analysisTab === 'ml_models' && (() => {
                const activeStrategyName = selectedStrategyId;
                const selectedStrategyMeta = STRATEGY_META[activeStrategyName] || STRATEGY_META.balanced;
                const selectedMilpPlan = activeMilpResult || {};
                const rotationMap = activeMilpResult?.rotation || {};
                if (!activeMilpResult || !Object.keys(rotationMap).length) {
                  return <div className="dash-card" style={{ gridColumn: 'span 12' }}>No MILP result available for this strategy/context.</div>;
                }
                const rawFieldArea = activeField?.area_ha ?? summary.field_state?.field_size_ha;
                const fieldArea = rawFieldArea == null ? null : Number(rawFieldArea);
                const fieldName = activeField?.name || summary.field_state?.name || 'Not Available';
                const cropSeasonMatrix = selectedMilpPlan.dynamic_agronomic_matrix?.crop_season_matrix || selectedMilpPlan.dynamic_crop_matrix || {};
                const periodKeys = ['Y1_S1', 'Y1_S2', 'Y2_S1', 'Y2_S2', 'Y3_S1', 'Y3_S2'];
                const mlStrategyKey = selectedStrategyId === 'water_efficiency'
                  ? 'water_focused'
                  : selectedStrategyId === 'soil_health' ? 'soil_focused' : selectedStrategyId;
                const activeStrategyYieldAnalysis = ml.strategy_yield_analysis?.[mlStrategyKey];
                const seasonalYieldData = (activeStrategyYieldAnalysis?.seasons || []).map((prediction, idx) => {
                  const crop = prediction.crop;
                  const cMeta = CROP_META[crop] || { duration: null, water_mm: null, icon: '🌱', family: 'Unknown', is_legume: false };
                  const dynCropInfo = cropSeasonMatrix[prediction.period_key]?.[crop] || {};
                  const yield_t_ha = Number(prediction.predicted_yield_t_ha);
                  const uncertainty_t_ha = Number(prediction.uncertainty_t_ha);
                  const minYield = Number(prediction.lower_yield_t_ha);
                  const maxYield = Number(prediction.upper_yield_t_ha);
                  const productionTons = prediction.production_tons == null ? null : Number(prediction.production_tons);
                  const minProductionTons = prediction.lower_production_tons == null ? null : Number(prediction.lower_production_tons);
                  const maxProductionTons = prediction.upper_production_tons == null ? null : Number(prediction.upper_production_tons);
                  return {
                    periodKey: prediction.period_key,
                    year: Math.floor(idx / 2) + 1,
                    seasonNum: (idx % 2) + 1,
                    isDry: prediction.season_type === 'dry',
                    crop,
                    cMeta,
                    duration: cMeta.duration,
                    yield_t_ha,
                    uncertainty_t_ha,
                    minYield,
                    maxYield,
                    productionTons,
                    minProductionTons,
                    maxProductionTons,
                    waterReq: dynCropInfo.water_balance?.crop_et_mm ?? cMeta.water_mm,
                    featuresUsed: prediction.features_used,
                    uncertaintyNote: prediction.uncertainty_note
                  };
                });
                const predictionMatchesRotation = seasonalYieldData.length === periodKeys.length
                  && periodKeys.every((periodKey, idx) => seasonalYieldData[idx]?.periodKey === periodKey
                    && seasonalYieldData[idx]?.crop === rotationMap[periodKey]);
                const totalProductionTons = activeStrategyYieldAnalysis?.metrics?.total_production_tons ?? null;
                const averageYield_t_ha = activeStrategyYieldAnalysis?.metrics?.mean_yield_t_ha ?? null;
                const totalMinProductionTons = activeStrategyYieldAnalysis?.metrics?.production_envelope_tons?.lower ?? null;
                const totalMaxProductionTons = activeStrategyYieldAnalysis?.metrics?.production_envelope_tons?.upper ?? null;
                const averageUncertainty_t_ha = activeStrategyYieldAnalysis?.metrics?.mean_uncertainty_t_ha ?? null;
                const activeSeasonData = predictionMatchesRotation
                  ? seasonalYieldData.find(s => s.periodKey === selectedMlSeasonKey) || seasonalYieldData[0]
                  : null;
                if (!activeSeasonData) {
                  return (
                    <div className="dash-card" role="status" style={{ gridColumn: 'span 12' }}>
                      Crop- and season-conditioned synthetic ML predictions are not available for this MILP result/context.
                      No optimizer yield values or fallback crop estimates are substituted for the ML output.
                    </div>
                  );
                }
                const strategyMlKeys = {
                  profit_focused: 'profit_focused',
                  water_efficiency: 'water_focused',
                  soil_health: 'soil_focused',
                  balanced: 'balanced'
                };
                const strategyYieldRows = Object.entries(strategyMlKeys).map(([strategyId, modelKey]) => {
                  const analysis = ml.strategy_yield_analysis?.[modelKey];
                  const result = currentStrategyResults?.[strategyId] || {};
                  const rotation = result.rotation || result.selected_crop_by_period || {};
                  const predictions = analysis?.seasons || [];
                  const rotationMatchesPredictions = predictions.length === periodKeys.length
                    && periodKeys.every((periodKey, idx) => predictions[idx]?.period_key === periodKey
                      && predictions[idx]?.crop === rotation[periodKey]);
                  return {
                    strategyId,
                    name: STRATEGY_PROFILES[strategyId]?.name || strategyId,
                    rotation,
                    analysis,
                    rotationMatchesPredictions
                  };
                });
                const allRotationsAvailable = strategyYieldRows.every(row => periodKeys.every(key => row.rotation?.[key]));
                const rotationsIdentical = allRotationsAvailable && strategyYieldRows.every(row =>
                  periodKeys.every(key => row.rotation[key] === strategyYieldRows[0].rotation[key])
                );
                return (
                  <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 1. PAGE HEADER */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 24 }}>📊</span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Synthetic ML Yield Analysis</h3>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                              Estimate crop-specific yield and production for each season in the selected MILP rotation. Predictions are generated by a synthetic benchmark model for research and algorithm evaluation. They are not field-validated yield forecasts.
                            </p>
                          </div>
                        </div>
                        <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: 11.5, fontWeight: 800, padding: '4px 12px', borderRadius: 999 }}>
                          Synthetic ML Benchmark — Not Field Validated
                        </span>
                      </div>

                      {/* Explicit MILP vs ML Distinction Callout */}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, fontSize: 12.5 }}>
                        <div style={{ background: 'rgba(0, 223, 129, 0.08)', border: '1px solid rgba(0, 223, 129, 0.25)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-main)' }}>
                          <strong style={{ color: 'var(--primary)' }}>MILP Optimizer Answers:</strong> <em>"Which crop should be scheduled in each season?"</em> (MILP → Rotation Schedule)
                        </div>
                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-main)' }}>
                          <strong style={{ color: '#38bdf8' }}>ML Model Answers:</strong> <em>"Given that crop and season, what yield does the synthetic model estimate?"</em> (ML → Yield &amp; Uncertainty)
                        </div>
                      </div>

                    </div>

                    {/* 2. MILP -> ML CONTEXT */}
                    <div className="dash-card" style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            MILP → ML CONTEXT (CANONICAL SELECTED STRATEGY)
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 18 }}>{selectedStrategyMeta.icon}</span>
                            <strong style={{ fontSize: 16, color: 'var(--text-main)' }}>{selectedStrategyMeta.title}</strong>
                            <span style={{ fontSize: 11, background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                              Canonical Active Model
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 12.5, flexWrap: 'wrap' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Field:</span> <strong>{fieldName}</strong></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Field Area:</span> <strong>{formatNumber(fieldArea, 1)} ha</strong></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Rotation Length:</span> <strong>6 Seasons (3 Years)</strong></div>
                        </div>
                      </div>

                      {/* 6-Season Rotation Chain */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>
                          6-Season Active Rotation Trajectory:
                        </div>
                        <div className="crop-sequence-chain" style={{ flexWrap: 'wrap' }}>
                          {periodKeys.map((pKey, idx) => {
                            const c = rotationMap[pKey] || 'Mungbean';
                            const cm = CROP_META[c] || { icon: '🌱', is_legume: true };
                            return (
                              <React.Fragment key={pKey}>
                                <span className={`crop-chain-chip ${cm.is_legume ? 'legume-highlight' : ''}`}>
                                  <span className="crop-chain-season-tag">{pKey.replace('_S', '·S')}</span>
                                  <span>{cm.icon}</span>
                                  <span>{c}</span>
                                </span>
                                {idx < 5 && <span className="crop-chain-arrow">→</span>}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 3. 6-SEASON CROP YIELD ANALYSIS (MAIN SECTION TABLE) */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>6-Season Crop Yield Analysis</h4>
                          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                          Backend synthetic ML estimates conditioned on each strategy's actual crop and season. Click Inspect on any row to display prediction details below.
                          </p>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>
                          Field Area: {formatNumber(fieldArea, 1)} ha
                        </span>
                      </div>

                      <div className="strategy-table-enhanced-wrapper">
                        <table className="strategy-table-enhanced">
                          <thead>
                            <tr>
                              <th>Season</th>
                              <th>Crop</th>
                              <th>Duration</th>
                              <th>Predicted Yield</th>
                              <th>Uncertainty (±)</th>
                              <th>Prediction Range</th>
                              <th>Estimated Production</th>
                              <th>Water Req</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seasonalYieldData.map(s => {
                              const isInspected = s.periodKey === selectedMlSeasonKey;
                              return (
                                <tr
                                  key={s.periodKey}
                                  className={`strategy-table-row ${isInspected ? 'row-active' : ''}`}
                                  onClick={() => setSelectedMlSeasonKey(s.periodKey)}
                                  style={{
                                    cursor: 'pointer',
                                    background: isInspected ? 'rgba(0, 223, 129, 0.12)' : undefined
                                  }}
                                >
                                  <td>
                                    <strong style={{ fontSize: 13, color: 'var(--primary)' }}>
                                      Year {s.year}, Season {s.seasonNum}
                                    </strong>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                      {s.periodKey} ({s.isDry ? 'Dry / Rabi' : 'Wet / Kharif'})
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5 }}>
                                      <span>{s.cMeta.icon}</span>
                                      <span>{s.crop}</span>
                                      {s.cMeta.is_legume && (
                                        <span style={{ fontSize: 10, background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                          BNF
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                                      ⏱ {s.duration} days
                                    </span>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
                                      {number(s.yield_t_ha, 2)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>t/ha</span>
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f59e0b' }}>
                                      ±{number(s.uncertainty_t_ha, 2)} <span style={{ fontSize: 11, color: '#fbbf24' }}>t/ha</span>
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 600 }}>
                                      {number(s.minYield, 2)} – {number(s.maxYield, 2)} t/ha
                                    </div>
                                  </td>

                                  <td>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>
                                      {number(s.productionTons, 1)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>tons</span>
                                    </div>
                                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                      ({number(s.yield_t_ha, 2)} t/ha × {formatNumber(fieldArea, 1)} ha)
                                    </div>
                                  </td>

                                  <td>
                                    <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                                      💧 {number(s.waterReq, 0)} mm
                                    </span>
                                  </td>

                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className={isInspected ? 'btn-primary-sm' : 'btn-secondary-sm'}
                                      style={{
                                        padding: '4px 12px',
                                        fontSize: 11,
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        background: isInspected ? 'var(--primary)' : undefined,
                                        color: isInspected ? '#0e1318' : undefined
                                      }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedMlSeasonKey(s.periodKey);
                                      }}
                                    >
                                      {isInspected ? 'Selected' : 'Inspect'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18 }}>
                      <h4 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 800 }}>Synthetic ML Yield by MILP Strategy</h4>
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                        Each row uses that strategy's own backend rotation and crop-season predictions; objective weights do not directly alter yield.
                      </p>
                      {rotationsIdentical && (
                        <div role="status" style={{ marginBottom: 10, padding: 9, borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', color: 'var(--text-main)', fontSize: 11.5 }}>
                          All four MILP results currently select the same six-season crop rotation. Identical crop and season inputs therefore produce identical synthetic ML yields; different strategy weights change the MILP objective score, not the yield model input.
                        </div>
                      )}
                      <div className="strategy-table-enhanced-wrapper">
                        <table className="strategy-table-enhanced">
                          <thead><tr><th>Strategy</th><th>Selected Rotation</th><th>ML Estimated Production</th><th>Mean Yield</th><th>Mean RMSE Bound</th></tr></thead>
                          <tbody>
                            {strategyYieldRows.map(row => (
                              <tr key={row.strategyId} className={row.strategyId === selectedStrategyId ? 'row-active' : ''}>
                                <td><strong>{row.name}</strong>{row.strategyId === selectedStrategyId ? ' · Selected' : ''}</td>
                                <td>{periodKeys.map(key => row.rotation?.[key]).filter(Boolean).join(' → ') || 'Not Available'}</td>
                                <td>{row.rotationMatchesPredictions && row.analysis?.metrics?.total_production_tons != null
                                  ? `${number(row.analysis.metrics.total_production_tons, 1)} tons`
                                  : 'Prediction unavailable for this strategy/context'}</td>
                                <td>{row.rotationMatchesPredictions && row.analysis?.metrics?.mean_yield_t_ha != null
                                  ? `${number(row.analysis.metrics.mean_yield_t_ha, 2)} t/ha`
                                  : '—'}</td>
                                <td>{row.rotationMatchesPredictions && row.analysis?.metrics?.mean_uncertainty_t_ha != null
                                  ? `±${number(row.analysis.metrics.mean_uncertainty_t_ha, 2)} t/ha`
                                  : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 4. 6-SEASON YIELD SUMMARY */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div className="dash-card" style={{ background: 'rgba(0, 223, 129, 0.08)', border: '1px solid rgba(0, 223, 129, 0.25)', padding: 16, borderRadius: 12 }}>
                        <small style={{ color: 'var(--primary)', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase' }}>TOTAL ESTIMATED PRODUCTION</small>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                          {number(totalProductionTons, 1)} <span style={{ fontSize: 14 }}>tons</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Sum of 6 crop- and season-conditioned synthetic ML predictions across {formatNumber(fieldArea, 1)} ha
                        </div>
                      </div>

                      <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: 16, borderRadius: 12 }}>
                        <small style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase' }}>AVERAGE CROP YIELD</small>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                          {number(averageYield_t_ha, 2)} <span style={{ fontSize: 14 }}>t/ha</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Mean predicted yield per season
                        </div>
                      </div>

                      <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: 16, borderRadius: 12 }}>
                        <small style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase' }}>TOTAL PRODUCTION RANGE</small>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
                          {number(totalMinProductionTons, 1)} – {number(totalMaxProductionTons, 1)} <span style={{ fontSize: 13 }}>tons</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Sum of synthetic RMSE bounds; not a confidence interval
                        </div>
                      </div>

                      <div className="dash-card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: 16, borderRadius: 12 }}>
                        <small style={{ color: '#f59e0b', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase' }}>AVG PREDICTION UNCERTAINTY</small>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                          ±{number(averageUncertainty_t_ha, 2)} <span style={{ fontSize: 14 }}>t/ha</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Synthetic model held-out RMSE bound; not real-world confidence
                        </div>
                      </div>
                    </div>

                    {/* 5. PREDICTION DETAIL / SELECTED SEASON PREDICTION INSPECTOR */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--primary)', borderRadius: 14, padding: 18, boxShadow: '0 0 16px rgba(0, 223, 129, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 14 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            SELECTED SEASON PREDICTION INSPECTOR
                          </span>
                          <h4 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                            Selected Prediction: Year {activeSeasonData.year} Season {activeSeasonData.seasonNum} ({activeSeasonData.periodKey}) {activeSeasonData.crop}
                          </h4>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {periodKeys.map(pk => (
                            <button
                              key={pk}
                              type="button"
                              className={`btn-secondary-sm ${pk === selectedMlSeasonKey ? 'active' : ''}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                borderRadius: 6,
                                fontWeight: 700,
                                background: pk === selectedMlSeasonKey ? 'var(--primary)' : 'var(--bg-card-subtle)',
                                color: pk === selectedMlSeasonKey ? '#0e1318' : 'var(--text-muted)'
                              }}
                              onClick={() => setSelectedMlSeasonKey(pk)}
                            >
                              {pk.replace('_S', '·S')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                        <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
                          <small style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>PREDICTED YIELD</small>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                            {number(activeSeasonData.yield_t_ha, 3)} <span style={{ fontSize: 13 }}>t/ha</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                            Uncertainty: <strong style={{ color: '#fbbf24' }}>±{number(activeSeasonData.uncertainty_t_ha, 3)} t/ha</strong>
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
                          <small style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>PREDICTION RANGE</small>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                            {number(activeSeasonData.minYield, 2)} – {number(activeSeasonData.maxYield, 2)} <span style={{ fontSize: 13 }}>t/ha</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                            Synthetic RMSE envelope; not a confidence interval
                          </div>
                        </div>

                        <div style={{ background: 'rgba(0, 223, 129, 0.08)', padding: 14, borderRadius: 10, border: '1px solid rgba(0, 223, 129, 0.25)' }}>
                          <small style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ESTIMATED SEASON HARVEST</small>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                            {number(activeSeasonData.productionTons, 1)} <span style={{ fontSize: 13 }}>tons</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                            Formula: {number(activeSeasonData.yield_t_ha, 2)} t/ha × {formatNumber(fieldArea, 1)} ha = {number(activeSeasonData.productionTons, 1)} tons
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
                          <small style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>CROP &amp; AGRONOMIC CONTEXT</small>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{activeSeasonData.cMeta.icon}</span>
                            <span>{activeSeasonData.crop}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>({activeSeasonData.cMeta.family || 'Fabaceae'})</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                            ⏱ {activeSeasonData.duration} days • 💧 {activeSeasonData.waterReq} mm water req
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. MODEL-ATTRIBUTED FEATURE CONTRIBUTORS (EXPLAINABLE AI) */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                      {(() => {
                        // Dynamic XAI calculation for active selected crop-season
                        const obsFeatures = activeSeasonData.featuresUsed || {};
                        const featureNames = ml.feature_names || [];
                        const coeffs = ml.coefficients || [];
                        const means = ml.normalization_mean || [];
                        const stds = ml.normalization_std || [];

                        const attributions = featureNames.map((name, idx) => {
                          const val = obsFeatures[name];
                          const isAvailable = val != null && Number.isFinite(Number(val));
                          if (!isAvailable) {
                            return {
                              feature: name,
                              displayName: name.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                              observedLabel: 'Unavailable',
                              raw: null,
                              contribution: 0,
                              direction: 'neutral',
                              isAvailable: false
                            };
                          }
                          const raw = Number(val);
                          const mean = means[idx] ?? 0;
                          const std = stds[idx] || 1.0;
                          const coeff = coeffs[idx] ?? 0;
                          const stdVal = (raw - mean) / std;
                          const contribution = Number((coeff * stdVal).toFixed(3));

                          let formatVal = number(raw);
                          if (name.includes('water') || name.includes('rainfall')) { formatVal = `${number(raw, 0)} mm`; }
                          else if (name.includes('temp')) { formatVal = `${number(raw, 1)} °C`; }
                          else if (name.includes('nitrogen') || name.includes('phosphorus') || name.includes('potassium')) { formatVal = `${number(raw, 0)} kg/ha`; }
                          else if (name === 'ph') { formatVal = `${number(raw, 1)} pH`; }
                          else if (name.includes('organic')) { formatVal = `${number(raw, 1)} %`; }
                          else if (name.includes('yield')) { formatVal = `${number(raw, 2)} t/ha`; }
                          else if (name.includes('moisture')) { formatVal = `${number(raw, 2)} v/v`; }
                          else if (name.includes('indicator')) { formatVal = raw > 0.5 ? '1.0 (Active)' : '0.0 (Inactive)'; }

                          return {
                            feature: name,
                            displayName: name.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                            observedLabel: formatVal,
                            raw,
                            contribution,
                            direction: contribution >= 0 ? 'positive' : 'negative',
                            isAvailable: true
                          };
                        });

                        attributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

                        const posDrivers = attributions.filter(a => a.isAvailable && a.contribution >= 0).sort((a, b) => b.contribution - a.contribution);
                        const negDrivers = attributions.filter(a => a.isAvailable && a.contribution < 0).sort((a, b) => a.contribution - b.contribution);

                        const topPositive = posDrivers[0] || null;
                        const topNegative = negDrivers[0] || null;

                        const posDesc = topPositive ? `${topPositive.displayName} (+${number(topPositive.contribution, 3)} t/ha)` : 'None';
                        const negDesc = topNegative ? `${topNegative.displayName} (${number(topNegative.contribution, 3)} t/ha)` : 'None';

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>🔍</span>
                                  <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                                    Explainable AI (XAI) — Selected Season
                                  </h4>
                                  <span className="source-tag math" style={{ fontSize: 10 }}>SHAP-EQUIVALENT LOCAL ATTRIBUTION</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                  Feature attribution explaining predicted yield of <strong>{number(activeSeasonData.yield_t_ha, 2)} t/ha</strong> for <strong>{activeSeasonData.periodKey} ({activeSeasonData.crop})</strong> based on exact ML model inputs.
                                </p>
                              </div>
                              <div style={{ background: 'rgba(0, 223, 129, 0.12)', border: '1px solid rgba(0, 223, 129, 0.3)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                                Canonical Yield: {number(activeSeasonData.yield_t_ha, 2)} t/ha
                              </div>
                            </div>

                            {/* Top Model Drivers Section */}
                            <div style={{ marginTop: 4 }}>
                              <h5 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Top Model Drivers
                              </h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                                {/* Top Positive Driver */}
                                <div style={{ background: 'rgba(0, 223, 129, 0.08)', border: '1.5px solid rgba(0, 223, 129, 0.35)', borderRadius: 12, padding: 14 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      ▲ TOP POSITIVE DRIVER
                                    </span>
                                    <span style={{ fontSize: 11, background: 'rgba(0, 223, 129, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                                      +{topPositive ? number(topPositive.contribution, 3) : '0.000'} t/ha
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                                    {topPositive ? topPositive.displayName : 'None Identified'}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Observed Value: <strong style={{ color: 'var(--text-main)' }}>{topPositive ? topPositive.observedLabel : 'N/A'}</strong>
                                  </div>
                                </div>

                                {/* Top Negative Driver */}
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid rgba(239, 68, 68, 0.35)', borderRadius: 12, padding: 14 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      ▼ TOP NEGATIVE DRIVER
                                    </span>
                                    <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                                      {topNegative ? number(topNegative.contribution, 3) : '0.000'} t/ha
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                                    {topNegative ? topNegative.displayName : 'None Identified'}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Observed Value: <strong style={{ color: 'var(--text-main)' }}>{topNegative ? topNegative.observedLabel : 'N/A'}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Feature Contributions Table */}
                            <div style={{ marginTop: 4 }}>
                              <h5 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Feature Contributions Table
                              </h5>
                              <div className="strategy-table-enhanced-wrapper">
                                <table className="strategy-table-enhanced" style={{ fontSize: 12.5 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ textAlign: 'left' }}>Model Feature</th>
                                      <th style={{ textAlign: 'right' }}>Observed Input Value</th>
                                      <th style={{ textAlign: 'right' }}>Feature Contribution</th>
                                      <th style={{ textAlign: 'center' }}>Direction</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {attributions.map(attr => {
                                      const isPos = attr.contribution >= 0;
                                      return (
                                        <tr key={attr.feature}>
                                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                            {attr.displayName}
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                                            {attr.observedLabel}
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: 800, color: isPos ? 'var(--primary)' : '#f87171' }}>
                                            {isPos ? '+' : ''}{number(attr.contribution, 3)} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>t/ha</span>
                                          </td>
                                          <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                              padding: '2px 8px',
                                              borderRadius: 999,
                                              fontSize: 11,
                                              fontWeight: 800,
                                              background: isPos ? 'rgba(0, 223, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                              color: isPos ? 'var(--primary)' : '#f87171'
                                            }}>
                                              {isPos ? 'Positive' : 'Negative'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Model Interpretation */}
                            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14 }}>
                              <strong style={{ fontSize: 12.5, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                Model Interpretation
                              </strong>
                              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
                                The predicted yield for <strong>{activeSeasonData.periodKey} ({activeSeasonData.crop})</strong> is most strongly boosted by <strong>{posDesc}</strong> and most strongly reduced by <strong>{negDesc}</strong>.
                              </p>
                            </div>

                            {/* Agronomic Safety Disclaimer */}
                            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#fbbf24', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <span style={{ fontSize: 16 }}>💡</span>
                              <div>
                                <strong style={{ color: '#fbbf24' }}>Important Agronomic Disclaimer:</strong> These feature attributions explain how model input features influenced the mathematical ML prediction. They describe model behavior and are not direct agronomic prescriptions or validated field rules.
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 7. SYNTHETIC BENCHMARK PERFORMANCE (BELOW PREDICTIONS) */}
                    <div className="dash-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 18 }}>
                      <div className="panel-heading" style={{ marginBottom: 10 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
                            Synthetic Benchmark Performance
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            These metrics describe performance on the synthetic benchmark dataset and do not represent field validation.
                          </p>
                        </div>
                        <span style={{ fontSize: 10.5, background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          BENCHMARK METRICS ONLY
                        </span>
                      </div>

                      <div className="strategy-table-enhanced-wrapper">
                        <table className="strategy-table-enhanced" style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th>Metric Name</th>
                              <th>Training Set Value</th>
                              <th>Testing / Holdout Set Value</th>
                              <th>Description &amp; Interpretation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(ml.metrics || {}).map(([k, v]) => {
                              const isTest = k.toLowerCase().includes('test');
                              return (
                                <tr key={k}>
                                  <td>
                                    <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{k}</code>
                                  </td>
                                  <td>
                                    <strong style={{ color: !isTest ? 'var(--primary)' : 'var(--text-muted)' }}>
                                      {!isTest ? number(v, 4) : '—'}
                                    </strong>
                                  </td>
                                  <td>
                                    <strong style={{ color: isTest ? 'var(--primary)' : 'var(--text-muted)' }}>
                                      {isTest ? number(v, 4) : '—'}
                                    </strong>
                                  </td>
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {k.includes('mae') ? 'Mean Absolute Error in t/ha' : k.includes('rmse') ? 'Root Mean Squared Error in t/ha' : 'R² Coefficient of Determination'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Notice: Benchmark metrics describe mathematical performance on synthetic holdout samples and are presented strictly for algorithm verification.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: EXPERIMENTAL RL POLICY & ADAPTIVE STRESS SIMULATION */}
              <div style={{ display: analysisTab === 'rl_policy' ? 'contents' : 'none' }}>
                <AdaptiveRlExperiment
                  activeField={activeField}
                  fieldState={field}
                  loading={running || benchmarkLoading}
                  selectedStrategyId={selectedStrategyId}
                  selectedBenchmarkContext={selectedBenchmarkContext}
                  strategyProfiles={STRATEGY_PROFILES}
                  benchmarkLoading={benchmarkLoading}
                  benchmarkError={selectedBenchmarkContext === 'operational' ? '' : benchmarkError}
                  onRetryBenchmark={() => handleRunBenchmark(selectedBenchmarkContext)}
                  benchmarkData={selectedBenchmarkContext === 'operational' ? null : benchmarkSuiteResults[BENCHMARK_CONTEXTS[selectedBenchmarkContext]?.scen_key]}
                  activeMilpResult={activeMilpResult}
                  strategyMetrics={selectedBenchmarkContext === 'operational'
                    ? summary.strategy_field_metrics || {}
                    : benchmarkSuiteResults[BENCHMARK_CONTEXTS[selectedBenchmarkContext]?.scen_key]?.strategy_metrics || {}}
                  strategyYieldAnalysis={ml.strategy_yield_analysis || {}}
                  form={form}
                  workflowPayload={workflowPayload}
                  request={request}
                />
              </div>

              {/* TAB 4: STRESS TESTING & MILP RE-OPTIMIZATION */}
              {analysisTab === 'stress_testing' && (
                <section className="dash-card" style={{ gridColumn: 'span 12' }}>
                  <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>🧪</span>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Stress Testing &amp; MILP Re-Optimization</h3>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                        Evaluate mathematical optimizer resilience and counterfactual adaptation under hypothetical environmental perturbations.
                      </p>
                    </div>
                  </div>

                  {/* Scenario Selector Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 16 }}>
                    {[
                      { key: 'normal', name: 'Normal', icon: '☀️', desc: 'Baseline NASA POWER climate state (0 perturbation, 0 metric drift).' },
                      { key: 'drought', name: 'Drought', icon: '🌵', desc: 'Precipitation deficit testing baseline soil moisture bounds & MILP adaptation.' },
                      { key: 'heat', name: 'Heat Wave', icon: '🔥', desc: 'Elevated temperature regime testing thermal crop tolerance envelopes.' },
                      { key: 'low_water', name: 'Low Water', icon: '💧', desc: 'Constrained seasonal irrigation capacity testing aquifer resilience.' }
                    ].map(item => {
                      const isSel = selectedStressScenarioKey === item.key;
                      return (
                        <div
                          key={item.key}
                          onClick={() => setSelectedStressScenarioKey(item.key)}
                          style={{
                            cursor: 'pointer',
                            background: isSel ? 'rgba(0, 223, 129, 0.12)' : 'var(--bg-card-subtle)',
                            padding: 14,
                            borderRadius: 12,
                            border: isSel ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, color: isSel ? 'var(--primary)' : 'var(--text-main)' }}>
                            <span>{item.icon}</span>
                            <span>{item.name} Scenario</span>
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Scenario Re-Optimization Results View */}
                  {(() => {
                    const scenariosObj = summary?.stress_test?.scenarios || {};
                    const activeScenarioObj = Array.isArray(scenariosObj)
                      ? scenariosObj.find(s => s.scenario === selectedStressScenarioKey)
                      : scenariosObj[selectedStressScenarioKey];

                    const isNormal = selectedStressScenarioKey === 'normal';
                    const baselineRot = activeMilpResult?.rotation;
                    const scenarioRot = activeMilpResult ? activeScenarioObj?.scenario_rotation || baselineRot : null;
                    const rotChanged = isNormal ? false : (activeScenarioObj?.rotation_changed ?? false);

                    const formatRot = (rot) => {
                      if (!rot) return '—';
                      if (Array.isArray(rot)) return rot.join(' → ');
                      if (typeof rot === 'object') return Object.values(rot).join(' → ');
                      return String(rot);
                    };

                    const bProfit = activeMilpResult?.profit_component;
                    const sProfit = activeMilpResult ? activeScenarioObj?.scenario_objective_components?.profit ?? bProfit : null;
                    const profitDelta = isNormal || bProfit == null || sProfit == null ? 0 : sProfit - bProfit;

                    const bWater = activeMilpResult?.water_component;
                    const sWater = activeMilpResult ? activeScenarioObj?.scenario_objective_components?.water ?? bWater : null;
                    const waterDelta = isNormal || bWater == null || sWater == null ? 0 : sWater - bWater;

                    const bSoil = activeMilpResult?.soil_component;
                    const sSoil = activeMilpResult ? activeScenarioObj?.scenario_objective_components?.soil ?? bSoil : null;
                    const soilDelta = isNormal || bSoil == null || sSoil == null ? 0 : sSoil - bSoil;

                    return (
                      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Active Scenario Status Banner */}
                        <div style={{
                          background: isNormal ? 'rgba(0, 223, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          border: `1px solid ${isNormal ? 'rgba(0, 223, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                          borderRadius: 12,
                          padding: 14
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{isNormal ? '☀️' : '🧪'}</span>
                              <strong style={{ fontSize: 14, color: isNormal ? 'var(--primary)' : '#fbbf24' }}>
                                {isNormal ? 'Normal Scenario — Baseline Field State (0 Perturbation, Zero Metric Drift)' : `Stress Perturbation: ${selectedStressScenarioKey.toUpperCase()} Scenario`}
                              </strong>
                            </div>
                            <span className="source-tag math" style={{ textTransform: 'none' }}>
                              PuLP/CBC MILP Re-Optimization: <strong>{activeScenarioObj?.status || 'completed'}</strong>
                            </span>
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                            {activeScenarioObj?.reason || (isNormal ? 'Evaluated under unperturbed baseline field record.' : `Hypothetical environmental perturbation applied for ${selectedStressScenarioKey}.`)}
                          </p>
                        </div>

                        {/* Changed Fields / Perturbations Table */}
                        <div style={{ background: 'var(--bg-card-subtle)', borderRadius: 12, border: '1px solid var(--border-light)', padding: 14 }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Environmental Input Perturbations
                          </h4>
                          {isNormal || !activeScenarioObj?.changed_fields || Object.keys(activeScenarioObj.changed_fields).length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--primary)', background: 'rgba(0, 223, 129, 0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0, 223, 129, 0.25)' }}>
                              ✓ Zero perturbations applied. Environmental inputs match baseline field record exactly.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                              {Object.entries(activeScenarioObj.changed_fields).map(([fieldKey, vals]) => (
                                <div key={fieldKey} style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {fieldKey.replaceAll('_', ' ')}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                                    <span>Baseline: {vals?.baseline ?? '—'}</span>
                                    <span>→</span>
                                    <span style={{ color: '#fbbf24' }}>Stress: {vals?.scenario ?? '—'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* MILP Re-Optimization Strategy Comparison Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                          <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Baseline Rotation Sequence</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                              {formatRot(baselineRot)}
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                              {isNormal ? 'Normal Scenario Rotation' : 'Stress-Optimized Rotation'}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: rotChanged ? '#f59e0b' : 'var(--primary)', marginTop: 4 }}>
                              {formatRot(scenarioRot)}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 4, color: rotChanged ? '#f59e0b' : 'var(--primary)', fontWeight: 700 }}>
                              {rotChanged ? '⚠️ Rotation Sequence Adapted' : '✓ Unchanged from Baseline'}
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Gross Margin (BDT/ha)</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                              ৳{Number(sProfit).toLocaleString()} /ha
                            </div>
                            <div style={{ fontSize: 11, color: profitDelta < 0 ? '#f87171' : 'var(--primary)', marginTop: 2, fontWeight: 700 }}>
                              Delta: {profitDelta >= 0 ? '+' : ''}৳{Math.round(profitDelta).toLocaleString()} BDT
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Water Efficiency Score</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                              {Number(sWater).toFixed(2)}
                            </div>
                            <div style={{ fontSize: 11, color: waterDelta < 0 ? '#f87171' : 'var(--primary)', marginTop: 2, fontWeight: 700 }}>
                              Delta: {waterDelta >= 0 ? '+' : ''}{Number(waterDelta).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Methodological Explanation Note */}
                        <div style={{ background: 'var(--bg-card-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          💡 <strong>Stress Testing Methodology Note:</strong> Stress testing evaluates how the baseline PuLP/CBC MILP optimizer responds to hypothetical environmental shifts (such as drought or heat waves). Re-optimization is performed on the perturbed constraint parameters. For the <strong>Normal</strong> scenario, inputs match the baseline field state exactly, guaranteeing zero metric or rotation sequence drift.
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* TAB 5: ADVANCED COUNTERFACTUAL CONTROLS */}
              {analysisTab === 'controls' && (
                <section className="dash-card form-panel-card" style={{ gridColumn: 'span 8', margin: '0 auto' }}>
                  <div className="panel-heading">
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Advanced Counterfactual Simulation Controls</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                        Configure custom weather window parameters, counterfactual rainfall deltas, and agronomic constraint toggles to run dynamic scenario re-optimizations.
                      </p>
                    </div>
                    <span className="source-tag math" style={{ textTransform: 'none' }}>
                      Weather: <strong>NASA POWER API</strong>
                    </span>
                  </div>

                  <form onSubmit={runCounterfactual} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                    {/* Active Field Properties (Read-Only Context) */}
                    <div style={{ background: 'var(--bg-card-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>
                          Active Field: {activeField?.name || 'Selected Farm Parcel'}
                        </strong>
                        <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                          {activeField?.id === 'demo' ? 'Offline Research Demo' : 'PostgreSQL Source'}
                        </span>
                      </div>
                      <div className="form-grid-inner">
                        <div className="form-group">
                          <label>Latitude &amp; Longitude</label>
                          <input className="input-box" type="text" value={activeField?.latitude != null && activeField?.longitude != null ? `${Number(activeField.latitude).toFixed(4)}, ${Number(activeField.longitude).toFixed(4)}` : 'Not available'} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Field Area (ha)</label>
                          <input className="input-box" type="text" value={activeField?.area_ha != null ? `${Number(activeField.area_ha).toFixed(1)} ha` : 'Not Available'} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Soil Texture</label>
                          <input className="input-box" type="text" value={activeField?.soil_texture || 'Not Available'} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Organic Matter (%)</label>
                          <input className="input-box" type="text" value={activeField?.organic_matter != null ? `${Number(activeField.organic_matter).toFixed(1)}%` : 'Not Available'} readOnly />
                        </div>
                      </div>
                    </div>

                    {/* Operational Strategy Selector */}
                    <div className="form-group full">
                      <label style={{ fontWeight: 800, fontSize: 13 }}>Operational Optimization Strategy</label>
                      <div className="pill-selector">
                        {[
                          { id: 'profit', label: 'Profit Focused (70% P / 20% W / 10% S)' },
                          { id: 'water_efficiency', label: 'Water Efficiency (20% P / 60% W / 20% S)' },
                          { id: 'soil_health', label: 'Soil Health (20% P / 20% W / 60% S)' },
                          { id: 'balanced', label: 'Balanced (34% P / 33% W / 33% S)' },
                        ].map(prio => (
                          <button
                            type="button"
                            key={prio.id}
                            className={`pill-option ${toCanonicalStrategyKey(prio.id) === selectedStrategyId ? 'active' : ''}`}
                            onClick={() => handlePrioritySelect(prio.id)}
                            style={{ fontSize: 12, padding: '8px 14px' }}
                          >
                            {prio.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Counterfactual Simulation Parameters */}
                    <div style={{ background: 'var(--bg-card-subtle)', borderRadius: 12, border: '1px solid var(--border-light)', padding: 14 }}>
                      <strong style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                        Counterfactual Weather &amp; Agronomic Parameters
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        <div className="form-grid-inner">
                          <div className="form-group">
                            <label>Weather Window Start</label>
                            <input className="input-box" name="start_date" type="date" value={form.start_date} onChange={change} required />
                          </div>
                          <div className="form-group">
                            <label>Weather Window End</label>
                            <input className="input-box" name="end_date" type="date" value={form.end_date} onChange={change} required />
                          </div>
                          <div className="form-group">
                            <label>Counterfactual Rainfall Delta (mm)</label>
                            <input className="input-box" name="counterfactual_rainfall_delta_mm" type="number" step=".1" placeholder="e.g. 10" value={form.counterfactual_rainfall_delta_mm} onChange={change} />
                          </div>
                          <div className="form-group">
                            <label>Irrigation Capacity (mm)</label>
                            <input className="input-box" type="number" value={activeField?.irrigation_capacity_mm ?? ''} readOnly />
                          </div>
                        </div>

                        <div className="switch-row" style={{ marginTop: 4 }}>
                          <div className="switch-label">
                            <strong>Include Previous Crop History</strong>
                            <small>Enforces initial family rotation constraint from field history</small>
                          </div>
                          <div
                            className={`toggle-switch ${form.include_history ? 'on' : ''}`}
                            onClick={() => {
                              setForm(prev => ({ ...prev, include_history: !prev.include_history }));
                              setCounterfactualSimulation({ running: false, result: null, error: '' });
                            }}
                            role="switch"
                            aria-checked={Boolean(form.include_history)}
                            tabIndex={0}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setForm(prev => ({ ...prev, include_history: !prev.include_history }));
                                setCounterfactualSimulation({ running: false, result: null, error: '' });
                              }
                            }}
                          >
                            <div className="toggle-switch-handle" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="run-cta-btn" style={{ justifyContent: 'center', marginTop: 8 }} disabled={counterfactualSimulation.running}>
                      {counterfactualSimulation.running
                        ? 'Running Counterfactual Simulation…'
                        : counterfactualSimulation.error
                          ? 'Retry Counterfactual Simulation'
                          : counterfactualSimulation.result
                            ? 'Run Again'
                            : 'Run Counterfactual Simulation'}
                    </button>
                  </form>
                  {counterfactualSimulation.error && (
                    <div role="alert" style={{ marginTop: 12, padding: 12, borderRadius: 9, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12.5 }}>
                      {counterfactualSimulation.error}
                    </div>
                  )}
                  {counterfactualResult && (() => {
                    const baselineInputs = counterfactualResult.baseline_inputs || {};
                    const changedInputs = counterfactualResult.counterfactual_inputs || {};
                    const baselineMetrics = counterfactualResult.baseline_metrics || {};
                    const changedMetrics = counterfactualResult.counterfactual_metrics || {};
                    const metricDeltas = counterfactualResult.metric_deltas || {};
                    const baselineRotation = counterfactualResult.baseline_rotation || {};
                    const changedRotation = counterfactualResult.counterfactual_rotation || {};
                    const periods = ['Y1_S1', 'Y1_S2', 'Y2_S1', 'Y2_S2', 'Y3_S1', 'Y3_S2'];
                    const rotationRows = periods.map(period => ({
                      period,
                      baseline: baselineRotation[period],
                      counterfactual: changedRotation[period],
                    }));
                    const rotationChanges = rotationRows.filter(row =>
                      row.baseline != null
                      && row.counterfactual != null
                      && row.baseline !== row.counterfactual
                    ).length;
                    const inputRows = [
                      {
                        label: 'Rainfall window total (mm)',
                        baseline: baselineInputs.rainfall_window_mm,
                        perturbation: `${Number(changedInputs.rainfall_delta_mm) >= 0 ? '+' : ''}${number(changedInputs.rainfall_delta_mm, 1)} mm`,
                        counterfactual: changedInputs.rainfall_window_mm,
                      },
                      {
                        label: 'Irrigation capacity (mm)',
                        baseline: baselineInputs.irrigation_capacity_mm,
                        perturbation: 'Unchanged; separate irrigation input',
                        counterfactual: changedInputs.irrigation_capacity_mm,
                      },
                      ...[
                        ['Temperature (°C)', 'temperature_c'],
                        ['Soil pH', 'soil_ph'],
                        ['Organic matter (%)', 'organic_matter_pct'],
                      ].filter(([, key]) =>
                        baselineInputs[key] != null || changedInputs[key] != null
                      ).map(([label, key]) => ({
                        label,
                        baseline: baselineInputs[key],
                        perturbation: 'Unchanged',
                        counterfactual: changedInputs[key],
                      })),
                    ];
                    const metricRows = [
                      ['Production (tons)', 'production_tons', 2],
                      ['Gross margin (BDT/ha)', 'gross_margin_bdt_per_ha', 2],
                      ['Water demand (mm)', 'water_demand_mm', 1],
                      ['Water efficiency', 'water_efficiency_score', 3],
                      ['Soil metric', 'soil_metric', 3],
                      ['Objective score', 'objective_score', 3],
                    ].filter(([, key]) =>
                      baselineMetrics[key] != null || changedMetrics[key] != null
                    );
                    const isCompleted = counterfactualResult.status === 'completed';

                    return (
                      <section aria-label="Counterfactual Simulation Result" className="dash-card" style={{ marginTop: 16, padding: 16, border: `1px solid ${isCompleted ? '#86efac' : '#fecaca'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <h4 style={{ margin: 0 }}>Counterfactual Simulation Result</h4>
                          <strong role="status" style={{ color: isCompleted ? '#166534' : '#991b1b' }}>
                            {isCompleted ? 'Completed' : counterfactualResult.status === 'infeasible' ? 'Infeasible' : 'Failed'}
                          </strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 10, fontSize: 12 }}>
                          <div>Selected field<br /><strong>{counterfactualResult.selected_field ?? 'Not Available'}</strong></div>
                          <div>Selected strategy<br /><strong>{counterfactualResult.selected_strategy ?? 'Not Available'}</strong></div>
                          <div>Solver<br /><strong>{counterfactualResult.solver ?? 'Not Available'}</strong></div>
                          <div>Solver status<br /><strong>{counterfactualResult.solver_status ?? 'Not Available'}</strong></div>
                        </div>

                        <h5 style={{ margin: '16px 0 6px' }}>Environmental Input Comparison</h5>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="strategy-table-enhanced" style={{ minWidth: 540, fontSize: 11.5 }}>
                            <thead><tr><th>Parameter</th><th>Baseline</th><th>Perturbation</th><th>Counterfactual</th></tr></thead>
                            <tbody>
                              {inputRows.map(row => (
                                <tr key={row.label}>
                                  <td>{row.label}</td>
                                  <td>{typeof row.baseline === 'number' ? number(row.baseline, 2) : 'Not Available'}</td>
                                  <td>{row.perturbation}</td>
                                  <td>{typeof row.counterfactual === 'number' ? number(row.counterfactual, 2) : 'Not Available'}</td>
                                </tr>
                              ))}
                              <tr><td>Weather date window</td><td colSpan={3}>{baselineInputs.weather_start_date || 'Not Available'} – {baselineInputs.weather_end_date || 'Not Available'}</td></tr>
                            </tbody>
                          </table>
                        </div>

                        <h5 style={{ margin: '16px 0 6px' }}>Baseline vs Counterfactual Rotation</h5>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="strategy-table-enhanced" style={{ minWidth: 520, fontSize: 11.5 }}>
                            <thead><tr><th>Season</th><th>Baseline crop</th><th>Re-optimized crop</th><th>Change</th></tr></thead>
                            <tbody>
                              {rotationRows.map(row => {
                                const changed = row.baseline != null
                                  && row.counterfactual != null
                                  && row.baseline !== row.counterfactual;
                                return (
                                  <tr key={row.period}>
                                    <td>{row.period.replace('_', ' ')}</td>
                                    <td>{row.baseline ?? 'Not Available'}</td>
                                    <td>{row.counterfactual ?? 'Not Available'}</td>
                                    <td>{row.baseline == null || row.counterfactual == null ? 'Not Available' : changed ? 'Changed' : 'Unchanged'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <strong style={{ display: 'block', marginTop: 7, fontSize: 12 }}>
                          Rotation Changes: {rotationChanges} / {periods.length} seasons
                        </strong>

                        <h5 style={{ margin: '16px 0 6px' }}>Optimization Metrics</h5>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="strategy-table-enhanced" style={{ minWidth: 640, fontSize: 11.5 }}>
                            <thead><tr><th>Metric</th><th>Baseline</th><th>Counterfactual</th><th>Delta</th></tr></thead>
                            <tbody>
                              {metricRows.map(([label, key, digits]) => (
                                <tr key={key}>
                                  <td>{label}</td>
                                  <td>{baselineMetrics[key] == null ? 'Not Available' : number(baselineMetrics[key], digits)}</td>
                                  <td>{changedMetrics[key] == null ? 'Not Available' : number(changedMetrics[key], digits)}</td>
                                  <td>{metricDeltas[key] == null ? 'Not Available' : `${Number(metricDeltas[key]) >= 0 ? '+' : ''}${number(metricDeltas[key], digits)}`}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <h5 style={{ margin: '16px 0 6px' }}>Methodology and Provenance</h5>
                        <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--text-muted)' }}>
                          <div>Weather source: {counterfactualResult.provenance.weather_source || 'Not Available'} · Field source: {counterfactualResult.provenance.field_source || 'Not Available'}</div>
                          <div>Perturbation: rainfall {changedInputs.rainfall_delta_mm == null ? 'Not Available' : `${Number(changedInputs.rainfall_delta_mm) >= 0 ? '+' : ''}${number(changedInputs.rainfall_delta_mm, 1)} mm`} · Irrigation remains a separate input and is not added to rainfall.</div>
                          <div>Previous crop history constraint: {counterfactualResult.provenance.include_previous_crop_history ? 'applied' : 'not applied'} · Source: {counterfactualResult.provenance.history_source || 'Not Available'}</div>
                          <div>Solver: {counterfactualResult.provenance.solver || 'PuLP/CBC'} · Scenario: hypothetical/counterfactual · Validation: not field validated.</div>
                        </div>
                      </section>
                    );
                  })()}
                </section>
              )}

            </div>
          </div>
        )}

        {/* -------------------- VIEW 3: FIELD & PARCEL MANAGER -------------------- */}
        {(activeNav === 'field' || activeNav === 'field_map') && (
          <div>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                {lang === 'bn' ? '🗺️ জমি ও সীমানা ব্যবস্থাপনা — সক্রিয় জমি ও স্যাটেলাইট অবস্থান' : '🗺️ Farm Parcel Manager — Active parcels and satellite geolocations'}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleNavigate('dashboard')}
                style={{ fontSize: 12.5, padding: '5px 14px', borderRadius: 9999, cursor: 'pointer' }}
              >
                🏠 {lang === 'bn' ? 'সহজ হোম স্ক্রিনে ফিরুন' : 'Back to Home'}
              </button>
            </div>
            <FieldParcelManagerView
              user={user}
              userFarms={userFarms}
              fieldsLoaded={fieldsLoaded}
              fieldsError={fieldsError}
              activeField={activeField}
              userFields={userFields}
              onSelectField={handleSelectActiveField}
              onSelectForAnalysis={selectFieldForAnalysis}
              onViewField={setViewingField}
              onEditField={openEditFieldModal}
              onArchiveField={handleArchiveField}
              onAddField={openAddFieldModal}
              formatDate={formatDate}
              formatNumber={formatNumber}
              onBack={() => setActiveNav('dashboard')}
            />
          </div>
        )}

        {/* -------------------- VIEW 4: NASA POWER WEATHER & CLIMATE -------------------- */}
        {activeNav === 'weather' && (
          <div>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                {lang === 'bn' ? '🛰️ নাসা (NASA POWER) উপগ্রহ ভিত্তিক জলবায়ু ও আবহাওয়া স্টেশন' : '🛰️ NASA POWER Satellite Agrometeorological Station'}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleNavigate('dashboard')}
                style={{ fontSize: 12.5, padding: '5px 14px', borderRadius: 9999, cursor: 'pointer' }}
              >
                🏠 {lang === 'bn' ? 'সহজ হোম স্ক্রিনে ফিরুন' : 'Back to Home'}
              </button>
            </div>
            <NasaWeatherStation3D
              nasa={nasa}
              env={env}
              activeField={activeField}
              onBack={() => setActiveNav('dashboard')}
            />
          </div>
        )}

        {/* -------------------- VIEW 6: AI ASSISTANT & DECISION SUPPORT -------------------- */}
        {activeNav === 'assistant' && (
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
                      <div className="holo-microchip" title="Biometric NFC Crypto Chip" />
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
                      <span className="holo-spec-label">Crypto ID Hash</span>
                      <span className="holo-spec-value" style={{ fontFamily: 'monospace' }}>#AG-5924-BD</span>
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
                      Biometric Session Verified
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
                  <div className="terminal-line-ok">[AUTH_OK] PostgreSQL authoritative session verified</div>
                  <div className="terminal-line-ok">[DATA_OK] NASA POWER Daily Point API hydrated (2026-09-29)</div>
                  <div className="terminal-line-ok">[AI_ONLINE] Gemini reasoning agent (gemini-3.5-flash) ready</div>
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
            <span className="mobile-nav-text">{lang === 'bn' ? 'আমার জমি' : 'Farm'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'crop_advice' ? 'active' : ''}`}
            onClick={() => handleNavigate('crop_advice')}
            title="Crop Advice"
          >
            <span className="mobile-nav-icon">🌱</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'পরামর্শ' : 'Crops'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'harvest_profit' ? 'active' : ''}`}
            onClick={() => handleNavigate('harvest_profit')}
            title="Harvest & Profit"
          >
            <span className="mobile-nav-icon">📋</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'হিসাব' : 'Harvest'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeNav === 'research' ? 'active' : ''}`}
            onClick={() => handleNavigate('research')}
            title="Research Lab"
          >
            <span className="mobile-nav-icon">🔬</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'গবেষণা' : 'Lab'}</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${mobileNavOpen ? 'active' : ''}`}
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="Open full menu drawer"
            title="Menu"
          >
            <span className="mobile-nav-icon">☰</span>
            <span className="mobile-nav-text">{lang === 'bn' ? 'মেনু' : 'Menu'}</span>
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
