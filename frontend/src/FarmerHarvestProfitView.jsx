// frontend/src/FarmerHarvestProfitView.jsx
// Simple, transparent profit calculator and actual harvest logger for Bangladeshi farmers

import React, { useState, useEffect } from 'react';
import { useTranslation, toBengaliNumber, formatCurrency } from './i18n.js';

export function FarmerHarvestProfitView({
  activeField,
  user,
  lang = 'bn',
  onNavigate
}) {
  const { t } = useTranslation(lang);

  // Profit Calculator State
  const defaultArea = activeField?.area_ha ? (activeField.area_ha * 7.47).toFixed(1) : '3.0';
  const [areaValue, setAreaValue] = useState(defaultArea); // in bigha
  const [unitType, setUnitType] = useState('bigha'); // 'bigha' | 'ha'
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [scenarioMode, setScenarioMode] = useState('baseline'); // 'baseline' | 'optimistic' | 'downside'

  // Actual Harvest Logging State
  const [actualYieldMaund, setActualYieldMaund] = useState('');
  const [actualPriceBdt, setActualPriceBdt] = useState('');
  const [actualNotes, setActualNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Update default area when activeField changes
  useEffect(() => {
    if (activeField?.area_ha) {
      if (unitType === 'bigha') {
        setAreaValue((activeField.area_ha * 7.47).toFixed(1));
      } else {
        setAreaValue(Number(activeField.area_ha).toFixed(2));
      }
    }
  }, [activeField, unitType]);

  const CROP_BENCHMARKS = {
    Rice: {
      name_bn: 'আমন ধান',
      name_en: 'Aman Rice',
      yield_per_bigha_maund: 16.0,
      yield_per_ha_t: 4.8,
      price_bdt_maund: 1040,
      price_bdt_kg: 26,
      cost_seed_fert_bigha: 4200,
      cost_irrigation_bigha: 2000,
      cost_labor_bigha: 3800,
      cost_marketing_bigha: 500
    },
    Mustard: {
      name_bn: 'সরিষা',
      name_en: 'Mustard',
      yield_per_bigha_maund: 5.5,
      yield_per_ha_t: 1.6,
      price_bdt_maund: 2160,
      price_bdt_kg: 54,
      cost_seed_fert_bigha: 2200,
      cost_irrigation_bigha: 800,
      cost_labor_bigha: 2200,
      cost_marketing_bigha: 400
    },
    Lentil: {
      name_bn: 'মসুর ডাল',
      name_en: 'Lentil',
      yield_per_bigha_maund: 4.5,
      yield_per_ha_t: 1.3,
      price_bdt_maund: 3040,
      price_bdt_kg: 76,
      cost_seed_fert_bigha: 2000,
      cost_irrigation_bigha: 600,
      cost_labor_bigha: 2000,
      cost_marketing_bigha: 400
    },
    Potato: {
      name_bn: 'গোল আলু',
      name_en: 'Potato',
      yield_per_bigha_maund: 55.0,
      yield_per_ha_t: 16.5,
      price_bdt_maund: 560,
      price_bdt_kg: 14,
      cost_seed_fert_bigha: 8500,
      cost_irrigation_bigha: 2500,
      cost_labor_bigha: 4500,
      cost_marketing_bigha: 1500
    },
    Maize: {
      name_bn: 'ভুট্টা',
      name_en: 'Maize',
      yield_per_bigha_maund: 28.0,
      yield_per_ha_t: 8.4,
      price_bdt_maund: 840,
      price_bdt_kg: 21,
      cost_seed_fert_bigha: 4500,
      cost_irrigation_bigha: 2200,
      cost_labor_bigha: 3200,
      cost_marketing_bigha: 600
    }
  };

  const crop = CROP_BENCHMARKS[selectedCrop] || CROP_BENCHMARKS.Rice;

  // Convert area to bigha multiplier
  const numArea = Math.max(0.1, Number(areaValue) || 1.0);
  const bighaCount = unitType === 'bigha' ? numArea : numArea * 7.47;

  // Scenario multipliers
  let yieldMult = 1.0;
  let priceMult = 1.0;
  if (scenarioMode === 'optimistic') {
    yieldMult = 1.10;
    priceMult = 1.15;
  } else if (scenarioMode === 'downside') {
    yieldMult = 0.85;
    priceMult = 0.80;
  }

  // Cost calculations
  const totalCostSeedFert = crop.cost_seed_fert_bigha * bighaCount;
  const totalCostIrrigation = crop.cost_irrigation_bigha * bighaCount;
  const totalCostLabor = crop.cost_labor_bigha * bighaCount;
  const totalCostMarketing = crop.cost_marketing_bigha * bighaCount;
  const grandTotalCost = totalCostSeedFert + totalCostIrrigation + totalCostLabor + totalCostMarketing;

  // Revenue & Yield
  const totalYieldMaund = crop.yield_per_bigha_maund * bighaCount * yieldMult;
  const effectivePricePerMaund = crop.price_bdt_maund * priceMult;
  const grossSales = totalYieldMaund * effectivePricePerMaund;
  const estimatedNetProfit = grossSales - grandTotalCost;

  // Break-even
  const totalKg = totalYieldMaund * 40;
  const breakEvenPriceKg = totalKg > 0 ? (grandTotalCost / totalKg) : 0;

  // Save Actual Harvest to Backend
  const handleSaveActualHarvest = async () => {
    setShowConfirmModal(false);
    setSaveStatus('saving');

    try {
      const payload = {
        field_id: activeField?.id || 58,
        crop: selectedCrop,
        season: 'Rabi 2026',
        actual_yield_t_ha: Number(actualYieldMaund) ? (Number(actualYieldMaund) / 25).toFixed(2) : 2.5,
        actual_price_bdt_kg: Number(actualPriceBdt) ? Number(actualPriceBdt) : crop.price_bdt_kg,
        notes: actualNotes || 'Farmer logged through mobile assistance interface'
      };

      const res = await fetch('/api/outcomes/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus('success');
        setActualYieldMaund('');
        setActualPriceBdt('');
        setActualNotes('');
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        throw new Error('Save error');
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <div className="farmer-view-container">
      {/* Hero Header */}
      <div className="farmer-hero-card">
        <div className="farmer-hero-badge">
          <span>💰 {lang === 'bn' ? 'লাভ ও খরচের সহজ ক্যালকুলেটর' : 'Simple Profit Calculator'}</span>
        </div>
        <h2 className="farmer-hero-title">{t('profit_calculator_heading')}</h2>
        <p className="farmer-hero-desc">{t('profit_calculator_sub')}</p>
      </div>

      <div className="farmer-profit-layout">
        {/* Left Column: Input Form */}
        <div className="farmer-profit-inputs-card">
          <h3 className="section-title">
            📝 {lang === 'bn' ? '১. জমির পরিমাণ ও ফসল পছন্দ করুন' : '1. Land & Crop Details'}
          </h3>

          <div className="form-group-farmer">
            <label className="form-label-farmer">{t('land_area_input')}</label>
            <div className="input-with-select">
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input-number-farmer"
                value={areaValue}
                onChange={(e) => setAreaValue(e.target.value)}
              />
              <select
                className="select-unit-farmer"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
              >
                <option value="bigha">{t('unit_bigha_option')}</option>
                <option value="ha">{t('unit_ha_option')}</option>
              </select>
            </div>
            <small className="input-hint">
              {lang === 'bn'
                ? `(মোট জমির হিসাব: ${toBengaliNumber(bighaCount.toFixed(1))} বিঘা)`
                : `(Calculated land: ${bighaCount.toFixed(1)} bighas)`}
            </small>
          </div>

          <div className="form-group-farmer">
            <label className="form-label-farmer">{t('select_crop_label')}</label>
            <div className="crop-selector-chips">
              {Object.entries(CROP_BENCHMARKS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  className={`crop-chip-btn ${selectedCrop === key ? 'active' : ''}`}
                  onClick={() => setSelectedCrop(key)}
                >
                  {c.name_bn} ({key})
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Toggle */}
          <div className="form-group-farmer">
            <label className="form-label-farmer">
              {lang === 'bn' ? 'পরিস্থিতি বা আবহাওয়া পূর্বাভাস:' : 'Scenario Projection:'}
            </label>
            <div className="scenario-pills">
              <button
                type="button"
                className={`scenario-pill ${scenarioMode === 'baseline' ? 'active' : ''}`}
                onClick={() => setScenarioMode('baseline')}
              >
                {lang === 'bn' ? 'স্বাভাবিক বছর' : 'Baseline'}
              </button>
              <button
                type="button"
                className={`scenario-pill ${scenarioMode === 'optimistic' ? 'active' : ''}`}
                onClick={() => setScenarioMode('optimistic')}
              >
                {lang === 'bn' ? 'উচ্চ ফলন ও দাম (+১৫%)' : 'Optimistic (+15%)'}
              </button>
              <button
                type="button"
                className={`scenario-pill ${scenarioMode === 'downside' ? 'active' : ''}`}
                onClick={() => setScenarioMode('downside')}
              >
                {lang === 'bn' ? 'খরা বা দাম মন্দা (-২০%)' : 'Downside (-20%)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output Financial Summary */}
        <div className="farmer-profit-result-card">
          <h3 className="section-title">
            📊 {lang === 'bn' ? '২. সম্ভাব্য লাভ ও খরচের ফলাফল' : '2. Estimated Financial Return'}
          </h3>

          {/* Big Profit Hero Badge */}
          <div className="farmer-big-profit-box">
            <span className="profit-box-label">{t('net_profit_label')}</span>
            <div className={`profit-big-number ${estimatedNetProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(estimatedNetProfit, lang)}
            </div>
            <span className="profit-box-sub">
              {lang === 'bn'
                ? `(বিঘা প্রতি আনুমানিক নিট লাভ: ${formatCurrency(estimatedNetProfit / bighaCount, 'bn')})`
                : `(Estimated net profit per bigha: ${formatCurrency(estimatedNetProfit / bighaCount, 'en')})`}
            </span>
          </div>

          {/* Detailed Itemized Costs */}
          <div className="farmer-costs-breakdown">
            <h4 className="costs-subheading">
              {lang === 'bn' ? 'খরচের বিস্তারিত বিবরণ:' : 'Cost Breakdown:'}
            </h4>

            <div className="cost-row">
              <span className="cost-name">🌱 বীজ ও রাসায়নিক সার:</span>
              <strong className="cost-amount">{formatCurrency(totalCostSeedFert, lang)}</strong>
            </div>

            <div className="cost-row">
              <span className="cost-name">💧 সেচ ও ডিজেল/বিদ্যুৎ:</span>
              <strong className="cost-amount">{formatCurrency(totalCostIrrigation, lang)}</strong>
            </div>

            <div className="cost-row">
              <span className="cost-name">🚜 জমি চাষ, রোপণ ও শ্রমিক:</span>
              <strong className="cost-amount">{formatCurrency(totalCostLabor, lang)}</strong>
            </div>

            <div className="cost-row">
              <span className="cost-name">🚛 ফসল পরিবহন ও বিপণন:</span>
              <strong className="cost-amount">{formatCurrency(totalCostMarketing, lang)}</strong>
            </div>

            <div className="cost-row total-row">
              <span className="cost-name">মোট আনুমানিক খরচ:</span>
              <strong className="cost-amount">{formatCurrency(grandTotalCost, lang)}</strong>
            </div>
          </div>

          {/* Expected Revenue & Yield */}
          <div className="farmer-revenue-card">
            <div className="revenue-item">
              <span className="rev-label">সম্ভাব্য মোট ফলন:</span>
              <strong className="rev-val">
                {lang === 'bn'
                  ? `${toBengaliNumber(totalYieldMaund.toFixed(1))} মণ (${toBengaliNumber((totalYieldMaund / 25).toFixed(2))} টন)`
                  : `${totalYieldMaund.toFixed(1)} Maund (${(totalYieldMaund / 25).toFixed(2)} t)`}
              </strong>
            </div>

            <div className="revenue-item">
              <span className="rev-label">সম্ভাব্য মোট বিক্রয়মূল্য:</span>
              <strong className="rev-val">{formatCurrency(grossSales, lang)}</strong>
            </div>

            <div className="revenue-item highlight-item">
              <span className="rev-label">ব্রেক-ইভেন দাম (কেজি প্রতি):</span>
              <strong className="rev-val">
                {lang === 'bn'
                  ? `${toBengaliNumber(breakEvenPriceKg.toFixed(1))} টাকা/কেজি`
                  : `${breakEvenPriceKg.toFixed(1)} BDT/kg`}
              </strong>
              <small className="rev-sub">
                {lang === 'bn' ? '(এর কম দামে বিক্রি হলে ক্ষতি হবে)' : '(Minimum price to avoid loss)'}
              </small>
            </div>
          </div>

          {/* Scientific & Benchmark Provenance Footnote */}
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-light, #e2e8f0)', fontSize: 11.5, color: 'var(--text-muted, #64748b)', lineHeight: 1.45 }}>
            <strong>ℹ️ {lang === 'bn' ? 'উপাত্ত সূত্র ও হিসাবের ভিত্তি:' : 'Data Source & Methodology:'}</strong>{' '}
            {lang === 'bn'
              ? 'কৃষি বিপণন অধিদপ্তর (DAM) ও বিএআরআই ২০২৪-২০২৫ মৌসুমী নির্দেশিকা ভিত্তিক বেঞ্চমার্ক। নিট লাভ = সম্ভাব্য মোট বিক্রয় - সর্বমোট উপাদান ও সেচ/শ্রমিক খরচ। ব্রেক-ইভেন দর = মোট খরচ ÷ মোট ফলন (কেজি)। এটি আর্থিক নিশ্চয়তা নয়, নির্দেশনামূলক প্রাক্কলন।'
              : 'DAM & BARI 2024-2025 regional benchmark parameters. Net Profit = Gross Revenue - Total Operating & Input Costs. Break-even Price = Total Costs ÷ Total Yield (kg). Benchmark estimate for decision guidance; not a financial guarantee.'}
          </div>
        </div>
      </div>

      {/* Log Actual Harvest Outcome Card */}
      <div className="farmer-log-harvest-card">
        <div className="log-harvest-header">
          <span className="log-icon">⚖️</span>
          <div>
            <h3 className="log-title">{t('log_actual_harvest_heading')}</h3>
            <p className="log-desc">{t('log_actual_harvest_sub')}</p>
          </div>
        </div>

        <div className="log-form-grid">
          <div className="form-group-farmer">
            <label className="form-label-farmer">{t('actual_yield_input')}</label>
            <input
              type="number"
              className="input-number-farmer"
              placeholder="যেমন: ৪৫ মণ"
              value={actualYieldMaund}
              onChange={(e) => setActualYieldMaund(e.target.value)}
            />
          </div>

          <div className="form-group-farmer">
            <label className="form-label-farmer">{t('actual_price_input')}</label>
            <input
              type="number"
              className="input-number-farmer"
              placeholder="যেমন: ১০৫০ টাকা প্রতি মণ"
              value={actualPriceBdt}
              onChange={(e) => setActualPriceBdt(e.target.value)}
            />
          </div>

          <div className="form-group-farmer full-col">
            <label className="form-label-farmer">
              {lang === 'bn' ? 'বিশেষ কোনো মন্তব্য (যেমন: রোগবালাই বা অনাবৃষ্টির সমস্যা):' : 'Notes:'}
            </label>
            <input
              type="text"
              className="input-text-farmer"
              placeholder="মন্তব্য লিখুন..."
              value={actualNotes}
              onChange={(e) => setActualNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="log-actions">
          <button
            type="button"
            className="btn btn-primary btn-large"
            disabled={!actualYieldMaund || saveStatus === 'saving'}
            onClick={() => setShowConfirmModal(true)}
          >
            {saveStatus === 'saving' ? t('loading') : t('save_harvest_btn')}
          </button>

          {saveStatus === 'success' && (
            <span className="save-msg success">✅ {t('save_success')}</span>
          )}
          {saveStatus === 'error' && (
            <span className="save-msg error">❌ {t('error_occurred')}</span>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="farmer-voice-modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="farmer-confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">{t('confirm_save_title')}</h3>
            <p className="confirm-desc">
              {lang === 'bn'
                ? `আপনি "${selectedCrop}" ফসলের জন্য ${actualYieldMaund} মণ ফলন সংরক্ষণ করতে যাচ্ছেন। এটি কি নিশ্চিত?`
                : `You are about to save an actual harvest record of ${actualYieldMaund} maunds for ${selectedCrop}. Are you sure?`}
            </p>
            <div className="confirm-buttons">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveActualHarvest}
              >
                {t('confirm_yes')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                {t('confirm_no')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
