import React, { useState, useEffect } from 'react';

export function CropFailureRecoveryView({
  activeField,
  analysisResult,
  request,
  formatNumber,
  onNavigateTab,
}) {
  const [failureType, setFailureType] = useState('drought_shock');
  const [failureSeason, setFailureSeason] = useState(0);
  const [severity, setSeverity] = useState('severe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simData, setSimData] = useState(null);

  const failureTypes = [
    { id: 'drought_shock', label: 'Drought Shock', icon: '🌵', desc: 'Severe precip deficit & low groundwater aquifer reserve' },
    { id: 'heat_stress', label: 'Heat Stress Wave', icon: '🌡️', desc: 'Sustained temperature spike during critical flowering phase' },
    { id: 'excess_rain', label: 'Waterlogging & Flood', icon: '🌊', desc: 'Early monsoon deluge causing root zone hypoxia' },
    { id: 'crop_loss', label: 'Crop Pest / Blight Loss', icon: '🥀', desc: 'Severe agronomic damage causing near total harvest failure' },
    { id: 'soil_shock', label: 'Soil Salinity / Degradation', icon: '🧂', desc: 'Sudden saline intrusion or heavy compaction shock' },
  ];

  const severities = [
    { id: 'moderate', label: 'Moderate (25%)', color: '#f59e0b', desc: '25% yield loss, moderate soil degradation' },
    { id: 'severe', label: 'Severe (50%)', color: '#ef4444', desc: '50% harvest loss, binding recovery constraints' },
    { id: 'catastrophic', label: 'Catastrophic (80%)', color: '#dc2626', desc: '80% complete crop loss, emergency restorative cycle' },
  ];

  const seasonOptions = [
    { idx: 0, label: 'Season 1 (Year 1 - Rabi / Dry)' },
    { idx: 1, label: 'Season 2 (Year 1 - Kharif-1 / Pre-Monsoon)' },
    { idx: 2, label: 'Season 3 (Year 1 - Kharif-2 / Monsoon)' },
    { idx: 3, label: 'Season 4 (Year 2 - Rabi / Dry)' },
    { idx: 4, label: 'Season 5 (Year 2 - Kharif-1 / Pre-Monsoon)' },
    { idx: 5, label: 'Season 6 (Year 2 - Kharif-2 / Monsoon)' },
  ];

  const runSimulation = async (type = failureType, season = failureSeason, sev = severity) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        field_id: activeField?.id || 'demo',
        failure_type: type,
        failure_season: Number(season),
        severity: sev,
        field_state: {
          latitude: activeField?.latitude != null ? Number(activeField.latitude) : 24.8500,
          longitude: activeField?.longitude != null ? Number(activeField.longitude) : 89.3700,
          field_size_ha: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
          area_ha: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
          soil_ph: activeField?.soil_ph,
          organic_matter: activeField?.organic_matter,
          irrigation_capacity_mm: activeField?.irrigation_capacity_mm || 450,
        },
        baseline_plan: analysisResult?.summary?.strategies?.balanced || null,
      };

      const res = await request('/api/scenarios/crop-failure-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.status === 'ok') {
        setSimData(res);
      } else {
        throw new Error(res?.detail || 'Failed to execute recovery simulation.');
      }
    } catch (err) {
      setError(err.message || 'Error running Crop Failure & Recovery Simulator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [activeField]);

  return (
    <div className="crop-failure-recovery-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Crop Failure &amp; Adaptive Recovery Simulator
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P0 RESILIENCE ENGINE
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '820px', lineHeight: 1.5 }}>
              Stress-test your farm rotation against simulated shock events (severe drought, unseasonal waterlogging, heat waves, or pest blights). 
              The MILP solver dynamically re-optimizes remaining seasons to mitigate financial losses and restore soil vitality.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-primary-run-btn"
            onClick={() => runSimulation()}
            disabled={loading}
            style={{
              background: loading ? '#475569' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
            }}
          >
            {loading ? 'Simulating Shocks...' : '⚡ Run Failure Shock & Recovery'}
          </button>
        </div>

        {/* Interactive Controls Bar */}
        <div style={{
          marginTop: '20px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {/* Shock Type */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Shock Event Type:
            </label>
            <select
              className="dashboard-field-select"
              value={failureType}
              onChange={(e) => {
                setFailureType(e.target.value);
                runSimulation(e.target.value, failureSeason, severity);
              }}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
            >
              {failureTypes.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          {/* Season of Shock */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Shock Inception Season:
            </label>
            <select
              className="dashboard-field-select"
              value={failureSeason}
              onChange={(e) => {
                setFailureSeason(Number(e.target.value));
                runSimulation(failureType, Number(e.target.value), severity);
              }}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
            >
              {seasonOptions.map(s => (
                <option key={s.idx} value={s.idx}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Event Severity:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {severities.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSeverity(s.id);
                    runSimulation(failureType, failureSeason, s.id);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: severity === s.id ? `1.5px solid ${s.color}` : '1px solid #334155',
                    background: severity === s.id ? `${s.color}22` : '#0e1318',
                    color: severity === s.id ? s.color : '#94a3b8',
                  }}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#451a1a', border: '1px solid #7f1d1d', borderRadius: '10px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Simulation Error:</strong> {error}
        </div>
      )}

      {/* Results View */}
      {simData && (
        <div>
          {/* Key Metric Scorecard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre-Shock Profit</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#00df81', marginTop: '4px' }}>
                BDT {formatNumber(simData.financial_summary?.pre_shock_net_profit_bdt, 0)}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Original 6-season baseline</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Immediate Shock Loss</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                -BDT {formatNumber(simData.financial_summary?.shock_loss_bdt, 0)}
              </div>
              <span style={{ fontSize: '11px', color: '#f87171' }}>Damage in {simData.failure_event?.season_label?.split(' ')[0]} {simData.failure_event?.season_label?.split(' ')[1]}</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovered Total Profit</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                BDT {formatNumber(simData.financial_summary?.recovered_plan_profit_bdt, 0)}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Post-recovery adaptive rotation</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovery Efficiency</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                {formatNumber(simData.financial_summary?.recovery_efficiency_pct, 1)}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Capital preservation ratio</span>
            </div>
          </div>

          {/* Rotation Comparison: Baseline vs Shock Impact vs Adaptive Recovery */}
          <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔄</span> Multi-Season Rotation Response Breakdown
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Season Horizon</th>
                    <th style={{ padding: '10px 12px' }}>Baseline Plan</th>
                    <th style={{ padding: '10px 12px' }}>Shock Scenario Status</th>
                    <th style={{ padding: '10px 12px' }}>Adaptive Recovery Crop</th>
                    <th style={{ padding: '10px 12px' }}>Adaptive Reasoning &amp; Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {simData.pre_shock_plan?.map((pre, idx) => {
                    const isShockSeason = idx === simData.failure_event?.failure_season;
                    const isPast = idx < simData.failure_event?.failure_season;
                    const recov = simData.recovery_plan?.find(r => r.season_idx === idx);

                    let statusBadge = null;
                    if (isPast) {
                      statusBadge = <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', color: '#94a3b8', fontSize: '11px' }}>Pre-Event Normal</span>;
                    } else if (isShockSeason) {
                      statusBadge = <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '11px', fontWeight: 700 }}>⚠️ Shock Incurred (-{simData.failure_event?.yield_loss_pct}%)</span>;
                    } else {
                      statusBadge = <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '11px' }}>Adaptive Recovery</span>;
                    }

                    return (
                      <tr key={idx} style={{
                        borderBottom: '1px solid #1e293b',
                        background: isShockSeason ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                      }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                          {pre.season_name}
                        </td>
                        <td style={{ padding: '12px', color: '#f1f5f9' }}>
                          <span style={{ fontWeight: 700 }}>{pre.crop}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>BDT {formatNumber(pre.profit_bdt, 0)} • {formatNumber(pre.water_mm, 0)} mm</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {statusBadge}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {isPast ? (
                            <span style={{ color: '#64748b' }}>{pre.crop} (As planted)</span>
                          ) : isShockSeason ? (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>
                              {pre.crop} ({100 - simData.failure_event?.yield_loss_pct}% salvage)
                            </span>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 700, color: recov?.is_adjusted ? '#00df81' : '#f1f5f9' }}>
                                {recov?.crop || pre.crop}
                              </span>
                              {recov?.is_adjusted && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(0, 223, 129, 0.15)', color: '#00df81', padding: '1px 6px', borderRadius: '4px' }}>
                                  Adjusted
                                </span>
                              )}
                              <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                                BDT {formatNumber(recov?.profit_bdt, 0)} • {formatNumber(recov?.water_mm, 0)} mm
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#cbd5e1', maxWidth: '300px' }}>
                          {isPast ? (
                            'Normal historical baseline execution.'
                          ) : isShockSeason ? (
                            simData.shock_season_impact?.notes || 'Direct yield and biomass shock.'
                          ) : (
                            recov?.reason || 'Restorative sequence to balance moisture deficit and soil nutrients.'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Binding Constraints & Scientific Safeguards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Binding Constraints */}
            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span> Binding Constraints Limiting Recovery
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
                {simData.binding_constraints?.map((c, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>
                    <strong style={{ color: '#e2e8f0' }}>{c.name}:</strong> {c.detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* Scientific Transparency & Disclaimer */}
            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span> Scientific Safeguards &amp; Uncertainty Note
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                {simData.scientific_disclaimer}
              </p>
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(0, 223, 129, 0.06)', border: '1px solid rgba(0, 223, 129, 0.2)', borderRadius: '8px', fontSize: '11.5px', color: '#00df81' }}>
                ✓ Synthetic scenario perturbations are calibrated to regional BARI research benchmarks and are explicitly disclosed as exploratory decision support.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
