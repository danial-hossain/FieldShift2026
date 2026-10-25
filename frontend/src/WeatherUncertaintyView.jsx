import React, { useState, useEffect, useCallback } from 'react';
import { ClimateStress3D } from './research3d/ClimateStress3D.jsx';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { request as defaultRequest } from './apiClient.js';

export function WeatherUncertaintyView({
  activeField,
  analysisResult,
  plan,
  summary,
  robustness,
  request: propRequest,
  formatNumber: propFormatNumber,
  onNavigateTab,
  onBack,
  lang = 'bn',
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;
  const resolvedAnalysis = analysisResult || plan;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uncertaintyData, setUncertaintyData] = useState(null);
  const [activeScenarioKey, setActiveScenarioKey] = useState('baseline');

  const fetchUncertaintyScenarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rawId = activeField?.id;
      const isNumericId = rawId != null && !isNaN(Number(rawId)) && String(rawId).trim() !== '';
      const payload = {
        field_id: isNumericId ? Number(rawId) : 'demo',
        latitude: activeField?.latitude != null ? Number(activeField.latitude) : 24.8500,
        longitude: activeField?.longitude != null ? Number(activeField.longitude) : 89.3700,
        field_state: {
          field_size_ha: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
          area_ha: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
          soil_ph: activeField?.soil_ph,
          organic_matter: activeField?.organic_matter,
          irrigation_capacity_mm: activeField?.irrigation_capacity_mm || 450,
        },
        baseline_plan: resolvedAnalysis?.summary?.strategies?.balanced || null,
      };

      const res = await request('/api/scenarios/weather-uncertainty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.status === 'ok') {
        setUncertaintyData(res);
      } else {
        throw new Error(res?.detail || 'Failed to compute weather uncertainty scenarios.');
      }
    } catch (err) {
      setError(err.message || 'Error running Weather Forecast Uncertainty evaluation.');
    } finally {
      setLoading(false);
    }
  }, [activeField, resolvedAnalysis, request]);

  useEffect(() => {
    fetchUncertaintyScenarios();
  }, [fetchUncertaintyScenarios]);

  const scenarios = uncertaintyData?.scenarios || {};
  const activeScen = scenarios[activeScenarioKey] || scenarios.baseline;

  const exportCsv = () => {
    if (!uncertaintyData) return;
    const rows = [
      ['Scenario', 'Temp Delta (°C)', 'Precip Delta (%)', 'Irrigation Quota (%)', 'Feasible', 'Total Profit (BDT)', 'Total Water (mm)', 'Notes'],
    ];
    Object.entries(scenarios).forEach(([key, s]) => {
      rows.push([
        s.name,
        s.temp_delta_c,
        s.precip_delta_pct,
        s.irrigation_pct,
        s.feasible ? 'YES' : 'NO',
        s.total_profit_bdt,
        s.total_water_mm,
        `"${s.constraint_notes || ''}"`,
      ]);
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fieldshift_weather_robustness_${activeField?.name || 'field'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="weather-uncertainty-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>🌦️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Weather Forecast Uncertainty &amp; Robust Planning
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P1 MULTI-SCENARIO ROBUSTNESS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              Single-point weather forecasts fail when anomalous climate waves strike. FieldShift evaluates 5 distinct meteorological 
              perturbations (baseline, drought, thermal wave, combined stress, tube-well quota cuts) to evaluate plan feasibility and 
              compute a verifiable <strong>Overall Robustness Score</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-outline-action"
              onClick={exportCsv}
              disabled={!uncertaintyData}
              style={{ fontSize: '12.5px', padding: '8px 14px' }}
            >
              📥 Export CSV
            </button>
            <button
              type="button"
              className="dashboard-primary-run-btn"
              onClick={fetchUncertaintyScenarios}
              disabled={loading}
              style={{
                background: loading ? '#475569' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              }}
            >
              {loading ? 'Evaluating Scenarios...' : '⚡ Re-run Stress Suite'}
            </button>
          </div>
        </div>

        {/* Robustness Metric Chips */}
        {uncertaintyData && (
          <div style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}>
            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Robustness Score</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#00df81', marginTop: '2px' }}>
                {uncertaintyData.robustness_analysis?.robustness_score_pct || 100}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Multi-scenario survival rate</span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Feasible Scenarios</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {uncertaintyData.robustness_analysis?.feasible_scenario_count || 5} / {uncertaintyData.robustness_analysis?.total_scenarios || 5}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Solvable without constraint breaches</span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Most Vulnerable Window</span>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                {uncertaintyData.robustness_analysis?.most_vulnerable_period || 'Rabi / Dry (Season 1)'}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Highest evapotranspiration deficit</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 10,
          color: '#fca5a5',
          marginBottom: 20,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchUncertaintyScenarios}
            style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', background: '#334155', color: '#fff', border: 'none', borderRadius: 6 }}
          >
            🔄 Retry Stress Suite
          </button>
        </div>
      )}

      {/* 5 Scenario Tabs */}
      {uncertaintyData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {Object.entries(scenarios).map(([key, s]) => {
              const isSelected = activeScenarioKey === key;
              return (
                <div
                  key={key}
                  onClick={() => setActiveScenarioKey(key)}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#131920',
                    border: isSelected ? '1.5px solid #38bdf8' : '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                      {s.name.split(' (')[0]}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: s.feasible ? 'rgba(0, 223, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: s.feasible ? '#00df81' : '#f87171',
                      fontWeight: 700,
                    }}>
                      {s.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    ΔT: {s.temp_delta_c > 0 ? `+${s.temp_delta_c}` : s.temp_delta_c}°C • Precip: {s.precip_delta_pct}%
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginTop: '6px' }}>
                    BDT {formatNumber(s.total_profit_bdt, 0)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3D Atmospheric Thermal Dome & Microclimate Visualization */}
          <div style={{ marginBottom: '22px' }}>
            <ClimateStress3D
              weatherScenario={activeScenarioKey}
              tempDeltaC={activeScen?.temp_delta_c ?? 0}
              baseTempC={28.5}
              et0Mm={Number((4.5 * (1 + (activeScen?.temp_delta_c || 0) * 0.05)).toFixed(1))}
              stressDays={activeScen?.temp_delta_c > 2 ? 24 : activeScen?.precip_delta_pct < 0 ? 30 : 12}
              rainfallMm={Math.max(0, Math.round(200 * (1 + (activeScen?.precip_delta_pct || 0) / 100)))}
              crop={String(Object.values(activeScen?.crops || {})[0] || 'rice').toLowerCase()}
              yieldTonHa={activeScen?.feasible ? 4.5 : 2.1}
              lang="en"
            />
          </div>

          {/* Active Scenario Detail Card */}
          {activeScen && (
            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  {activeScen.name} — Recommended Crop Sequence
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Water Demand: <strong style={{ color: '#38bdf8' }}>{formatNumber(activeScen.total_water_mm, 0)} mm</strong>
                </span>
              </div>

              {/* Season Sequence Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {Object.entries(activeScen.crops || {}).map(([period, crop], idx) => (
                  <div key={idx} style={{ background: '#0e1318', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      {period}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#00df81' }}>
                      {crop}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '12.5px', color: '#94a3b8', background: '#0e1318', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <strong style={{ color: '#f8fafc' }}>Agronomic Solver Notes:</strong> {activeScen.constraint_notes}
              </div>
            </div>
          )}

          {/* Scientific Transparency Alert */}
          <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>🛡️</span>
            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#f1f5f9' }}>Scientific Disclosure:</strong> {uncertaintyData.scientific_disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
