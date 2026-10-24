// frontend/src/ResearchWorkspaceView.jsx
// Dedicated Advanced Research Workspace for scientific algorithms, PuLP MILP, RL benchmarks, and data provenance

import React, { useState } from 'react';
import { useTranslation } from './i18n.js';
import { ExperimentSimulator3DView } from './ExperimentSimulator3DView.jsx';
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
import { AdaptiveRlExperiment } from './AdaptiveRlExperiment.jsx';

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
  initialTab = 'experiment_simulator_3d',
  lang = 'bn'
}) {
  const [subTab, setSubTab] = useState(initialTab === 'milp' ? 'experiment_simulator_3d' : initialTab);
  const { t } = useTranslation(lang);

  const TABS = [
    { id: 'experiment_simulator_3d', label: '🔬 3D Farm Experiment Simulator & Scenario Workbench' },
    { id: 'comparison_lab', label: '🧪 Comparison Lab (MILP vs RL vs Rule)' },
    { id: 'sensitivity', label: '📐 Sensitivity Sweeps' },
    { id: 'synthetic_lab', label: '🧬 Synthetic Data Lab & Provenance' },
    { id: 'replan', label: '🔄 Adaptive Next-Season Replan' },
    { id: 'rl_policy', label: '🎮 RL Simulation Sandbox' },
    { id: 'stress_testing', label: '⚡ Climate Stress Scenarios' },
    { id: 'recovery', label: '🛡️ Crop Failure & Recovery' },
    { id: 'uncertainty', label: '🌦️ Weather Uncertainty' },
    { id: 'sustainability', label: '🌾 Soil Health & Nitrogen' },
    { id: 'satellite', label: '📡 Satellite Sensor Readiness' },
    { id: 'crop_catalog', label: '📚 Bangladesh Crop Database' },
    { id: 'outcomes', label: '⚖️ Actual vs Estimated Outcomes' }
  ];

  return (
    <div className="research-workspace-container">
      {/* Research Workspace Header Banner */}
      <div className="research-header-banner">
        <div className="research-header-content">
          <div className="research-badge">
            <span>🔬 Scientific Research &amp; Algorithmic Workspace</span>
          </div>
          <h2 className="research-title">উন্নত কৃষি বিজ্ঞান ও গাণিতিক মডেল ল্যাব</h2>
          <p className="research-desc">
            MILP optimization (PuLP), Reinforcement Learning (Q-learning), sensitivity sweeps, synthetic benchmark generation, and data provenance tiers for precision agricultural researchers and NASA Space Apps judges.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-light"
          onClick={() => onNavigate('dashboard')}
        >
          ← সহজ কৃষক ড্যাশবোর্ডে ফিরুন
        </button>
      </div>

      {/* Research Sub-tabs Navigation */}
      <div className="research-tabs-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`research-tab-btn ${subTab === tab.id ? 'active' : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content Mounting */}
      <div className="research-tab-content">
        {subTab === 'experiment_simulator_3d' && (
          <ExperimentSimulator3DView
            activeField={activeField}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
            lang={lang}
          />
        )}

        {subTab === 'comparison_lab' && (
          <ComparisonLabView
            activeField={activeField}
            comparisonLab={comparisonLab}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'sensitivity' && (
          <SensitivityAnalysisView
            activeField={activeField}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'synthetic_lab' && (
          <SyntheticDataLabView
            activeField={activeField}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'replan' && (
          <AdaptiveReplanningView
            activeField={activeField}
            plan={plan}
            summary={summary}
            user={user}
            userFields={userFields}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'rl_policy' && (
          <AdaptiveRlExperiment
            activeField={activeField}
            onBack={() => setSubTab('comparison_lab')}
          />
        )}

        {subTab === 'recovery' && (
          <CropFailureRecoveryView
            activeField={activeField}
            plan={plan}
            summary={summary}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'uncertainty' && (
          <WeatherUncertaintyView
            activeField={activeField}
            plan={plan}
            summary={summary}
            robustness={robustness}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'sustainability' && (
          <SustainabilityTrackerView
            activeField={activeField}
            plan={plan}
            summary={summary}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'satellite' && (
          <SatelliteReadinessView
            activeField={activeField}
            nasa={nasa}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'crop_catalog' && (
          <CropCatalogView
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'outcomes' && (
          <ActualOutcomesView
            activeField={activeField}
            user={user}
            onBack={() => setSubTab('comparison_lab')}
            onNavigateTab={(tab) => setSubTab(tab)}
          />
        )}

        {subTab === 'stress_testing' && (
          <div className="stress-testing-wrapper">
            <WeatherUncertaintyView
              activeField={activeField}
              plan={plan}
              summary={summary}
              robustness={robustness}
              onBack={() => setSubTab('comparison_lab')}
              onNavigateTab={(tab) => setSubTab(tab)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
