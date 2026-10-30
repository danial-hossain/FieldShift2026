// frontend/src/ComparisonLabView.jsx
// 3-Way Optimization Decision Comparison Lab: MILP vs RL vs Rule-Based Baseline
// Evaluates mathematical optimality, adaptive sequential MDP policy, and regional heuristic rules.
// Fixes: Strict prop contract, deterministic response validation, removal of fabricated numbers,
// explicit violation states, resilient winner logic, and transparent field input handling.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comparison3Way3D } from './research3d/Comparison3Way3D.jsx';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { request as defaultRequest } from './apiClient.js';
import {
  validateComparisonResponse,
  formatViolations,
  getCropForSeason,
  validateFieldInputs,
  determineComparisonWinner
} from './comparisonLabEngine.js';

export {
  validateComparisonResponse,
  formatViolations,
  getCropForSeason,
  validateFieldInputs,
  determineComparisonWinner
};

export function ComparisonLabView({
  activeField,
  comparisonLab,
  analysisResult, // backwards compatibility alias for caller fallback
  request: propRequest,
  formatNumber: propFormatNumber,
  onNavigateTab,
  onBack,
  lang = 'bn',
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;

  const [priority, setPriority] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);
  const [labData, setLabData] = useState(null);
  const [show3D, setShow3D] = useState(true);

  // Stable detection of cached comparison data
  const cachedData = useMemo(() => {
    const candidate = comparisonLab || analysisResult?.summary?.comparison_lab;
    if (candidate) {
      const v = validateComparisonResponse(candidate);
      if (v.isValid) return candidate;
    }
    return null;
  }, [comparisonLab, analysisResult]);

  // Track the last evaluated (fieldId, priority) pair to prevent infinite loops
  const lastFetchKeyRef = useRef(null);

  const runLabComparison = async (selectedPriority = priority) => {
    // Fix 7: Validate field inputs. Show what is missing instead of fabricating field data.
    const fieldValidation = validateFieldInputs(activeField);
    if (!fieldValidation.isValid) {
      setError(`Cannot evaluate comparison: Field "${activeField?.name || 'Selected Parcel'}" is missing required inputs: ${fieldValidation.missingInputs.join(', ')}. Please update parcel coordinates and area in My Farm or switch to Demo mode.`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // UI 5.2: 30-second client-side timeout to cancel stuck evaluation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const isDemo = fieldValidation.isDemo;
      const payload = {
        field_id: isDemo ? 'demo' : String(activeField.id),
        latitude: isDemo ? 24.8500 : Number(activeField.latitude),
        longitude: isDemo ? 89.3700 : Number(activeField.longitude),
        area_ha: isDemo ? 10.0 : Number(activeField.area_ha),
        field_size_ha: isDemo ? 10.0 : Number(activeField.area_ha),
        priority: selectedPriority,
      };

      if (activeField?.soil_ph != null && Number.isFinite(Number(activeField.soil_ph))) {
        payload.soil_ph = Number(activeField.soil_ph);
      }
      if (activeField?.organic_matter != null && Number.isFinite(Number(activeField.organic_matter))) {
        payload.organic_matter = Number(activeField.organic_matter);
      }
      if (activeField?.irrigation_capacity_mm != null && Number.isFinite(Number(activeField.irrigation_capacity_mm))) {
        payload.irrigation_capacity_mm = Number(activeField.irrigation_capacity_mm);
      } else if (isDemo) {
        payload.irrigation_capacity_mm = 450;
      }

      const res = await request('/api/lab/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const validation = validateComparisonResponse(res);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Comparison response failed validation.');
      }

      setLabData(res);
      setIsStale(false);
      setError('');
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError'
        ? 'Request timed out after 30 seconds: /api/lab/compare did not respond in time.'
        : (err.message || 'Error communicating with Comparison Lab endpoint.');
      setError(msg);
      if (labData) {
        setIsStale(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Synchronize on mount or when field or priority changes
  useEffect(() => {
    const currentKey = `${activeField?.id || 'demo'}_${priority}`;
    if (cachedData && (cachedData.priority === priority || !cachedData.priority)) {
      setLabData(cachedData);
      setIsStale(false);
      setError('');
      lastFetchKeyRef.current = currentKey;
    } else if (lastFetchKeyRef.current !== currentKey) {
      lastFetchKeyRef.current = currentKey;
      runLabComparison(priority);
    }
  }, [activeField?.id, priority, cachedData]);

  const handlePriorityChange = (newP) => {
    setPriority(newP);
    runLabComparison(newP);
  };

  const handleExportCSV = () => {
    if (!labData?.export_csv) return;
    const blob = new Blob([labData.export_csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FieldShift_Comparison_Lab_${activeField?.name || 'Field'}_${priority}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!labData) return;
    const blob = new Blob([JSON.stringify(labData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FieldShift_Comparison_Lab_${activeField?.name || 'Field'}_${priority}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract validated methods
  const methods = labData?.methods || [];
  const milpMethod = methods.find(m => m.id === 'milp') || null;
  const rlMethod = methods.find(m => m.id === 'rl') || null;
  const ruleMethod = methods.find(m => m.id === 'rule_based') || null;
  const tradeOffs = labData?.trade_off_analysis || {};
  const seasons = Array.isArray(labData?.seasons) && labData.seasons.length > 0 ? labData.seasons : null;

  // Compute violation objects
  const milpViolationInfo = formatViolations(milpMethod?.constraint_violations, false);
  const rlViolationInfo = formatViolations(rlMethod?.constraint_violations, true);
  const ruleViolationInfo = formatViolations(ruleMethod?.constraint_violations, true);

  // Compute validated trade-off winners (Fix 6: No winner when data is incomplete)
  const profitWinner = determineComparisonWinner(tradeOffs, 'highest_profit');
  const waterWinner = determineComparisonWinner(tradeOffs, 'most_water_efficient');
  const soilWinner = determineComparisonWinner(tradeOffs, 'best_soil_stewardship');

  const isDemoField = !activeField || activeField.id === 'demo' || activeField.is_demo || (typeof activeField.name === 'string' && activeField.name.toLowerCase().includes('demo'));

  return (
    <div className="comparison-lab-container" style={{ padding: '4px 0 32px' }}>
      {/* Top Header & Context Bar */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="badge badge-accent" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                P0 SCIENTIFIC BENCHMARK
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Field: <strong style={{ color: 'var(--text-main)' }}>
                  {isDemoField ? 'বগুড়া রেফারেন্স ডেমো খামার [DEMO]' : (activeField?.name || 'Active Parcel')}
                </strong> ({activeField?.area_ha != null && Number.isFinite(Number(activeField.area_ha)) ? `${formatNumber(activeField.area_ha, 1)} ha` : '10.0 ha [Demo]'})
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              MILP vs RL vs Rule-Based Comparison Lab
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13, maxWidth: 780 }}>
              Evaluates Mixed-Integer Linear Programming, Reinforcement Learning sequential Q-policy, and a deterministic agronomic rule baseline under identical environmental history, field area, and planning horizons.
            </p>
          </div>

          {/* Action Buttons & Priority Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-root)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority:</span>
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="balanced" style={{ background: 'var(--bg-card)', color: '#fff' }}>Balanced (34% P, 33% W, 33% S)</option>
                <option value="profit" style={{ background: 'var(--bg-card)', color: '#fff' }}>Profit Focused (70% Profit)</option>
                <option value="water_efficiency" style={{ background: 'var(--bg-card)', color: '#fff' }}>Water Efficiency (60% Water)</option>
                <option value="soil_health" style={{ background: 'var(--bg-card)', color: '#fff' }}>Soil Health (60% Soil)</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => runLabComparison(priority)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  <span>Re-evaluate Lab</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={!labData?.export_csv}
              title="Download CSV report"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportJSON}
              disabled={!labData}
              title="Download JSON data"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Stale data warning if request failed after previous data existed */}
        {isStale && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--accent-amber)', borderRadius: 8, color: 'var(--accent-amber)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ <strong>Stale Data:</strong> Displaying previously evaluated results. Latest evaluation request failed ({error}).</span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => runLabComparison(priority)}
              style={{ fontSize: 12, padding: '4px 10px', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Evaluation warning/error if no labData is available */}
        {error && !labData && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(248, 113, 113, 0.12)', border: '1px solid var(--accent-red)', borderRadius: 8, color: 'var(--accent-red)', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Evaluation Warning:</div>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => runLabComparison(priority)}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              Retry Evaluation
            </button>
          </div>
        )}
      </div>

      {/* 3D SYNCHRONIZED COMPARISON WORKBENCH */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🌐</span>
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>3D Algorithmic Parcel Comparison (MILP vs RL vs Rule-Based)</strong>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShow3D(!show3D)}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            {show3D ? 'Hide 3D View ▴' : 'Show 3D View ▾'}
          </button>
        </div>
        {show3D && (
          <Comparison3Way3D
            labData={labData}
            activeField={activeField}
            priority={priority}
            lang={lang}
          />
        )}
      </div>

      {/* 3-COLUMN SIDE-BY-SIDE METHOD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18, marginBottom: 24 }}>
        {/* METHOD A: MILP OPTIMIZER */}
        <div className="dash-card ui-card-hud" style={{ borderTop: '4px solid var(--primary)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Method A • Exact Mathematical
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>MILP Optimizer</h3>
            </div>
            <span className="badge" style={{ background: 'rgba(0, 223, 129, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
              PuLP / CBC
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Solves multi-season integer constraints via branch-and-bound. Guarantees global optimality for the specified objective.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Net Return</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                {milpMethod?.total_field_profit_bdt != null && Number.isFinite(Number(milpMethod.total_field_profit_bdt))
                  ? `৳${formatNumber(milpMethod.total_field_profit_bdt, 0)}`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {milpMethod?.profit_bdt_per_ha != null && Number.isFinite(Number(milpMethod.profit_bdt_per_ha))
                  ? `৳${formatNumber(milpMethod.profit_bdt_per_ha, 0)}/ha`
                  : '৳—/ha'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Water Consumption</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                {milpMethod?.water_requirement_mm != null && Number.isFinite(Number(milpMethod.water_requirement_mm))
                  ? `${formatNumber(milpMethod.water_requirement_mm, 0)} mm`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Mean: {milpMethod?.mean_water_mm != null && Number.isFinite(Number(milpMethod.mean_water_mm))
                  ? `${formatNumber(milpMethod.mean_water_mm, 0)} mm/season`
                  : 'Not available'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Soil Health Proxy</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginTop: 2 }}>
                {milpMethod?.final_soil_health != null && Number.isFinite(Number(milpMethod.final_soil_health))
                  ? `${milpMethod.final_soil_health}/100`
                  : 'Not available'}
                {milpMethod?.soil_health_delta != null && Number.isFinite(Number(milpMethod.soil_health_delta)) ? (
                  <span style={{ fontSize: 11, color: milpMethod.soil_health_delta >= 0 ? 'var(--primary)' : 'var(--accent-red)', marginLeft: 4 }}>
                    ({milpMethod.soil_health_delta >= 0 ? '+' : ''}{milpMethod.soil_health_delta})
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Legumes: {milpMethod?.legume_season_count != null ? `${milpMethod.legume_season_count}/6 seasons` : '—'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Compliance & Speed</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: milpViolationInfo.isMissing
                  ? 'var(--text-muted)'
                  : milpViolationInfo.isZero
                  ? 'var(--primary)'
                  : 'var(--accent-red)',
                marginTop: 2
              }}>
                {milpViolationInfo.text}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Runtime: {milpMethod?.runtime_ms != null && Number.isFinite(Number(milpMethod.runtime_ms)) ? `${milpMethod.runtime_ms} ms` : '—'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Rotation Sequence:</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-root)', padding: '8px 10px', borderRadius: 6 }}>
              {milpMethod?.rotation_sequence || (milpMethod?.rotation ? Object.values(milpMethod.rotation).join(' -> ') : 'Evaluating sequence...')}
            </div>
          </div>
        </div>

        {/* METHOD B: RL SIMULATION POLICY */}
        <div className="dash-card" style={{ borderTop: '4px solid var(--accent-purple)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Method B • Simulation Policy
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>RL Simulation Policy</h3>
            </div>
            <span className="badge" style={{ background: 'rgba(167, 139, 250, 0.15)', color: 'var(--accent-purple)', fontWeight: 700 }}>
              Q-Learning MDP
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Dynamic MDP transition policy trained on simulation mechanics. Evaluates sequential actions using Bellman value functions.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Net Return</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-purple)', marginTop: 2 }}>
                {rlMethod?.total_field_profit_bdt != null && Number.isFinite(Number(rlMethod.total_field_profit_bdt))
                  ? `৳${formatNumber(rlMethod.total_field_profit_bdt, 0)}`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {rlMethod?.profit_bdt_per_ha != null && Number.isFinite(Number(rlMethod.profit_bdt_per_ha))
                  ? `৳${formatNumber(rlMethod.profit_bdt_per_ha, 0)}/ha`
                  : '৳—/ha'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Water Consumption</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                {rlMethod?.water_requirement_mm != null && Number.isFinite(Number(rlMethod.water_requirement_mm))
                  ? `${formatNumber(rlMethod.water_requirement_mm, 0)} mm`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Mean: {rlMethod?.mean_water_mm != null && Number.isFinite(Number(rlMethod.mean_water_mm))
                  ? `${formatNumber(rlMethod.mean_water_mm, 0)} mm/season`
                  : 'Not available'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Soil Health Proxy</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginTop: 2 }}>
                {rlMethod?.final_soil_health != null && Number.isFinite(Number(rlMethod.final_soil_health))
                  ? `${rlMethod.final_soil_health}/100`
                  : 'Not available'}
                {rlMethod?.soil_health_delta != null && Number.isFinite(Number(rlMethod.soil_health_delta)) ? (
                  <span style={{ fontSize: 11, color: rlMethod.soil_health_delta >= 0 ? 'var(--primary)' : 'var(--accent-red)', marginLeft: 4 }}>
                    ({rlMethod.soil_health_delta >= 0 ? '+' : ''}{rlMethod.soil_health_delta})
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Cum. Reward: {rlMethod?.cumulative_reward != null ? rlMethod.cumulative_reward : '—'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Compliance & Speed</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: rlViolationInfo.isMissing
                  ? 'var(--text-muted)'
                  : rlViolationInfo.isZero
                  ? 'var(--primary)'
                  : 'var(--accent-amber)',
                marginTop: 2
              }}>
                {rlViolationInfo.text}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Runtime: {rlMethod?.runtime_ms != null && Number.isFinite(Number(rlMethod.runtime_ms)) ? `${rlMethod.runtime_ms} ms` : '—'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Rotation Sequence:</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-root)', padding: '8px 10px', borderRadius: 6 }}>
              {rlMethod?.rotation_sequence || (rlMethod?.rotation ? Object.values(rlMethod.rotation).join(' -> ') : 'Evaluating sequence...')}
            </div>
          </div>
        </div>

        {/* METHOD C: RULE-BASED BASELINE */}
        <div className="dash-card ui-card-hud" style={{ borderTop: '4px solid var(--accent-amber)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Method C • Agronomic Baseline
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>Rule Baseline</h3>
            </div>
            <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-amber)', fontWeight: 700 }}>
              Regional Heuristic
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Deterministic decision rules using Bangladesh crop calendars, strict botanical family alternation, and tri-seasonal legume breaks.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Estimated Net Return</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-amber)', marginTop: 2 }}>
                {ruleMethod?.total_field_profit_bdt != null && Number.isFinite(Number(ruleMethod.total_field_profit_bdt))
                  ? `৳${formatNumber(ruleMethod.total_field_profit_bdt, 0)}`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {ruleMethod?.profit_bdt_per_ha != null && Number.isFinite(Number(ruleMethod.profit_bdt_per_ha))
                  ? `৳${formatNumber(ruleMethod.profit_bdt_per_ha, 0)}/ha`
                  : '৳—/ha'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Water Consumption</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                {ruleMethod?.water_requirement_mm != null && Number.isFinite(Number(ruleMethod.water_requirement_mm))
                  ? `${formatNumber(ruleMethod.water_requirement_mm, 0)} mm`
                  : 'Not available'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Mean: {ruleMethod?.mean_water_mm != null && Number.isFinite(Number(ruleMethod.mean_water_mm))
                  ? `${formatNumber(ruleMethod.mean_water_mm, 0)} mm/season`
                  : 'Not available'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Soil Health Proxy</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginTop: 2 }}>
                {ruleMethod?.final_soil_health != null && Number.isFinite(Number(ruleMethod.final_soil_health))
                  ? `${ruleMethod.final_soil_health}/100`
                  : 'Not available'}
                {ruleMethod?.soil_health_delta != null && Number.isFinite(Number(ruleMethod.soil_health_delta)) ? (
                  <span style={{ fontSize: 11, color: ruleMethod.soil_health_delta >= 0 ? 'var(--primary)' : 'var(--accent-red)', marginLeft: 4 }}>
                    ({ruleMethod.soil_health_delta >= 0 ? '+' : ''}{ruleMethod.soil_health_delta})
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Legumes: {ruleMethod?.legume_season_count != null ? `${ruleMethod.legume_season_count}/6 seasons` : '—'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-root)', padding: '10px 12px', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Compliance & Speed</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: ruleViolationInfo.isMissing
                  ? 'var(--text-muted)'
                  : ruleViolationInfo.isZero
                  ? 'var(--primary)'
                  : 'var(--accent-amber)',
                marginTop: 2
              }}>
                {ruleViolationInfo.text}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Runtime: {ruleMethod?.runtime_ms != null && Number.isFinite(Number(ruleMethod.runtime_ms)) ? `${ruleMethod.runtime_ms} ms` : '—'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Rotation Sequence:</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-root)', padding: '8px 10px', borderRadius: 6 }}>
              {ruleMethod?.rotation_sequence || (ruleMethod?.rotation ? Object.values(ruleMethod.rotation).join(' -> ') : 'Evaluating sequence...')}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED SEASON BY SEASON MATRIX TABLE */}
      <div className="dash-card" style={{ marginBottom: 24 }}>
        <div className="theme-card-header" style={{ marginBottom: 14 }}>
          <div className="theme-card-title-group">
            <span className="theme-card-eyebrow">TRAJECTORY BREAKDOWN</span>
            <h3 className="theme-card-title" style={{ fontSize: 16 }}>Season-by-Season Crop Selection Matrix</h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Comparing planned recommendations across the 6-season horizon
          </span>
        </div>

        {seasons ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="comparison-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Season Period</th>
                  <th style={{ padding: '10px 12px', color: 'var(--primary)' }}>Method A: MILP Optimizer</th>
                  <th style={{ padding: '10px 12px', color: 'var(--accent-purple)' }}>Method B: RL Policy</th>
                  <th style={{ padding: '10px 12px', color: 'var(--accent-amber)' }}>Method C: Rule Baseline</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((seasonLabel, idx) => {
                  const milpCrop = getCropForSeason(milpMethod, seasonLabel, idx);
                  const rlCrop = getCropForSeason(rlMethod, seasonLabel, idx);
                  const ruleCrop = getCropForSeason(ruleMethod, seasonLabel, idx);

                  return (
                    <tr key={seasonLabel} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        <span style={{ color: idx % 2 === 0 ? 'var(--accent-blue)' : 'var(--primary)', marginRight: 6 }}>
                          {idx % 2 === 0 ? '❄ Rabi' : '🌧 Kharif'}
                        </span>
                        {seasonLabel}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 4, background: milpCrop !== '—' ? 'rgba(0, 223, 129, 0.08)' : 'transparent' }}>
                          {milpCrop}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 4, background: rlCrop !== '—' ? 'rgba(167, 139, 250, 0.08)' : 'transparent' }}>
                          {rlCrop}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 4, background: ruleCrop !== '—' ? 'rgba(251, 191, 36, 0.08)' : 'transparent' }}>
                          {ruleCrop}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {loading ? 'Evaluating seasonal rotations across models...' : 'Rotation trajectory data is not yet evaluated or unavailable.'}
          </div>
        )}
      </div>

      {/* TRADE-OFF & SCIENTIFIC BOUNDARY ANALYSIS */}
      <div className="dash-card">
        <div className="theme-card-header" style={{ marginBottom: 14 }}>
          <div className="theme-card-title-group">
            <span className="theme-card-eyebrow">TRANSPARENT EVALUATION</span>
            <h3 className="theme-card-title" style={{ fontSize: 16 }}>Agronomic Trade-off Analysis &amp; Disclosures</h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 18 }}>
          {/* Highest Profit Winner */}
          <div style={{ background: 'var(--bg-root)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Highest Profit Winner</div>
            <div style={{ fontSize: 16, fontWeight: 800, margin: '4px 0', color: 'var(--text-main)' }}>
              {profitWinner.hasWinner ? (
                <>
                  {profitWinner.method} (৳{formatNumber(profitWinner.value, 0)}/ha)
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Winner unavailable (data incomplete)</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {profitWinner.explanation || 'Comparative profit metrics are incomplete across methods.'}
            </div>
          </div>

          {/* Hydrologic Conservation */}
          <div style={{ background: 'var(--bg-root)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Hydrologic Conservation</div>
            <div style={{ fontSize: 16, fontWeight: 800, margin: '4px 0', color: 'var(--text-main)' }}>
              {waterWinner.hasWinner ? (
                <>
                  {waterWinner.method} ({formatNumber(waterWinner.value, 0)} mm)
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Water winner unavailable</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {waterWinner.explanation || 'Water consumption metrics are incomplete across methods.'}
            </div>
          </div>

          {/* Soil Stewardship */}
          <div style={{ background: 'var(--bg-root)', padding: 14, borderRadius: 10, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Soil Stewardship</div>
            <div style={{ fontSize: 16, fontWeight: 800, margin: '4px 0', color: 'var(--text-main)' }}>
              {soilWinner.hasWinner ? (
                <>
                  {soilWinner.method} (+{soilWinner.value} pts)
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Soil stewardship winner unavailable</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {soilWinner.explanation || 'Soil health metrics are incomplete across methods.'}
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: 14, borderRadius: 10, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 4 }}>
            Scientific Integrity &amp; Methodological Boundary Disclosure
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.6 }}>
            {tradeOffs?.honest_evaluation_summary || (
              "MILP delivers provable global mathematical optimality for the modeled objective function, strictly satisfying all constraints without manual tuning. " +
              "The RL policy can adapt dynamically per-season but relies on heuristic future value estimation and simulation dynamics; it is not empirically field-validated. " +
              "The Rule-Based baseline provides high transparency and zero runtime overhead but sacrifices economic yield due to rigid heuristic rules."
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
