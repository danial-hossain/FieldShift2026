// frontend/src/FarmPlanningView.jsx
// Farm Planning Workspace for FieldShift 2026
// Sub-navigation: 6-Season Rotation Planner (MILP), Adaptive Replanning, Scenario Comparison Lab.

import React, { useState } from 'react';
import { SixSeasonRecommendationView } from './SixSeasonRecommendationView.jsx';
import { AdaptiveReplanningView } from './AdaptiveReplanningView.jsx';
import { ComparisonLabView } from './ComparisonLabView.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';
import { Card, Pill, Tabs } from './ui/index.js';

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
    { id: 'milp', label: lang === 'bn' ? '৬-মৌসুম ফসল পরিকল্পনা (MILP)' : '1. 6-Season Rotation Planner', icon: '🌾' },
    { id: 'replan', label: lang === 'bn' ? 'অভিযোজিত পুনঃপরিকল্পনা (Adaptive Replan)' : '2. Adaptive Next-Season Replan', icon: '🔄' },
    { id: 'comparison', label: lang === 'bn' ? 'তুলনামূলক ল্যাব (MILP vs RL vs Rule)' : '3. 3-Way Comparison Lab', icon: '🧪' },
  ];

  return (
    <div className="farm-planning-workspace" style={{ padding: '8px 0 32px 0', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Top Banner & Sub-Navigation */}
      <Card variant="glass" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>🌾📐</span>
              <Pill tone="leaf">PULP MILP OPTIMIZATION ENGINE</Pill>
              <Pill tone="water">
                {activeField?.name || (lang === 'bn' ? 'বগুড়া পরীক্ষামূলক খামার' : 'Bogura Demo Field')} ({formatNumber(activeField?.area_ha || 10.0, 1)} ha)
              </Pill>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'bn' ? 'খামার পরিকল্পনা ও বহু-মৌসুমী ফসল আবর্তন' : 'Multi-Season Farm Rotation Planning'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? '৩ বছর ও ৬ মৌসুমের গাণিতিক অপ্টিমাইজেশন (PuLP MILP), নাইট্রোজেন ফিক্সিং ডালশস্য নিয়ম, বোটানিক্যাল পরিবার পর্যায়ক্রম ও মধ্য-মৌসুমী অভিযোজিত পুনঃপরিকল্পনা।'
                : 'PuLP Mixed-Integer Linear Programming (MILP) solving multi-objective trade-offs across profit, water conservation, and soil health with dynamic in-season replanning.'}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <Tabs
            tabs={subTabs}
            activeTab={subTab}
            onChange={setSubTab}
          />
        </div>
      </Card>

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
          lang={lang}
          onRunWorkflow={onRunWorkflow}
        />
      )}

      {subTab === 'replan' && (
        <AdaptiveReplanningView
          activeField={activeField}
          summary={summary}
          plan={plan}
          ml={ml}
          user={user}
          lang={lang}
          onBack={() => setSubTab('milp')}
          onRunWorkflow={onRunWorkflow}
        />
      )}

      {subTab === 'comparison' && (
        <ComparisonLabView
          activeField={activeField}
          user={user}
          lang={lang}
          onBack={() => setSubTab('milp')}
        />
      )}

    </div>
  );
}

export default FarmPlanningView;
