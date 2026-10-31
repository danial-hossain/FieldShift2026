import React, { useState, useEffect, useMemo } from 'react';
import { SixSeasonTrajectory3D } from './research3d/SixSeasonTrajectory3D.jsx';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { request as defaultRequest } from './apiClient.js';

export function AdaptiveReplanningView({
  activeField,
  analysisResult,
  request: propRequest,
  formatNumber: propFormatNumber,
  onNavigateTab,
  onBack,
  lang = 'bn',
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;

  const [completedSeasonsCount, setCompletedSeasonsCount] = useState(1);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [historyItems, setHistoryItems] = useState([
    { season_idx: 0, season_name: 'Year 1 - Rabi / Dry', crop_planted: 'Potato', yield_kg_ha: 22000, water_applied_mm: 480, soil_impact: 'high_depletion' },
    { season_idx: 1, season_name: 'Year 1 - Kharif-1', crop_planted: 'Mungbean', yield_kg_ha: 1400, water_applied_mm: 320, soil_impact: 'restorative' },
  ]);

  const [updatedSoilPh, setUpdatedSoilPh] = useState(activeField?.soil_ph ? String(activeField.soil_ph) : '6.2');
  const [updatedOm, setUpdatedOm] = useState(activeField?.organic_matter ? String(activeField.organic_matter) : '1.85');
  const [updatedIrrig, setUpdatedIrrig] = useState(activeField?.irrigation_capacity_mm ? String(activeField.irrigation_capacity_mm) : '380');
  const [weatherBias, setWeatherBias] = useState('drier');
  const [priority, setPriority] = useState('balanced');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replanData, setReplanData] = useState(null);

  const cropChoices = [
    'Mungbean', 'Lentil', 'Maize', 'Rice', 'Wheat', 'Mustard', 'Potato',
    'Chickpea', 'Soybean', 'Sorghum', 'Sesame', 'Groundnut', 'Sunflower', 'Tomato', 'Jute'
  ];

  const handleUpdateHistoryCrop = (index, crop) => {
    const updated = [...historyItems];
    updated[index].crop = crop;
    updated[index].crop_planted = crop;
    setHistoryItems(updated);
  };

  const executeReplan = async () => {
    setLoading(true);
    setError('');
    try {
      const pastHistory = historyItems.slice(0, completedSeasonsCount).map(h => ({
        ...h,
        crop: h.crop || h.crop_planted,
        crop_planted: h.crop_planted || h.crop,
      }));
      const payload = {
        field_id: activeField?.id || 'demo',
        latitude: activeField?.latitude != null ? Number(activeField.latitude) : undefined,
        longitude: activeField?.longitude != null ? Number(activeField.longitude) : undefined,
        district: activeField?.district || undefined,
        area_ha: activeField?.area_ha != null ? Number(activeField.area_ha) : undefined,
        seasonally_flooded: activeField?.seasonally_flooded,
        completed_seasons_history: pastHistory,
        updated_conditions: {
          soil_ph: updatedSoilPh ? parseFloat(updatedSoilPh) : null,
          organic_matter: updatedOm ? parseFloat(updatedOm) : null,
          irrigation_capacity_mm: updatedIrrig ? parseFloat(updatedIrrig) : 400,
          weather_forecast_bias: weatherBias,
        },
        remaining_seasons: 6 - completedSeasonsCount,
        priority,
      };

      const res = await request('/api/workflow/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.status === 'ok') {
        setReplanData(res);
      } else {
        throw new Error(res?.detail || 'Adaptive replanning failed.');
      }
    } catch (err) {
      setError(err.message || 'Error running Adaptive Replan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeReplan();
  }, [activeField, completedSeasonsCount]);

  const replanTrajectoryRecs = useMemo(() => {
    if (!replanData) return [];
    const past = (replanData.historical_context || []).map(p => ({
      period: p.season_name,
      crop: p.crop_planted,
      family: p.crop_planted === 'Mungbean' || p.crop_planted === 'Lentil' ? 'Fabaceae' : 'Solanaceae',
      isLegume: p.crop_planted === 'Mungbean' || p.crop_planted === 'Lentil' || p.crop_planted === 'Chickpea',
      profitBdt: 75000,
      yieldTonHa: (p.yield_kg_ha || 1500) / 1000,
      waterScore: 4.5,
      soilScore: 5.0,
      status: 'Harvested (Historical)',
    }));
    const future = (replanData.replanned_schedule || []).map(f => ({
      period: f.season_name,
      crop: f.crop_planted || f.recommended_crop,
      family: f.family || 'Poaceae',
      isLegume: Boolean(f.is_legume),
      profitBdt: f.projected_profit_bdt || 92000,
      yieldTonHa: f.projected_yield_ton_ha || 3.5,
      waterScore: 5.2,
      soilScore: 5.4,
      status: 'Adaptive Recommendation',
    }));
    return [...past, ...future];
  }, [replanData]);

  return (
    <div className="adaptive-replanning-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(0, 223, 129, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>🔄</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Adaptive Next-Season Replanning
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(0, 223, 129, 0.15)',
                color: '#00df81',
                border: '1px solid rgba(0, 223, 129, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P0 CLOSED-LOOP REPLANNER
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              Farming is dynamic. Rather than replaying a static 2-year calendar, this engine incorporates the 
              <em>actual crops you harvested</em> and <em>newly measured soil/irrigation tests</em>, then uses MILP branch-and-bound 
              to regenerate optimal future seasons with explicit explanations of why recommendations changed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {onBack && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onBack}
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13 }}
              >
                ← {lang === 'bn' ? 'পরিকল্পনায় ফিরুন' : 'Back to Planner'}
              </button>
            )}
            <button
              type="button"
              className="dashboard-primary-run-btn"
              onClick={executeReplan}
              disabled={loading}
            >
              {loading ? (lang === 'bn' ? 'পুনঃপরিকল্পনা চলছে...' : 'Re-optimizing Plan...') : (lang === 'bn' ? '🔄 পরবর্তী মৌসুম পুনঃপরিকল্পনা চালান' : '🔄 Run Next-Season Replan')}
            </button>
          </div>
        </div>

        {/* Dynamic Inputs: Past State & Updated Tests */}
        <div style={{
          marginTop: '20px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Seasons Completed So Far:
            </label>
            <select
              className="dashboard-field-select"
              value={completedSeasonsCount}
              onChange={(e) => setCompletedSeasonsCount(Number(e.target.value))}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
            >
              <option value={1}>1 Season Completed (Replan remaining 5)</option>
              <option value={2}>2 Seasons Completed (Replan remaining 4)</option>
              <option value={3}>3 Seasons Completed (Replan remaining 3)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Season 1 Actually Planted:
            </label>
            <select
              className="dashboard-field-select"
              value={historyItems[0].crop_planted}
              onChange={(e) => handleUpdateHistoryCrop(0, e.target.value)}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
            >
              {cropChoices.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Updated Soil pH Test:
            </label>
            <input
              type="number"
              step="0.1"
              className="input-box"
              value={updatedSoilPh}
              onChange={(e) => setUpdatedSoilPh(e.target.value)}
              placeholder="e.g. 6.2"
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px 10px', borderRadius: '8px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Updated Organic Matter (%):
            </label>
            <input
              type="number"
              step="0.05"
              className="input-box"
              value={updatedOm}
              onChange={(e) => setUpdatedOm(e.target.value)}
              placeholder="e.g. 1.85"
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px 10px', borderRadius: '8px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Available Irrigation (mm):
            </label>
            <input
              type="number"
              className="input-box"
              value={updatedIrrig}
              onChange={(e) => setUpdatedIrrig(e.target.value)}
              placeholder="e.g. 380"
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px 10px', borderRadius: '8px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Upcoming Weather Trend:
            </label>
            <select
              className="dashboard-field-select"
              value={weatherBias}
              onChange={(e) => setWeatherBias(e.target.value)}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
            >
              <option value="normal">Normal Seasonal Climate</option>
              <option value="drier">Drier Trend (-20% Rain)</option>
              <option value="hotter">Warmer Trend (+2.0°C)</option>
              <option value="hot_and_dry">Hot &amp; Dry Stress</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#451a1a', border: '1px solid #7f1d1d', borderRadius: '10px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Replanning Error:</strong> {error}
        </div>
      )}

      {/* Replanning Results */}
      {replanData && (
        <div>
          {/* Summary Scorecard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>History Anchored</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {replanData.completed_seasons_count} Season{replanData.completed_seasons_count > 1 ? 's' : ''} Past
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Incorporated as fixed state</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Horizon</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#00df81', marginTop: '4px' }}>
                {replanData.remaining_seasons_count} Seasons Re-optimized
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Solving from updated soil test</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Replanned Profit</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                BDT {formatNumber(replanData.financial_projection?.total_replanned_profit_bdt, 0)}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Across remaining periods</span>
            </div>

            <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soil Regeneration Rate</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
                {replanData.financial_projection?.soil_health_recovery_rate || '+0.45'}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Proxy recovery score delta</span>
            </div>
          </div>

          {/* 3D Six-Season Replanned Trajectory */}
          {replanTrajectoryRecs.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span> 3D Adaptive 6-Season Trajectory (Historical Harvested vs Re-optimized Seasons)
              </h4>
              <SixSeasonTrajectory3D
                recommendations={replanTrajectoryRecs}
                selectedSeasonIndex={selectedSeasonIdx}
                onSelectSeason={idx => setSelectedSeasonIdx(idx)}
                strategy={priority}
                lang="bn"
              />
            </div>
          )}

          {/* Schedule Table: Past vs Replanned with Why Recommendations Changed */}
          <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Adaptive Rotation Schedule &amp; Causal Rationales
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Season Horizon</th>
                    <th style={{ padding: '10px 12px' }}>Original Plan</th>
                    <th style={{ padding: '10px 12px' }}>Adaptive Recommendation</th>
                    <th style={{ padding: '10px 12px' }}>Projected Metrics</th>
                    <th style={{ padding: '10px 12px' }}>Why Recommendation Changed</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Past Seasons */}
                  {replanData.historical_context?.map((past, idx) => (
                    <tr key={`past-${idx}`} style={{ borderBottom: '1px solid #1e293b', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#94a3b8' }}>
                        {past.season_name}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        Baseline Planned
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', color: '#e2e8f0', fontWeight: 700, fontSize: '12px' }}>
                          ✓ {past.crop_planted} (Harvested)
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontSize: '11.5px' }}>
                        {formatNumber(past.yield_kg_ha, 0)} kg/ha • {past.water_applied_mm} mm
                      </td>
                      <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>
                        Historical field state committed to memory.
                      </td>
                    </tr>
                  ))}

                  {/* Future Replanned Seasons */}
                  {replanData.replanned_schedule?.map((item, idx) => (
                    <tr key={`fut-${idx}`} style={{
                      borderBottom: '1px solid #1e293b',
                      background: item.is_changed ? 'rgba(0, 223, 129, 0.04)' : 'transparent',
                    }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                        {item.season_name}
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>
                        {item.original_baseline_crop}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: item.is_changed ? '#00df81' : '#f8fafc',
                          fontSize: '13.5px',
                        }}>
                          {item.recommended_crop}
                        </span>
                        {item.is_changed ? (
                          <span style={{ marginLeft: '8px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(0, 223, 129, 0.15)', color: '#00df81', fontSize: '10.5px', fontWeight: 700 }}>
                            REVISED
                          </span>
                        ) : (
                          <span style={{ marginLeft: '8px', padding: '2px 7px', borderRadius: '4px', background: '#1e293b', color: '#64748b', fontSize: '10.5px' }}>
                            Retained
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1', fontSize: '11.5px' }}>
                        BDT {formatNumber(item.projected_profit_bdt, 0)} • {formatNumber(item.projected_water_mm, 0)} mm
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: item.is_changed ? '#f1f5f9' : '#94a3b8', maxWidth: '320px', lineHeight: 1.4 }}>
                        {item.why_changed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>🛡️</span>
            <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#f1f5f9' }}>Scientific Disclosure:</strong> {replanData.scientific_disclaimer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
