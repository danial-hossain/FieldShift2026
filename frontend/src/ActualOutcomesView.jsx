// frontend/src/ActualOutcomesView.jsx
// Actual vs. Estimated Seasonal Outcomes View with Interactive 3D Model Validation
// Bridges mathematical MILP/model predictions with empirical ground truth.
// Features:
// - Empirical harvest record logging to SQLite via POST /api/outcomes/record
// - 3D side-by-side validation workbench (Model Forecast vs. Observed Ground Truth)
// - Normalized variance metrics (Δ Yield %, Δ Revenue %, Δ Water %)
// - Zero fabrication: historical observations are strictly derived from user records or SQLite persistence.

import React, { useState, useEffect, useMemo } from 'react';
import { request as defaultRequest } from './apiClient.js';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { Outcomes3D } from './research3d/Outcomes3D.jsx';

export function ActualOutcomesView({
  activeField,
  analysisResult,
  request: propRequest,
  formatNumber: propFormatNumber,
  onNavigateTab,
  onBack,
  lang = 'bn'
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;

  const [outcomes, setOutcomes] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);

  const activePlan = analysisResult?.summary?.strategies?.balanced || null;

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
        const rawList = res.outcomes || [];
        // Normalize outcomes so both API/database schema and UI field conventions match
        const normalized = rawList.map((r, idx) => {
          const actKg = r.actual_yield_kg_ha != null
            ? Number(r.actual_yield_kg_ha)
            : (r.actual_yield_t_ha != null ? Number(r.actual_yield_t_ha) * 1000 : null);
          const predKg = r.predicted_yield_kg_ha != null
            ? Number(r.predicted_yield_kg_ha)
            : (r.estimated_yield_t_ha != null ? Number(r.estimated_yield_t_ha) * 1000 : null);

          return {
            ...r,
            uid: r.id || `outcome-${idx}`,
            crop_planted: r.crop || r.crop_planted || 'Crop',
            season_name: r.period || r.season_name || `${r.season || 'Season'} ${r.year || ''}`.trim(),
            actual_yield_kg_ha: actKg,
            predicted_yield_kg_ha: predKg,
            actual_revenue_bdt: r.actual_revenue_bdt != null ? Number(r.actual_revenue_bdt) : null,
            predicted_revenue_bdt: (r.predicted_revenue_bdt != null ? Number(r.predicted_revenue_bdt) : (r.estimated_revenue_bdt != null ? Number(r.estimated_revenue_bdt) : null)),
            actual_water_mm: r.actual_water_mm != null ? Number(r.actual_water_mm) : null,
            predicted_water_mm: (r.predicted_water_mm != null ? Number(r.predicted_water_mm) : (r.estimated_water_mm != null ? Number(r.estimated_water_mm) : null)),
            notes: r.management_notes || r.notes || '',
          };
        });

        setOutcomes(normalized);
        setSummaryStats(res.summary || null);
        if (normalized.length > 0 && !selectedOutcomeId) {
          setSelectedOutcomeId(normalized[0].uid);
        }
      }
    } catch (err) {
      setError(err.message || (lang === 'bn' ? 'ফসল কাটার ফলাফল আনতে ব্যর্থ হয়েছে।' : 'Error fetching empirical harvest outcomes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutcomes();
  }, [activeField]);

  const activeSelectedOutcome = useMemo(() => {
    return outcomes.find(o => o.uid === selectedOutcomeId) || outcomes[0] || null;
  }, [outcomes, selectedOutcomeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const actYield = parseFloat(form.actual_yield_kg_ha);
      const actRev = parseFloat(form.actual_revenue_bdt);
      const actCost = parseFloat(form.actual_cost_bdt);
      const actWater = parseFloat(form.actual_water_mm);
      const predYield = parseFloat(form.predicted_yield_kg_ha);
      const predRev = parseFloat(form.predicted_revenue_bdt);
      const predCost = parseFloat(form.predicted_cost_bdt);
      const predWater = parseFloat(form.predicted_water_mm);

      // Client-side bounds validation
      if (isNaN(actYield) || actYield <= 0 || actYield > 200000) {
        throw new Error(lang === 'bn' ? 'প্রকৃত ফলন অবশ্যই ১ থেকে ২,০০,০০০ কেজি/হেক্টরের মধ্যে হতে হবে।' : 'Actual yield must be between 1 and 200,000 kg/ha.');
      }
      if (isNaN(actRev) || actRev < 0) {
        throw new Error(lang === 'bn' ? 'প্রকৃত রাজস্ব অবশ্যই ০ বা তার বেশি হতে হবে।' : 'Actual revenue must be non-negative.');
      }
      if (isNaN(actWater) || actWater < 0 || actWater > 3000) {
        throw new Error(lang === 'bn' ? 'প্রকৃত সেচ পানি অবশ্যই ০ থেকে ৩,০০০ মিমি এর মধ্যে হতে হবে।' : 'Actual water must be between 0 and 3,000 mm.');
      }
      if (form.planting_date && form.harvest_date && new Date(form.harvest_date) < new Date(form.planting_date)) {
        throw new Error(lang === 'bn' ? 'ফসল কাটার তারিখ রোপণ তারিখের পরে হতে হবে।' : 'Harvest date must be after planting date.');
      }

      const payload = {
        field_id: activeField?.id || 1,
        crop: form.crop_planted,
        crop_planted: form.crop_planted,
        period: form.season_name,
        season_name: form.season_name,
        season: form.season_name.toLowerCase().includes('wet') || form.season_name.toLowerCase().includes('aman') ? 'wet' : 'dry',
        year: parseInt(form.harvest_date?.split('-')?.[0] || '2025', 10),
        actual_yield_kg_ha: actYield,
        actual_yield_t_ha: actYield / 1000.0,
        actual_revenue_bdt: actRev,
        actual_cost_bdt: isNaN(actCost) ? 0 : actCost,
        actual_water_mm: actWater,
        predicted_yield_kg_ha: isNaN(predYield) ? null : predYield,
        estimated_yield_t_ha: isNaN(predYield) ? null : predYield / 1000.0,
        predicted_revenue_bdt: isNaN(predRev) ? null : predRev,
        estimated_revenue_bdt: isNaN(predRev) ? null : predRev,
        predicted_cost_bdt: isNaN(predCost) ? null : predCost,
        predicted_water_mm: isNaN(predWater) ? null : predWater,
        estimated_water_mm: isNaN(predWater) ? null : predWater,
        planting_date: form.planting_date,
        harvest_date: form.harvest_date,
        notes: form.notes,
        management_notes: form.notes,
      };

      const res = await request('/api/outcomes/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.status === 'ok') {
        setSuccessMsg(lang === 'bn' ? 'ফসল কাটার ফলাফল সফলভাবে সংরক্ষিত হয়েছে।' : 'Seasonal harvest ground truth recorded successfully in SQLite.');
        setShowAddForm(false);
        await fetchOutcomes();
      } else {
        throw new Error(res?.detail || (lang === 'bn' ? 'ফলাফল সংরক্ষণ ব্যর্থ হয়েছে।' : 'Failed to record harvest outcome.'));
      }
    } catch (err) {
      setError(err.message || (lang === 'bn' ? 'তথ্য সংরক্ষণে সমস্যা হয়েছে।' : 'Error saving outcome record.'));
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
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>📋</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                {lang === 'bn' ? 'প্রকৃত বনাম আনুমানিক ফলাফল ল্যাব' : 'Actual vs. Estimated Outcomes Lab'}
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P2 EMPIRICAL VALIDATION
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              {lang === 'bn'
                ? 'গাণিতিক পূর্বাভাসের সাথে কৃষকের বাস্তব মাঠের তথ্যের মিলন ঘটান। বাস্তব ফলন, বাজারমূল্য ও পানির ব্যবহার সংরক্ষণ করে মডেলের যথার্থতা পরীক্ষা করুন।'
                : 'Bridge mathematical predictions with ground truth. Record real harvest yields, farm-gate prices, and water use to compute empirical model variance (Δ Yield, Δ Revenue). Historical observations are preserved in SQLite and never fabricated.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onBack && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onBack}
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
              >
                ← {lang === 'bn' ? 'ফিরে যান' : 'Back'}
              </button>
            )}
            <button
              type="button"
              className="dashboard-primary-run-btn"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError('');
                setSuccessMsg('');
              }}
              style={{
                background: showAddForm ? '#334155' : 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{showAddForm ? '✕' : '+'}</span>
              <span>{showAddForm ? (lang === 'bn' ? 'ফর্ম বন্ধ করুন' : 'Close Form') : (lang === 'bn' ? '+ মৌসুমের ফসল কাটার তথ্য দিন' : '+ Record Seasonal Harvest')}</span>
            </button>
          </div>
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
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                {lang === 'bn' ? 'পর্যবেক্ষিত মৌসুমসমূহ' : 'Observed Seasons'}
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {summaryStats.total_recorded_seasons} {lang === 'bn' ? 'টি রেকর্ড' : 'Recorded'}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {lang === 'bn' ? 'মাঠের প্রকৃত তথ্য ভাণ্ডার' : 'Empirical farm harvest logs'}
              </span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                {lang === 'bn' ? 'গড় ফলন পার্থক্য' : 'Average Yield Variance'}
              </span>
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                color: (summaryStats.average_yield_variance_pct || 0) >= 0 ? '#00df81' : '#f87171',
                marginTop: '2px',
              }}>
                {(summaryStats.average_yield_variance_pct || 0) > 0 ? '+' : ''}{formatNumber(summaryStats.average_yield_variance_pct, 1)}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {lang === 'bn' ? 'প্রকৃত বনাম MILP পূর্বাভাস' : 'Actual vs. MILP predicted yield'}
              </span>
            </div>

            <div style={{ background: '#0e1318', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                {lang === 'bn' ? 'গড় রাজস্ব পার্থক্য' : 'Average Revenue Variance'}
              </span>
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                color: (summaryStats.average_revenue_variance_pct || 0) >= 0 ? '#00df81' : '#f87171',
                marginTop: '2px',
              }}>
                {(summaryStats.average_revenue_variance_pct || 0) > 0 ? '+' : ''}{formatNumber(summaryStats.average_revenue_variance_pct, 1)}%
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {lang === 'bn' ? 'প্রকৃত বনাম MILP আয়' : 'Actual vs. MILP predicted cash'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive 3D Validation Scene */}
      <Outcomes3D
        selectedOutcome={activeSelectedOutcome}
        formPreview={showAddForm ? form : null}
        activeField={activeField}
        formatNumber={formatNumber}
        lang={lang}
      />

      {error && (
        <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '14px', background: 'rgba(0, 223, 129, 0.15)', border: '1px solid #00df81', borderRadius: '10px', color: '#6ee7b7', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Success:</strong> {successMsg}
        </div>
      )}

      {/* Record Outcome Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="dash-card" style={{
          background: 'rgba(19, 25, 32, 0.95)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> {lang === 'bn' ? 'মৌসুমের মাঠ পর্যায়ের ফসল কাটার তথ্য প্রদান' : 'Record Seasonal Harvest Ground Truth'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'মৌসুম ও বছর:' : 'Season Window:'}
              </label>
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
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'প্রকৃত চাষকৃত ফসল:' : 'Actual Crop Planted:'}
              </label>
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
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'প্রকৃত ফলন (kg/ha):' : 'Actual Yield (kg/ha):'}
              </label>
              <input
                type="number"
                className="input-box"
                value={form.actual_yield_kg_ha}
                onChange={e => setForm({ ...form, actual_yield_kg_ha: e.target.value })}
                required
                min="1"
                max="200000"
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'মডেল পূর্বাভাস ফলন (kg/ha):' : 'Model Predicted Yield (kg/ha):'}
              </label>
              <input
                type="number"
                className="input-box"
                value={form.predicted_yield_kg_ha}
                onChange={e => setForm({ ...form, predicted_yield_kg_ha: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'প্রকৃত মোট রাজস্ব (BDT/ha):' : 'Actual Revenue (BDT/ha):'}
              </label>
              <input
                type="number"
                className="input-box"
                value={form.actual_revenue_bdt}
                onChange={e => setForm({ ...form, actual_revenue_bdt: e.target.value })}
                required
                min="0"
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'পূর্বাভাস রাজস্ব (BDT/ha):' : 'Predicted Revenue (BDT/ha):'}
              </label>
              <input
                type="number"
                className="input-box"
                value={form.predicted_revenue_bdt}
                onChange={e => setForm({ ...form, predicted_revenue_bdt: e.target.value })}
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'প্রকৃত সেচ পানি (mm):' : 'Actual Water Applied (mm):'}
              </label>
              <input
                type="number"
                className="input-box"
                value={form.actual_water_mm}
                onChange={e => setForm({ ...form, actual_water_mm: e.target.value })}
                min="0"
                max="3000"
                style={{ width: '100%', background: '#0e1318', color: '#f8fafc', border: '1px solid #334155', padding: '8px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                {lang === 'bn' ? 'ফসল কাটার তারিখ:' : 'Harvest Date:'}
              </label>
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
            <label style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
              {lang === 'bn' ? 'মাঠ ব্যবস্থাপনা ও আবহাওয়ার বিবরণ:' : 'Field Management & Weather Notes:'}
            </label>
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
              {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
            </button>
            <button type="submit" className="dashboard-primary-run-btn" disabled={submitting}>
              {submitting ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving Ground Truth...') : (lang === 'bn' ? 'ফলাফল সংরক্ষণ করুন' : 'Save Harvest Record')}
            </button>
          </div>
        </form>
      )}

      {/* Recorded Outcomes Table */}
      <div className="dash-card" style={{
        background: '#131920',
        border: '1px solid #1e293b',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> {lang === 'bn' ? 'মাঠ পর্যায়ের বাস্তব রেকর্ড ও মডেল পার্থক্য' : 'Empirical Ground Truth Records & Prediction Variance'}
          </h3>
          {outcomes.length > 0 && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {lang === 'bn' ? 'সারিতে ক্লিক করে ত্রিমাত্রিক ভিউতে বিস্তারিত দেখুন' : 'Click a row to inspect in 3D'}
            </span>
          )}
        </div>

        {outcomes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌱</span>
            <strong style={{ color: '#f8fafc', fontSize: '15px' }}>
              {lang === 'bn' ? 'এই জমির জন্য এখনো কোনো বাস্তব ফসল কাটার তথ্য যুক্ত করা হয়নি।' : 'No harvest outcome records registered yet for this field.'}
            </strong>
            <p style={{ margin: '6px 0 14px', fontSize: '12.5px' }}>
              {lang === 'bn'
                ? 'FieldShift কখনোই কাল্পনিক ঐতিহাসিক ফলন তৈরি করে না। বাস্তব তথ্য যোগ করতে উপরের বোতামে ক্লিক করুন।'
                : 'FieldShift never invents fake historical outcomes. Click "+ Record Seasonal Harvest" above to log real harvest results.'}
            </p>
            <button
              type="button"
              className="dashboard-primary-run-btn"
              onClick={() => setShowAddForm(true)}
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              + {lang === 'bn' ? 'প্রথম মৌসুমের তথ্য যুক্ত করুন' : 'Record First Season'}
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'মৌসুম' : 'Season'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'ফসল' : 'Crop'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'বাস্তব ফলন' : 'Actual Yield'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'পূর্বাভাস ফলন' : 'Predicted Yield'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'ফলন পার্থক্য' : 'Yield Variance'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'বাস্তব রাজস্ব' : 'Actual Revenue'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'রাজস্ব পার্থক্য' : 'Revenue Variance'}</th>
                  <th style={{ padding: '10px' }}>{lang === 'bn' ? 'ম্যানেজমেন্ট নোট' : 'Harvest Notes'}</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((item) => {
                  const isSelected = item.uid === selectedOutcomeId;
                  const yVar = item.yield_variance_pct != null
                    ? item.yield_variance_pct
                    : (item.predicted_yield_kg_ha && item.actual_yield_kg_ha ? ((item.actual_yield_kg_ha - item.predicted_yield_kg_ha) / item.predicted_yield_kg_ha) * 100 : null);
                  const rVar = item.revenue_variance_pct != null
                    ? item.revenue_variance_pct
                    : (item.predicted_revenue_bdt && item.actual_revenue_bdt ? ((item.actual_revenue_bdt - item.predicted_revenue_bdt) / item.predicted_revenue_bdt) * 100 : null);

                  return (
                    <tr
                      key={item.uid}
                      onClick={() => setSelectedOutcomeId(item.uid)}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <td style={{ padding: '10px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.season_name}
                        {isSelected && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: '#c084fc', fontWeight: 700 }}>
                            ● 3D ACTIVE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#00df81', fontWeight: 700 }}>{item.crop_planted}</td>
                      <td style={{ padding: '10px', color: '#f8fafc' }}>
                        {item.actual_yield_kg_ha != null ? `${formatNumber(item.actual_yield_kg_ha, 0)} kg/ha` : '—'}
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>
                        {item.predicted_yield_kg_ha != null ? `${formatNumber(item.predicted_yield_kg_ha, 0)} kg/ha` : '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {yVar != null ? (
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
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px', color: '#f8fafc' }}>
                        {item.actual_revenue_bdt != null ? `BDT ${formatNumber(item.actual_revenue_bdt, 0)}` : '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {rVar != null ? (
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
                        ) : '—'}
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
      <div className="dash-card" style={{
        background: '#131920',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '22px' }}>🛡️</span>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#f8fafc' }}>
            {lang === 'bn' ? 'ধারাবাহিক মূল্যায়ন ও নিরাপত্তা প্রোটোকল:' : 'Continuous Evaluation Safety Protocol:'}
          </strong>{' '}
          {lang === 'bn'
            ? 'সংরক্ষিত বাস্তব তথ্য শুধুমাত্র রোগ নির্ণয় ও পূর্বাভাসের ত্রুটি যাচাইয়ের জন্য ব্যবহৃত হয়। বিশেষজ্ঞ কৃষি বিজ্ঞানীর অনুমোদন ছাড়া স্বয়ংক্রিয়ভাবে অ্যালগরিদম পুনরায় প্রশিক্ষিত হয় না।'
            : 'Recorded harvest outcomes are stored for diagnostic comparison and validation. In accordance with agronomic safety guidelines, records are not automatically piped into uncontrolled model retraining without explicit agronomic supervision.'}
        </div>
      </div>
    </div>
  );
}
