import React, { useState, useEffect } from 'react';
import { formatNumber } from './main.jsx';
import { SensitivityAnalysis3D } from './research3d/SensitivityAnalysis3D.jsx';
import { request } from './apiClient.js';

export function SensitivityAnalysisView({ activeField, onNavigateTab }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sensitivityData, setSensitivityData] = useState(null);
  const [selectedParam, setSelectedParam] = useState('all');

  useEffect(() => {
    handleRunSensitivity();
  }, [activeField]);

  const handleRunSensitivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        field_id: activeField?.id || 'demo',
        field_size_ha: activeField?.area_ha || 2.0,
        irrigation_capacity_mm: activeField?.irrigation_capacity_mm || 500.0,
        soil_texture: activeField?.soil_texture || 'loam',
        soil_ph: activeField?.soil_ph || 6.5,
        organic_matter: activeField?.organic_matter || 2.0,
        perturbation_steps: [-20.0, -10.0, 10.0, 20.0],
      };

      const json = await request('/api/scenarios/sensitivity', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSensitivityData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSweeps = (sensitivityData?.sweeps || []).filter(s => {
    if (selectedParam === 'all') return true;
    return s.parameter === selectedParam;
  });

  return (
    <div className="sensitivity-analysis-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>📐</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Scientific Sensitivity &amp; Robustness Analysis
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted, #64748b)' }}>
            Repeatable counterfactual perturbation sweeps across crop yields, selling prices, production costs, and irrigation limits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunSensitivity}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>🔄</span> {loading ? 'Running Sweeps...' : 'Re-Run Sensitivity Sweeps'}
          </button>
        </div>
      </div>

      {/* Baseline Immutability & Scientific Disclaimer Card */}
      <div style={{
        background: 'var(--bg-card-subtle, #f8fafc)',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14
      }}>
        <span style={{ fontSize: 24 }}>🛡️</span>
        <div style={{ flex: 1, fontSize: 13, color: 'var(--text-muted, #475569)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-main, #0f172a)', display: 'block', marginBottom: 4 }}>
            Baseline Immutability &amp; Scientific Protocol:
          </strong>
          Counterfactual perturbations modify only candidate optimization parameters inside memory and <strong>never mutate the active field record or baseline database state</strong>.
          Ranges represent experimental assumptions to evaluate mathematical stability and elasticity, not probabilistic weather forecasts.
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          Solving multi-period MILP rotations across perturbation sweeps...
        </div>
      ) : error ? (
        <div style={{ padding: 20, color: '#b91c1c', background: '#fee2e2', borderRadius: 8 }}>{error}</div>
      ) : (
        <div>
          {/* 3D Parameter Sweep Response Workbench */}
          <div style={{ marginBottom: 24 }}>
            <SensitivityAnalysis3D activeField={activeField} lang="en" />
          </div>

          {/* Elasticity Ranking Cards */}
          {sensitivityData?.parameter_elasticity_ranking && (
            <div className="card" style={{ padding: 20, borderRadius: 12, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>
                📊 Parameter Sensitivity Elasticity Ranking
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {sensitivityData.parameter_elasticity_ranking.map((item, idx) => {
                  const isHigh = item.impact_rank === 'High';
                  const isMod = item.impact_rank === 'Moderate';
                  return (
                    <div
                      key={item.parameter}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: isHigh ? 'rgba(239, 68, 68, 0.08)' : isMod ? 'rgba(234, 179, 8, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                        border: isHigh ? '1px solid #fca5a5' : isMod ? '1px solid #fde047' : '1px solid #86efac',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>RANK #{idx + 1}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isHigh ? '#dc2626' : isMod ? '#d97706' : '#16a34a',
                          color: '#ffffff'
                        }}>
                          {item.impact_rank} Impact
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                        {item.parameter === 'market_price' ? 'Selling Prices' :
                         item.parameter === 'expected_yield' ? 'Crop Yields' :
                         item.parameter === 'production_cost' ? 'Production Costs' : 'Irrigation Capacity'}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                        {item.mean_elasticity}x
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Mean margin elasticity per 10% shift
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sweeps Filter Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Filter Variable:</span>
            {['all', 'market_price', 'expected_yield', 'production_cost', 'irrigation_capacity'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedParam(p)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: selectedParam === p ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  background: selectedParam === p ? '#0284c7' : '#ffffff',
                  color: selectedParam === p ? '#ffffff' : '#475569',
                  fontWeight: selectedParam === p ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {p === 'all' ? 'All Parameters' :
                 p === 'market_price' ? 'Selling Prices' :
                 p === 'expected_yield' ? 'Yields' :
                 p === 'production_cost' ? 'Costs' : 'Irrigation'}
              </button>
            ))}
          </div>

          {/* Detailed Sweeps Table */}
          <div className="card" style={{ padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>
              📈 Perturbation Sweeps &amp; Rotation Stability
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                    <th style={{ padding: '8px 8px' }}>Perturbed Parameter</th>
                    <th style={{ padding: '8px 8px' }}>Delta %</th>
                    <th style={{ padding: '8px 8px' }}>Solver Status</th>
                    <th style={{ padding: '8px 8px' }}>Estimated Margin</th>
                    <th style={{ padding: '8px 8px' }}>Margin Shift</th>
                    <th style={{ padding: '8px 8px' }}>Water Demand</th>
                    <th style={{ padding: '8px 8px' }}>Rotation Shift</th>
                    <th style={{ padding: '8px 8px' }}>Selected Crops</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSweeps.map((sw, i) => {
                    const isPos = sw.delta_margin_bdt >= 0;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                          {sw.label_en} ({sw.label_bn})
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: sw.perturbation_pct > 0 ? '#15803d' : '#b91c1c' }}>
                          {sw.perturbation_pct > 0 ? `+${sw.perturbation_pct}%` : `${sw.perturbation_pct}%`}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: sw.solver_status === 'Optimal' ? '#dcfce7' : '#fee2e2',
                            color: sw.solver_status === 'Optimal' ? '#166534' : '#991b1b',
                          }}>
                            {sw.solver_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                          {formatNumber(sw.estimated_margin_bdt, 0)} BDT
                        </td>
                        <td style={{ padding: '10px 8px', color: isPos ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                          {isPos ? `+${formatNumber(sw.delta_margin_bdt, 0)}` : formatNumber(sw.delta_margin_bdt, 0)} BDT ({sw.margin_pct_change}%)
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {sw.water_demand_mm} mm
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {sw.rotation_changed ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>⚠️ Shifted</span>
                          ) : (
                            <span style={{ color: '#16a34a' }}>✓ Stable</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#475569', fontSize: 11 }}>
                          {Object.values(sw.rotation || {}).join(' → ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SensitivityAnalysisView;
