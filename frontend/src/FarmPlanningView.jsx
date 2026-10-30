// frontend/src/FarmPlanningView.jsx
// Farm Planning Workspace for FieldShift 2026
// Sub-navigation: 6-Season Rotation Planner (MILP), Adaptive Replanning, Scenario Comparison Lab.
// Orchestrates multi-period PuLP MILP optimization, dynamic in-season replanning, and 3-way algorithmic benchmarks.

import React, { useState } from 'react';
import { SixSeasonRecommendationView } from './SixSeasonRecommendationView.jsx';
import { AdaptiveReplanningView } from './AdaptiveReplanningView.jsx';
import { ComparisonLabView } from './ComparisonLabView.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';

export function FarmPlanningView({
  activeField,
  summary,
  plan,
  ml,
  user,
  userFields = [],
  lang = 'bn',
  onNavigate,
  onRunWorkflow,
  initialSubTab = 'milp',
  request,
}) {
  const { t } = useTranslation(lang);
  const [subTab, setSubTab] = useState(initialSubTab); // 'milp' | 'replan' | 'comparison'

  const subTabs = [
    { id: 'milp', labelBn: '৬-মৌসুম ফসল পরিকল্পনা (MILP)', labelEn: '1. 6-Season Rotation Planner', icon: '🌾' },
    { id: 'replan', labelBn: 'অভিযোজিত পুনঃপরিকল্পনা (Adaptive Replan)', labelEn: '2. Adaptive Next-Season Replan', icon: '🔄' },
    { id: 'comparison', labelBn: 'তুলনামূলক ল্যাব (MILP vs RL vs Rule)', labelEn: '3. 3-Way Comparison Lab', icon: '🧪' },
  ];

  return (
    <div className="farm-planning-workspace" style={{ padding: '20px 0 40px 0', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Top Banner & Sub-Navigation */}
      <div
        className="dash-card"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>🌾📐</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#00df81',
                  background: 'rgba(0, 223, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(0, 223, 129, 0.3)',
                  letterSpacing: '0.04em',
                }}
              >
                PULP MILP OPTIMIZATION ENGINE
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {activeField?.name || 'Bogura Demo Field'} ({formatNumber(activeField?.area_ha || 10.0, 1)} ha)
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#f8fafc' }}>
              {lang === 'bn' ? 'খামার পরিকল্পনা ও বহু-মৌসুমী ফসল আবর্তন' : 'Multi-Season Farm Rotation Planning'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? '৩ বছর ও ৬ মৌসুমের গাণিতিক অপ্টিমাইজেশন (PuLP MILP), নাইট্রোজেন ফিক্সিং ডালশস্য নিয়ম, বোটানিক্যাল পরিবার পর্যায়ক্রম ও মধ্য-মৌসুমী অভিযোজিত পুনঃপরিকল্পনা।'
                : 'PuLP Mixed-Integer Linear Programming (MILP) solving multi-objective trade-offs across profit, water conservation, and soil health with dynamic in-season replanning.'}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14, flexWrap: 'wrap' }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              style={{
                background: subTab === tab.id ? 'rgba(0, 223, 129, 0.2)' : '#161d23',
                border: subTab === tab.id ? '1px solid #00df81' : '1px solid #2a3742',
                color: subTab === tab.id ? '#00df81' : '#94a3b8',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: subTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Render Active Sub-View */}
      {subTab === 'milp' && (
        <SixSeasonRecommendationView
          activeField={activeField}
          summary={summary}
          plan={plan}
          ml={ml}
          user={user}
          userFields={userFields}
          onNavigateTab={(t) => setSubTab(t)}
          onBack={() => setSubTab('milp')}
          onRunWorkflow={onRunWorkflow}
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
          onBack={() => setSubTab('milp')}
          onNavigateTab={(t) => setSubTab(t)}
          lang={lang}
        />
      )}

      {subTab === 'comparison' && (
        <ComparisonLabView
          activeField={activeField}
          comparisonLab={plan?.summary?.comparison_lab}
          request={request}
          formatNumber={formatNumber}
          onBack={() => setSubTab('milp')}
          onNavigateTab={(t) => setSubTab(t)}
          lang={lang}
        />
      )}

    </div>
  );
}

export default FarmPlanningView;

