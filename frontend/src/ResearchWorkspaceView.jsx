// frontend/src/ResearchWorkspaceView.jsx
// Dedicated Advanced Research Workspace with Responsive Glassmorphic 3D Lab Navigation
// Features:
// - Left compact glassmorphic sidebar with collapsible logical groups:
//   * A. Planning & Optimization (MILP, Comparison Lab, Adaptive Replanning)
//   * B. 3D Experiments (Farm Simulator, Soil Profile, Crop Growth, Climate Stress, Rhizosphere, A/B Comparison, Stress Tests)
//   * C. Sensitivity & Robustness (Sensitivity Sweeps, Weather Uncertainty, Crop Recovery, RL Sandbox)
//   * D. Data & Validation (Synthetic Data Lab, Provenance Registry, Actual vs Estimated Outcomes, Crop Catalog, Satellites, Soil Health)
// - Search / Quick-Switch live filter for all 20 research modules
// - Mobile drawer overlay with responsive toggle
// - Breadcrumbs and current module HUD
// - Workspace Overview Command Center launchpad
// - Zero navigation conflicts: active tab strictly matches rendered view

import React, { useState, useMemo } from 'react';
import { useTranslation } from './i18n.js';
import { SixSeasonRecommendationView } from './SixSeasonRecommendationView.jsx';
import { ExperimentSimulator3DView } from './ExperimentSimulator3DView.jsx';

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Workspace tab runtime error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px',
          background: 'var(--glass-bg-card, rgba(15,23,42,0.85))',
          borderRadius: 16,
          border: '1px solid rgba(239, 68, 68, 0.3)',
          textAlign: 'center',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--hud-red)', fontSize: 17, fontWeight: 800 }}>
            {this.props.fallbackTitle || 'Display Module Notice'}
          </h4>
          <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: 13, maxWidth: 600, marginInline: 'auto' }}>
            {this.props.fallbackMessage || 'An unexpected rendering or graphics context issue occurred in this research module.'}
          </p>
          <div style={{ fontSize: 12, color: 'var(--hud-red)', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8, maxWidth: 640, margin: '0 auto 16px', wordBreak: 'break-all' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: 'var(--hud-cyan)',
              color: 'var(--text)',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            🔄 Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ComparisonLabView } from './ComparisonLabView.jsx';
import { CropFailureRecoveryView } from './CropFailureRecoveryView.jsx';
import { AdaptiveReplanningView } from './AdaptiveReplanningView.jsx';
import { WeatherUncertaintyView } from './WeatherUncertaintyView.jsx';
import { SustainabilityTrackerView } from './SustainabilityTrackerView.jsx';
import { CropCatalogView } from './CropCatalogView.jsx';
import { SatelliteReadinessView } from './SatelliteReadinessView.jsx';
import { ActualOutcomesView } from './ActualOutcomesView.jsx';
import { SyntheticDataLabView } from './SyntheticDataLabView.jsx';
import { SensitivityAnalysisView } from './SensitivityAnalysisView.jsx';
import { MultiFieldExperimentView } from './MultiFieldExperimentView.jsx';
import { AdaptiveRlExperiment } from './AdaptiveRlExperiment.jsx';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { request as defaultRequest } from './apiClient.js';

export function ResearchWorkspaceView({
  activeField,
  nasa,
  summary,
  plan,
  ml,
  rl,
  comparisonLab,
  robustness,
  outcomes,
  user,
  userFields,
  onNavigate,
  onRunWorkflow,
  initialTab = 'six_seasons_milp',
  lang = 'bn',
  request: propRequest,
  formatNumber: propFormatNumber,
  strategyProfiles: propStrategyProfiles
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;
  const strategyProfiles = propStrategyProfiles || {
    profit_focused: { name: 'Profit Focused', icon: '💰', weights: { profit: 0.70, water: 0.20, soil: 0.10 } },
    water_efficiency: { name: 'Water Efficiency', icon: '💧', weights: { profit: 0.20, water: 0.60, soil: 0.20 } },
    soil_health: { name: 'Soil Health & Regeneration', icon: '🌱', weights: { profit: 0.20, water: 0.20, soil: 0.60 } },
    balanced: { name: 'Balanced Multi-Objective', icon: '⚖️', weights: { profit: 0.34, water: 0.33, soil: 0.33 } }
  };

  const [subTab, setSubTab] = useState(
    initialTab === 'milp' || initialTab === 'six_seasons_milp' || !initialTab
      ? 'six_seasons_milp'
      : initialTab
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const { t } = useTranslation(lang);

  // Group Definitions based on scientific architecture
  const GROUPS = useMemo(() => [
    {
      id: 'planning',
      title: lang === 'bn' ? 'ক. পরিকল্পনা ও অপ্টিমাইজেশন' : 'A. Planning & Optimization',
      icon: '🌾',
      items: [
        { id: 'six_seasons_milp', label: lang === 'bn' ? '৬-মৌসুম ফসল পরিকল্পনা ও রোটেশন (MILP)' : '6-Season Crop Recommendation (MILP)', icon: '🌾', badge: 'MILP' },
        { id: 'comparison_lab', label: lang === 'bn' ? 'তুলনামূলক ল্যাব (MILP বনাম RL বনাম Rule)' : 'Comparison Lab (MILP vs RL vs Rule)', icon: '🧪', badge: '3-WAY' },
        { id: 'replan', label: lang === 'bn' ? 'পরবর্তী মৌসুমের অভিযোজিত পুনঃপরিকল্পনা' : 'Adaptive Next-Season Replanning', icon: '🔄', badge: 'ADAPTIVE' }
      ]
    },
    {
      id: 'experiments_3d',
      title: lang === 'bn' ? 'খ. ত্রিমাত্রিক বিজ্ঞান ল্যাব' : 'B. 3D Experiments',
      icon: '🔬',
      items: [
        { id: 'experiment_simulator_3d', label: lang === 'bn' ? '৩ডি খামার সিমুলেটর ওয়ার্কবেঞ্চ' : 'Farm Experiment Simulator', icon: '🔬', badge: '3D' },
        { id: 'soil_water_3d', label: lang === 'bn' ? 'মাটি স্তর ও পানি ব্যালেন্স' : 'Soil Profile & Water Balance', icon: '💧', badge: 'FAO-56' },
        { id: 'crop_growth_3d', label: lang === 'bn' ? 'ফসলের বৃদ্ধি ও ফেনোলজি' : 'Crop Growth & Phenology', icon: '🌱', badge: 'FAO-33' },
        { id: 'climate_stress_3d', label: lang === 'bn' ? 'জলবায়ু ও তাপমাত্রা চাপ' : 'Climate Stress Scenarios', icon: '☀️', badge: 'NASA' },
        { id: 'nutrient_3d', label: lang === 'bn' ? 'পুষ্টি ও রাইজোস্ফিয়ার BNF' : 'Nutrient & Rhizosphere BNF', icon: '🧪', badge: 'BARI' },
        { id: 'scenario_ab_3d', label: lang === 'bn' ? 'দৃশ্যকল্প এ/বি দ্বৈত তুলনা' : 'Scenario A/B Comparison', icon: '⚖️', badge: 'DUAL' },
        { id: 'stress_tests_3d', label: lang === 'bn' ? '৯টি বৈজ্ঞানিক স্ট্রেস টেস্ট বেঞ্চ' : 'Scientific Stress Test Bench', icon: '⚡', badge: '9 TESTS' }
      ]
    },
    {
      id: 'sensitivity_robustness',
      title: lang === 'bn' ? 'গ. সংবেদনশীলতা ও স্থিতিস্থাপকতা' : 'C. Sensitivity & Robustness',
      icon: '📐',
      items: [
        { id: 'multi_field_experiment', label: lang === 'bn' ? 'মাল্টি-ফিল্ড এক্সপেরিমেন্ট ও সংবেদনশীলতা ল্যাব' : 'Multi-Field Experiment & Sensitivity Lab', icon: '🧪', badge: '6-FIELDS' },
        { id: 'sensitivity', label: lang === 'bn' ? 'সংবেদনশীলতা বিশ্লেষণ (Sweeps)' : 'Sensitivity Analysis', icon: '📐', badge: 'SWEEPS' },
        { id: 'uncertainty', label: lang === 'bn' ? 'আবহাওয়ার অনিশ্চয়তা বিশ্লেষণ' : 'Weather Uncertainty', icon: '🌦️', badge: 'STRESS' },
        { id: 'recovery', label: lang === 'bn' ? 'ফসল বিপর্যয় ও পুনরুদ্ধার পরিকল্পনা' : 'Crop Failure & Recovery', icon: '🛡️', badge: 'MILP' },
        { id: 'rl_policy', label: lang === 'bn' ? 'রিইনফোর্সমেন্ট লার্নিং স্যান্ডবক্স' : 'RL Simulation Sandbox', icon: '🎮', badge: 'Q-LEARN' }
      ]
    },
    {
      id: 'data_validation',
      title: lang === 'bn' ? 'ঘ. তথ্য ও মূল্যায়ন' : 'D. Data & Validation',
      icon: '📊',
      items: [
        { id: 'synthetic_lab', label: lang === 'bn' ? 'কৃত্রিম ডেটা জেনারেটর ল্যাব' : 'Synthetic Data Lab', icon: '🧬', badge: 'SEED 42' },
        { id: 'provenance', label: lang === 'bn' ? 'তথ্য উৎস ও নির্ভরযোগ্যতা টায়ার' : 'Provenance & Reliability', icon: '🏛️', badge: '4-TIER' },
        { id: 'outcomes', label: lang === 'bn' ? 'বাস্তব বনাম আনুমানিক ফলাফল' : 'Actual vs Estimated Outcomes', icon: '📋', badge: 'VALIDATION' },
        { id: 'crop_catalog', label: lang === 'bn' ? 'বাংলাদেশ শস্য তথ্যকোষ' : 'Bangladesh Crop Database', icon: '📚', badge: 'BARI' },
        { id: 'satellite', label: lang === 'bn' ? 'স্যাটেলাইট সেন্সর প্রস্তুতি' : 'Satellite Sensor Readiness', icon: '📡', badge: 'NASA/ESA' },
        { id: 'sustainability', label: lang === 'bn' ? 'মাটি স্বাস্থ্য ও নাইট্রোজেন স্থায়িত্ব' : 'Soil Health & Nitrogen', icon: '🌿', badge: 'MULTI-YR' }
      ]
    }
  ], [lang]);

  // Flattened items for lookup and search
  const allItems = useMemo(() => {
    return GROUPS.flatMap(g => g.items.map(item => ({ ...item, group: g })));
  }, [GROUPS]);

  const activeItem = useMemo(() => {
    return allItems.find(i => i.id === subTab) || null;
  }, [allItems, subTab]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return GROUPS;
    const q = searchQuery.toLowerCase();
    return GROUPS.map(g => ({
      ...g,
      items: g.items.filter(i =>
        i.label.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.badge && i.badge.toLowerCase().includes(q))
      )
    })).filter(g => g.items.length > 0);
  }, [GROUPS, searchQuery]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const selectModule = (moduleId) => {
    setSubTab(moduleId);
    setMobileOpen(false);
  };

  return (
    <div className="research-workspace-container" style={{ padding: '0 0 40px 0' }}>
      {/* Research Workspace Top Header Banner */}
      <div className="research-header-banner ui-card-hud" style={{
        background: 'linear-gradient(135deg, rgba(14, 23, 38, 0.95) 0%, rgba(10, 16, 26, 0.98) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '20px',
        padding: '24px 28px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '26px' }}>🔬</span>
            <span style={{
              fontSize: '11px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(0, 223, 129, 0.15)',
              color: 'var(--hud-teal)',
              border: '1px solid rgba(0, 223, 129, 0.3)',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              FIELDSHIFT ADVANCED RESEARCH SUITE
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 900, color: 'var(--text)' }}>
            {lang === 'bn' ? 'উন্নত কৃষি বিজ্ঞান, অ্যালগরিদমিক অপ্টিমাইজেশন ও ৩ডি ল্যাব' : 'Agricultural Science, Algorithmic Optimization & 3D Research Lab'}
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-2)', lineHeight: 1.5 }}>
            {lang === 'bn'
              ? 'PuLP MILP মাল্টি-পিরিয়ড অপ্টিমাইজেশন, কিউ-লার্নিং (RL), সেনসিটিভিটি সুইপস, সিন্থেটিক ডেটাবেঞ্চ এবং ৪-স্তরের প্রোভেন্যান্স বিশিষ্ট বৈজ্ঞানিক রিসার্চ ইন্টারফেস।'
              : 'PuLP MILP multi-period optimization, Q-learning RL, sensitivity sweeps, synthetic benchmark generation, and 4-tier data provenance for precision agricultural scientists and judges.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="research-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span>☰</span>
            <span>{lang === 'bn' ? 'মডিউল মেনু' : 'Research Menu'}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-light"
            onClick={() => onNavigate('dashboard')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>←</span>
            <span>{lang === 'bn' ? 'সহজ কৃষক ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace Layout */}
      <div className="research-workspace-layout">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="research-sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Left Compact Glassmorphic Sidebar */}
        <aside className={`research-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          {/* Sidebar Top: Overview Quick Link */}
          <button
            type="button"
            className={`research-nav-item ${subTab === 'overview' ? 'active' : ''}`}
            onClick={() => selectModule('overview')}
            style={{ marginBottom: '4px' }}
          >
            <div className="research-nav-label-box">
              <span className="research-nav-icon">🧭</span>
              <span className="research-nav-text" style={{ fontWeight: 800 }}>
                {lang === 'bn' ? 'ল্যাব ওভারভিউ ও লঞ্চপ্যাড' : 'Workspace Overview & Launchpad'}
              </span>
            </div>
            <span className="research-nav-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--hud-cyan)' }}>
              ALL
            </span>
          </button>

          {/* Search / Filter Box */}
          <div className="research-search-box">
            <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>🔍</span>
            <input
              type="text"
              className="research-search-input"
              placeholder={lang === 'bn' ? 'ল্যাব বা মডেল খুঁজুন...' : 'Search modules & models...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 4 Logical Groups */}
          {filteredGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]);
            return (
              <div key={group.id} className="research-nav-group">
                <button
                  type="button"
                  className="research-group-header"
                  onClick={() => toggleGroup(group.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{group.icon}</span>
                    <span>{group.title}</span>
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {isCollapsed ? '▼' : '▲'} ({group.items.length})
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="research-group-items">
                    {group.items.map((item) => {
                      const isActive = subTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`research-nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => selectModule(item.id)}
                          title={item.label}
                        >
                          <div className="research-nav-label-box">
                            <span className="research-nav-icon">{item.icon}</span>
                            <span className="research-nav-text">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className="research-nav-badge"
                              style={{
                                background: isActive ? 'rgba(0, 223, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                color: isActive ? 'var(--hud-teal)' : 'var(--text-2)'
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sidebar Footer Field Info */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '11.5px',
            color: 'var(--text-3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{lang === 'bn' ? 'সক্রিয় জমি:' : 'Active Field:'}</span>
              <span style={{ color: 'var(--hud-teal)', fontWeight: 700 }}>
                {activeField?.name || 'Bogura Demo Field'} ({formatNumber(activeField?.area_ha || 10.0, 1)} ha)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang === 'bn' ? 'কোঅর্ডিনেট:' : 'Coordinates:'}</span>
              <span>24.85°N, 89.37°E</span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="research-content-area">
          {/* Top Bar with Breadcrumbs & Context Info */}
          <div className="research-top-bar">
            <div className="research-breadcrumbs">
              <span
                className="research-breadcrumb-link"
                onClick={() => setSubTab('overview')}
              >
                🔬 {lang === 'bn' ? 'রিসার্চ ওয়ার্কস্পেস' : 'Research Workspace'}
              </span>
              <span>/</span>
              {activeItem ? (
                <>
                  <span className="research-breadcrumb-link" onClick={() => setSubTab('overview')}>
                    {activeItem.group.title}
                  </span>
                  <span>/</span>
                  <span className="research-breadcrumb-current">
                    {activeItem.icon} {activeItem.label}
                  </span>
                </>
              ) : (
                <span className="research-breadcrumb-current">
                  🧭 {lang === 'bn' ? 'ল্যাব ওভারভিউ' : 'Workspace Overview'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSubTab('overview')}
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
              >
                {lang === 'bn' ? 'সব মডিউল' : 'Overview'}
              </button>
            </div>
          </div>

          {/* Sub-tab Content Mounting */}
          {subTab === 'overview' && (
            <div className="research-overview-launchpad">
              <div className="dash-card" style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                  🧭 {lang === 'bn' ? 'রিসার্চ ল্যাব কমান্ড সেন্টার ও লঞ্চপ্যাড' : 'Research Lab Command Center & Launchpad'}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {lang === 'bn'
                    ? 'নিচে ৪টি প্রধান গ্রুপের ২০টি বৈজ্ঞানিক মডিউলের তালিকা দেওয়া হলো। যেকোনো মডিউল এক ক্লিকে খুলুন।'
                    : 'Instant access to all 20 scientific modules categorized into 4 research domains. Select any card to launch.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {GROUPS.map((group) => (
                  <div key={group.id}>
                    <h4 style={{
                      margin: '0 0 12px',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{group.icon}</span>
                      <span>{group.title}</span>
                    </h4>
                    <div className="research-launchpad-grid">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="research-launchpad-card"
                          onClick={() => selectModule(item.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px' }}>{item.icon}</span>
                            {item.badge && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: 'var(--hud-cyan)',
                                border: '1px solid rgba(56, 189, 248, 0.3)'
                              }}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                              {item.label}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                              {lang === 'bn' ? 'ল্যাবে প্রবেশ করুন →' : 'Launch Module →'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP A: PLANNING & OPTIMIZATION */}
          {subTab === 'six_seasons_milp' && (
            <SixSeasonRecommendationView
              activeField={activeField}
              summary={summary}
              plan={plan}
              ml={ml}
              user={user}
              userFields={userFields}
              onNavigateTab={(tab) => setSubTab(tab)}
              onBack={() => setSubTab('overview')}
              onRunWorkflow={onRunWorkflow}
              lang={lang}
            />
          )}

          {subTab === 'comparison_lab' && (
            <ComparisonLabView
              activeField={activeField}
              comparisonLab={comparisonLab}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'replan' && (
            <AdaptiveReplanningView
              activeField={activeField}
              plan={plan}
              summary={summary}
              user={user}
              userFields={userFields}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {/* GROUP B: 3D EXPERIMENTS */}
          {(subTab === 'experiment_simulator_3d' ||
            subTab === 'soil_water_3d' ||
            subTab === 'crop_growth_3d' ||
            subTab === 'climate_stress_3d' ||
            subTab === 'nutrient_3d' ||
            subTab === 'scenario_ab_3d' ||
            subTab === 'stress_tests_3d') && (
            <WorkspaceErrorBoundary
              key={subTab}
              fallbackTitle={lang === 'bn' ? 'ত্রিমাত্রিক কৃষি দৃশ্য লোডে সমস্যা' : '3D Farm Simulator Display Notice'}
              fallbackMessage={lang === 'bn' ? 'Three.js ইঞ্জিন বা WebGL রেন্ডার করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।' : 'An issue occurred initializing or rendering the Three.js 3D scene.'}
            >
              <ExperimentSimulator3DView
                activeField={activeField}
                onBack={() => setSubTab('overview')}
                onNavigateTab={(tab) => setSubTab(tab)}
                lang={lang}
                request={request}
                formatNumber={formatNumber}
                initialMainTab={
                  subTab === 'scenario_ab_3d' ? 'scenario_comparison' :
                  subTab === 'stress_tests_3d' ? 'stress_tests' : '3d_experiment'
                }
                initial3DViewMode={
                  subTab === 'soil_water_3d' ? 'soil_profile' :
                  subTab === 'crop_growth_3d' ? 'crop_growth' :
                  subTab === 'climate_stress_3d' ? 'climate_stress' :
                  subTab === 'nutrient_3d' ? 'nutrient_profile' : 'farm_all'
                }
              />
            </WorkspaceErrorBoundary>
          )}

          {/* GROUP C: SENSITIVITY & ROBUSTNESS */}
          {subTab === 'multi_field_experiment' && (
            <MultiFieldExperimentView
              lang={lang}
              request={request}
              formatNumber={formatNumber}
            />
          )}

          {subTab === 'sensitivity' && (
            <SensitivityAnalysisView
              activeField={activeField}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'uncertainty' && (
            <WeatherUncertaintyView
              activeField={activeField}
              plan={plan}
              analysisResult={plan}
              summary={summary}
              robustness={robustness}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'recovery' && (
            <CropFailureRecoveryView
              activeField={activeField}
              plan={plan}
              analysisResult={plan}
              summary={summary}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'rl_policy' && (
            <AdaptiveRlExperiment
              activeField={activeField}
              request={request}
              formatNumber={formatNumber}
              strategyProfiles={strategyProfiles}
              onBack={() => setSubTab('overview')}
              lang={lang}
            />
          )}

          {/* GROUP D: DATA & VALIDATION */}
          {(subTab === 'synthetic_lab' || subTab === 'provenance') && (
            <SyntheticDataLabView
              activeField={activeField}
              request={request}
              formatNumber={formatNumber}
              initialTab={subTab === 'provenance' ? 'provenance' : 'generator'}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'outcomes' && (
            <ActualOutcomesView
              activeField={activeField}
              user={user}
              analysisResult={plan}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'crop_catalog' && (
            <CropCatalogView
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'satellite' && (
            <SatelliteReadinessView
              activeField={activeField}
              nasa={nasa}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}

          {subTab === 'sustainability' && (
            <SustainabilityTrackerView
              activeField={activeField}
              plan={plan}
              analysisResult={plan}
              summary={summary}
              request={request}
              formatNumber={formatNumber}
              onBack={() => setSubTab('overview')}
              onNavigateTab={(tab) => setSubTab(tab)}
              lang={lang}
            />
          )}
        </main>
      </div>
    </div>
  );
}
