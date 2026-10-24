import React, { useState, useEffect } from 'react';

export function ActualOutcomesView({
  activeField,
  analysisResult,
  request,
  formatNumber,
  onNavigateTab,
}) {
  const [outcomes, setOutcomes] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const activePlan = analysisResult?.summary?.strategies?.balanced || null;
  const rotation = activePlan?.rotation || {};

  const [form, setForm] = useState({
    season_name: 'Year 1 - Rabi / Dry',
    crop_planted: 'Potato',
    actual_yield_kg_ha: '24500',
    actual_revenue_bdt: '245000',
    actual_cost_bdt: '110000',
    actual_water_mm: '470',
    predicted_yield_kg_ha: '25000',
    predicted_revenue_bdt: '250000',
    predicted_cost_bdt: '115000',
    predicted_water_mm: '500',
    planting_date: '2024-11-10',
    harvest_date: '2025-02-25',
    notes: 'Good tuber emergence; mild late blight controlled with copper oxychloride.',
  });

  const fetchOutcomes = async () => {
    setLoading(true);
    setError('');
    try {
      const fieldId = activeField?.id || 'demo';
      const res = await request(`/api/outcomes/${fieldId}`);
      if (res && res.status === 'ok') {
        setOutcomes(res.outcomes || []);
        setSummaryStats(res.summary || null);
      }
    } catch (err) {
      setError(err.message || 'Error fetching empirical harvest outcomes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutcomes();
  }, [activeField]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        field_id: activeField?.id || 'demo',
        season_name: form.season_name,
        crop_planted: form.crop_planted,
        actual_yield_kg_ha: parseFloat(form.actual_yield_kg_ha),
        actual_revenue_bdt: parseFloat(form.actual_revenue_bdt),
        actual_cost_bdt: parseFloat(form.actual_cost_bdt),
        actual_water_mm: parseFloat(form.actual_water_mm),
        predicted_yield_kg_ha: parseFloat(form.predicted_yield_kg_ha),
        predicted_revenue_bdt: parseFloat(form.predicted_revenue_bdt),
        predicted_cost_bdt: parseFloat(form.predicted_cost_bdt),
        predicted_water_mm: parseFloat(form.predicted_water_mm),
        planting_date: form.planting_date,
        harvest_date: form.harvest_date,
        notes: form.notes,
      };

      const res = await request('/api/outcomes/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.status === 'ok') {
        setShowAddForm(false);
        fetchOutcomes();
      } else {
        throw new Error(res?.detail || 'Failed to record harvest outcome.');
      }
    } catch (err) {
      setError(err.message || 'Error saving outcome record.');
    } finally {
      setSubmitting(false);
    }
  };

  const cropChoices = [
    'Potato', 'Rice', 'Maize', 'Wheat', 'Mungbean', 'Lentil', 'Mustard',
    'Chickpea', 'Soybean', 'Sorghum', 'Sesame', 'Groundnut', 'Sunflower', 'Tomato', 'Jute'
  ];

  return (
    <div className="actual-outcomes-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>📋</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Actual vs. Estimated Outcomes
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P2 EMPIRICAL VALIDATION
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              Bridge mathematical predictions with ground truth. Record real harvest yields, farm-gate prices, and water use to compute 
              empirical model variance (Δ Yield, Δ Revenue). Historical observations are preserved in SQLite and never fabricated.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-primary-run-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? '#334155' : 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)',
            }}
          >
            {showAddForm ? '✕ Close Form' : '+ Record Seasonal Harvest'}
          </button>
        </div>

        {/* Summary Metric Chips */}
        {summaryStats && summaryStats.total_recorded_seasons > 0 && (
          <div style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}>
            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Observed Seasons</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {summaryStats.total_recorded_seasons} Recorded
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Empirical farm harvest logs</span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Average Yield Variance</span>
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                color: (summaryStats.average_yield_variance_pct || 0) >= 0 ? '#00df81' : '#f87171',
                marginTop: '2px',
              }}>
                {(summaryStats.average_yield_variance_pct || 0) > 0 ? '+' : ''}{formatNumber(summaryStats.average_yield_variance_pct, 1)}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Actual vs. MILP predicted yield</span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Average Revenue Variance</span>
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                color: (summaryStats.average_revenue_variance_pct || 0) >= 0 ? '#00df81' : '#f87171',
                marginTop: '2px',
              }}>
                {(summaryStats.average_revenue_variance_pct || 0) > 0 ? '+' : ''}{formatNumber(summaryStats.average_revenue_variance_pct, 1)}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Actual vs. MILP predicted cash</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#451a1a', border: '1px solid #7f1d1d', borderRadius: '10px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Record Outcome Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="dash-card" style={{ background: '#131920', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
            Record Seasonal Harvest Ground Truth
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Season Window:</label>
              <input
                type="text"
                className="input-box"
                value={form.season_name}
                onChange={e => setForm({ ...form, season_name: e.target.value })}
                required
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Actual Crop Planted:</label>
              <select
                className="dashboard-field-select"
                value={form.crop_planted}
                onChange={e => setForm({ ...form, crop_planted: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155' }}
              >
                {cropChoices.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Actual Yield (kg/ha):</label>
              <input
                type="number"
                className="input-box"
                value={form.actual_yield_kg_ha}
                onChange={e => setForm({ ...form, actual_yield_kg_ha: e.target.value })}
                required
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Model Predicted Yield (kg/ha):</label>
              <input
                type="number"
                className="input-box"
                value={form.predicted_yield_kg_ha}
                onChange={e => setForm({ ...form, predicted_yield_kg_ha: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Actual Revenue (BDT/ha):</label>
              <input
                type="number"
                className="input-box"
                value={form.actual_revenue_bdt}
                onChange={e => setForm({ ...form, actual_revenue_bdt: e.target.value })}
                required
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Predicted Revenue (BDT/ha):</label>
              <input
                type="number"
                className="input-box"
                value={form.predicted_revenue_bdt}
                onChange={e => setForm({ ...form, predicted_revenue_bdt: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Actual Water Applied (mm):</label>
              <input
                type="number"
                className="input-box"
                value={form.actual_water_mm}
                onChange={e => setForm({ ...form, actual_water_mm: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Harvest Date:</label>
              <input
                type="date"
                className="input-box"
                value={form.harvest_date}
                onChange={e => setForm({ ...form, harvest_date: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>Field Management &amp; Weather Notes:</label>
            <textarea
              className="input-box"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="dashboard-primary-run-btn" disabled={submitting}>
              {submitting ? 'Saving Ground Truth...' : 'Save Harvest Record'}
            </button>
          </div>
        </form>
      )}

      {/* Recorded Outcomes Table */}
      <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span> Empirical Ground Truth Records &amp; Prediction Variance
        </h3>

        {outcomes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌱</span>
            <strong style={{ color: '#f8fafc', fontSize: '15px' }}>No harvest outcome records registered yet for this field.</strong>
            <p style={{ margin: '6px 0 14px', fontSize: '12.5px' }}>
              FieldShift never invents fake historical outcomes. Click "+ Record Seasonal Harvest" above to log real harvest results.
            </p>
            <button
              type="button"
              className="dashboard-primary-run-btn"
              onClick={() => setShowAddForm(true)}
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              + Record First Season
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Season</th>
                  <th style={{ padding: '10px' }}>Crop</th>
                  <th style={{ padding: '10px' }}>Actual Yield</th>
                  <th style={{ padding: '10px' }}>Predicted Yield</th>
                  <th style={{ padding: '10px' }}>Yield Variance</th>
                  <th style={{ padding: '10px' }}>Actual Revenue</th>
                  <th style={{ padding: '10px' }}>Revenue Variance</th>
                  <th style={{ padding: '10px' }}>Harvest Notes</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((item, idx) => {
                  const yVar = item.yield_variance_pct || 0;
                  const rVar = item.revenue_variance_pct || 0;
                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#f8fafc' }}>{item.season_name}</td>
                      <td style={{ padding: '10px', color: '#00df81', fontWeight: 700 }}>{item.crop_planted}</td>
                      <td style={{ padding: '10px', color: '#f8fafc' }}>{formatNumber(item.actual_yield_kg_ha, 0)} kg/ha</td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{formatNumber(item.predicted_yield_kg_ha, 0)} kg/ha</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: yVar >= 0 ? 'rgba(0, 223, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: yVar >= 0 ? '#00df81' : '#f87171',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}>
                          {yVar > 0 ? `+${formatNumber(yVar, 1)}%` : `${formatNumber(yVar, 1)}%`}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#f8fafc' }}>BDT {formatNumber(item.actual_revenue_bdt, 0)}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: rVar >= 0 ? 'rgba(0, 223, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: rVar >= 0 ? '#00df81' : '#f87171',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}>
                          {rVar > 0 ? `+${formatNumber(rVar, 1)}%` : `${formatNumber(rVar, 1)}%`}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8', fontSize: '11.5px', maxWidth: '240px' }}>
                        {item.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety & Model Evaluation Notice */}
      <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '22px' }}>🛡️</span>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#f8fafc' }}>Continuous Evaluation Safety Protocol:</strong> Recorded harvest outcomes are stored 
          for diagnostic comparison and validation. In accordance with agronomic safety guidelines, records are 
          <strong>not automatically piped into uncontrolled model retraining</strong> without explicit agronomic supervision.
        </div>
      </div>
    </div>
  );
}
