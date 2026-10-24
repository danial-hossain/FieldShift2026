import React, { useState, useEffect } from 'react';
import { formatNumber } from './main.jsx';

export function SyntheticDataLabView({ activeField, onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'provenance'
  
  // Generator Config
  const [seed, setSeed] = useState(42);
  const [numScenarios, setNumScenarios] = useState(8);
  const [areaMin, setAreaMin] = useState(0.5);
  const [areaMax, setAreaMax] = useState(12.0);
  const [phMin, setPhMin] = useState(5.2);
  const [phMax, setPhMax] = useState(7.6);
  const [omMin, setOmMin] = useState(1.0);
  const [omMax, setOmMax] = useState(3.0);
  const [irrigMin, setIrrigMin] = useState(100.0);
  const [irrigMax, setIrrigMax] = useState(800.0);
  const [profile, setProfile] = useState('standard');
  const [includeStress, setIncludeStress] = useState(true);

  const [generatedData, setGeneratedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Provenance summary state
  const [provenanceSummary, setProvenanceSummary] = useState(null);
  const [registryRecords, setRegistryRecords] = useState([]);
  const [provLoading, setProvLoading] = useState(false);

  // Initial generation
  useEffect(() => {
    handleGenerate();
    loadProvenance();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/synthetic-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          num_scenarios: numScenarios,
          area_min_ha: areaMin,
          area_max_ha: areaMax,
          ph_min: phMin,
          ph_max: phMax,
          om_min: omMin,
          om_max: omMax,
          irrigation_min_mm: irrigMin,
          irrigation_max_mm: irrigMax,
          assumption_profile: profile,
          include_stress_scenarios: includeStress,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to generate scenarios`);
      const data = await res.json();
      setGeneratedData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProvenance = async () => {
    setProvLoading(true);
    try {
      const [sumRes, regRes] = await Promise.all([
        fetch('/api/provenance/summary'),
        fetch('/api/provenance/registry'),
      ]);
      if (sumRes.ok) setProvenanceSummary(await sumRes.json());
      if (regRes.ok) {
        const regJson = await regRes.json();
        setRegistryRecords(regJson.parameters || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProvLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/synthetic-data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          num_scenarios: numScenarios,
          area_min_ha: areaMin,
          area_max_ha: areaMax,
          assumption_profile: profile,
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fieldshift_synthetic_scenarios_seed${seed}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="synthetic-lab-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🧪</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Synthetic Data Lab &amp; Provenance Registry
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted, #64748b)' }}>
            Reproducible counterfactual farm generation, consistency constraint validation, and parameter provenance tracking.
          </p>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-subtle, #f1f5f9)', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: activeTab === 'generator' ? 700 : 500,
              background: activeTab === 'generator' ? '#ffffff' : 'transparent',
              color: activeTab === 'generator' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              boxShadow: activeTab === 'generator' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🔬 Scenario Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('provenance')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: activeTab === 'provenance' ? 700 : 500,
              background: activeTab === 'provenance' ? '#ffffff' : 'transparent',
              color: activeTab === 'provenance' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              boxShadow: activeTab === 'provenance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🛡️ Provenance &amp; Reliability
          </button>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div style={{
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.4 }}>
          <strong>Scientific Validity Boundary:</strong> Synthetic holdout scenarios are generated using documented physical consistency constraints and fixed seeds to test algorithm robustness.
          <em> They DO NOT represent measured real-world farm outcomes and cannot be used to prove agronomic accuracy.</em>
        </div>
      </div>

      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          
          {/* Left Controls Panel */}
          <div className="card" style={{ padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              ⚙️ Generator Parameters
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  Random Seed (Reproducibility)
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>Same seed produces identical scenarios</span>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  Scenario Count ({numScenarios})
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={numScenarios}
                  onChange={e => setNumScenarios(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  Area Bounds (ha)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.5"
                    value={areaMin}
                    onChange={e => setAreaMin(Number(e.target.value))}
                    style={{ width: '50%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={areaMax}
                    onChange={e => setAreaMax(Number(e.target.value))}
                    style={{ width: '50%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  Soil pH Range
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    value={phMin}
                    onChange={e => setPhMin(Number(e.target.value))}
                    style={{ width: '50%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={phMax}
                    onChange={e => setPhMax(Number(e.target.value))}
                    style={{ width: '50%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  Assumption Profile
                </label>
                <select
                  value={profile}
                  onChange={e => setProfile(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="standard">Standard Baseline (1.0x)</option>
                  <option value="optimistic">Optimistic (+15% yield, +10% price)</option>
                  <option value="stressed">Stressed (-20% yield, +20% cost)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="includeStress"
                  checked={includeStress}
                  onChange={e => setIncludeStress(e.target.checked)}
                />
                <label htmlFor="includeStress" style={{ fontSize: 12, cursor: 'pointer' }}>
                  Include Drought, Heat &amp; Irrigation shocks
                </label>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading}
                style={{ marginTop: 10, padding: '9px 16px', fontWeight: 600 }}
              >
                {loading ? 'Generating...' : '🔄 Generate Scenarios'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleExportCSV}
                style={{ padding: '8px 16px' }}
              >
                📥 Export Scenarios (CSV)
              </button>
            </div>
          </div>

          {/* Right Scenarios Table */}
          <div className="card" style={{ padding: 20, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                📋 Generated Farm Scenarios (Seed: {generatedData?.metadata?.seed || seed})
              </h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total: {generatedData?.scenarios?.length || 0} scenarios
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Generating reproducible farm scenarios...</div>
            ) : error ? (
              <div style={{ padding: 20, color: '#b91c1c', background: '#fee2e2', borderRadius: 8 }}>{error}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                      <th style={{ padding: '8px 6px' }}>Scenario ID</th>
                      <th style={{ padding: '8px 6px' }}>Type</th>
                      <th style={{ padding: '8px 6px' }}>Region</th>
                      <th style={{ padding: '8px 6px' }}>Area</th>
                      <th style={{ padding: '8px 6px' }}>Soil (pH/OM)</th>
                      <th style={{ padding: '8px 6px' }}>Irrig (mm)</th>
                      <th style={{ padding: '8px 6px' }}>Rain (mm)</th>
                      <th style={{ padding: '8px 6px' }}>Temp</th>
                      <th style={{ padding: '8px 6px' }}>Multipliers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedData?.scenarios?.map((sc) => {
                      const isStress = sc.scenario_type !== 'baseline';
                      return (
                        <tr key={sc.scenario_id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                          <td style={{ padding: '9px 6px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {sc.scenario_id}
                          </td>
                          <td style={{ padding: '9px 6px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: sc.scenario_type === 'drought' ? '#fed7aa' : sc.scenario_type === 'heat' ? '#fecaca' : sc.scenario_type === 'combined_stress' ? '#f3e8ff' : '#dcfce7',
                              color: sc.scenario_type === 'drought' ? '#9a3412' : sc.scenario_type === 'heat' ? '#991b1b' : sc.scenario_type === 'combined_stress' ? '#6b21a8' : '#166534',
                            }}>
                              {sc.scenario_type.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '9px 6px' }}>{sc.region.split('(')[0]}</td>
                          <td style={{ padding: '9px 6px' }}>{sc.area_ha} ha</td>
                          <td style={{ padding: '9px 6px' }}>
                            {sc.soil_texture} (pH {sc.soil_ph}, {sc.organic_matter_pct}%)
                          </td>
                          <td style={{ padding: '9px 6px' }}>{sc.irrigation_capacity_mm}</td>
                          <td style={{ padding: '9px 6px' }}>{sc.rainfall_seasonal_mm}</td>
                          <td style={{ padding: '9px 6px' }}>{sc.avg_temperature_c}°C</td>
                          <td style={{ padding: '9px 6px', fontSize: 11 }}>
                            Y:{sc.crop_yield_multiplier} P:{sc.crop_price_multiplier} C:{sc.crop_cost_multiplier}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'provenance' && (
        <div>
          {/* Top Reliability Metric Card */}
          {provenanceSummary && (
            <div className="card" style={{ padding: 24, borderRadius: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    🛡️ System Parameter Provenance &amp; Reliability Index
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    Documented mathematical formula assessing evidence tiers across weather, agronomy, and economics.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>
                    {provenanceSummary.reliability_score}%
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                    RELIABILITY SCORE
                  </div>
                </div>
              </div>

              {/* Progress Bar of Breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                  {provenanceSummary.provenance_breakdown?.map(b => (
                    <div
                      key={b.key}
                      style={{
                        width: `${b.percentage}%`,
                        background: b.badge_color,
                        title: `${b.name}: ${b.count} (${b.percentage}%)`
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12 }}>
                  {provenanceSummary.provenance_breakdown?.map(b => (
                    <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.badge_color }} />
                      <strong>{b.name}:</strong> {b.count} ({b.percentage}%)
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-subtle, #f8fafc)', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                <div><strong>Documented Formula:</strong> <code>{provenanceSummary.reliability_formula}</code></div>
                <div style={{ marginTop: 4 }}><strong>Scientific Scope:</strong> {provenanceSummary.scientific_disclaimer}</div>
              </div>
            </div>
          )}

          {/* Full Registry Table */}
          <div className="card" style={{ padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              📜 System Parameter Registry ({registryRecords.length} variables)
            </h3>

            <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                    <th style={{ padding: '8px 6px' }}>Parameter</th>
                    <th style={{ padding: '8px 6px' }}>Value &amp; Unit</th>
                    <th style={{ padding: '8px 6px' }}>Classification</th>
                    <th style={{ padding: '8px 6px' }}>Source Organization</th>
                    <th style={{ padding: '8px 6px' }}>Document / Link</th>
                    <th style={{ padding: '8px 6px' }}>Uncertainty / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {registryRecords.map(r => (
                    <tr key={r.parameter_name} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                      <td style={{ padding: '9px 6px', fontWeight: 600 }}>
                        {r.parameter_name}
                      </td>
                      <td style={{ padding: '9px 6px' }}>
                        {typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value)} {r.unit}
                      </td>
                      <td style={{ padding: '9px 6px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: r.badge_info?.badge_color || '#64748b',
                          color: '#ffffff'
                        }}>
                          {r.classification}
                        </span>
                      </td>
                      <td style={{ padding: '9px 6px' }}>{r.source_organization}</td>
                      <td style={{ padding: '9px 6px' }}>
                        {r.source_url ? (
                          <a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7' }}>
                            {r.source_document} ↗
                          </a>
                        ) : (
                          r.source_document
                        )}
                      </td>
                      <td style={{ padding: '9px 6px', color: '#64748b', fontSize: 11 }}>
                        {r.uncertainty || r.assumptions || 'Standard benchmark'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyntheticDataLabView;
