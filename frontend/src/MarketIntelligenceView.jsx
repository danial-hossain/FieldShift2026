import React, { useState, useEffect, useMemo } from 'react';
import { formatNumber } from './marketUtils.js';
import { request, API_BASE } from './apiClient.js';
import { Card, CardHeader, Stat, Pill, Button } from './ui/index.js';

export function MarketIntelligenceView({ activeField, onNavigateTab, lang = 'bn' }) {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropName, setSelectedCropName] = useState('Rice');
  const [priceUnit, setPriceUnit] = useState('bdt_kg'); // 'bdt_kg', 'bdt_maund', 'bdt_ton'

  // Profitability calculator state
  const [calcAreaHa, setCalcAreaHa] = useState(activeField?.area_ha || 1.0);
  const [calcYield, setCalcYield] = useState(4.0);
  const [calcPrice, setCalcPrice] = useState(26000.0); // BDT/ton
  const [calcProdCost, setCalcProdCost] = useState(80000.0);
  const [calcIrrigCost, setCalcIrrigCost] = useState(5000.0);
  const [calcMktgCost, setCalcMktgCost] = useState(2000.0);
  const [profitResult, setProfitResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Sync field area when activeField changes
  useEffect(() => {
    if (activeField?.area_ha && activeField.area_ha > 0) {
      setCalcAreaHa(Number(activeField.area_ha));
    }
  }, [activeField]);

  // Fetch market overview
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const json = await request('/api/market/overview');
        if (!ignore) {
          setMarketData(json);
          if (json.crops && json.crops.length > 0) {
            const initial = json.crops.find(c => c.crop === 'Rice') || json.crops[0];
            setSelectedCropName(initial.crop);
            setCalcYield(initial.default_yield_t_ha);
            setCalcPrice(initial.farmgate_bdt_ton);
            setCalcProdCost(initial.default_cost_bdt_ha);
          }
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, []);

  // When selected crop changes in UI, update calculator defaults
  const handleSelectCrop = (cropItem) => {
    setSelectedCropName(cropItem.crop);
    setCalcYield(cropItem.default_yield_t_ha);
    setCalcPrice(cropItem.farmgate_bdt_ton);
    setCalcProdCost(cropItem.default_cost_bdt_ha);
  };

  // Run profitability calculation
  useEffect(() => {
    let ignore = false;
    async function calculate() {
      if (!selectedCropName) return;
      setCalcLoading(true);
      try {
        const json = await request('/api/market/profitability', {
          method: 'POST',
          body: JSON.stringify({
            crop: selectedCropName,
            area_ha: calcAreaHa,
            expected_yield_t_ha: calcYield,
            farmgate_price_bdt_t: calcPrice,
            production_cost_bdt_ha: calcProdCost,
            irrigation_cost_bdt_ha: calcIrrigCost,
            marketing_cost_bdt_ha: calcMktgCost,
          }),
        });
        if (!ignore) setProfitResult(json);
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setCalcLoading(false);
      }
    }
    calculate();
    return () => { ignore = true; };
  }, [selectedCropName, calcAreaHa, calcYield, calcPrice, calcProdCost, calcIrrigCost, calcMktgCost]);

  const filteredCrops = useMemo(() => {
    if (!marketData?.crops) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return marketData.crops;
    return marketData.crops.filter(c =>
      (typeof c?.crop === 'string' && c.crop.toLowerCase().includes(q)) ||
      (typeof c?.name_bn === 'string' && c.name_bn.toLowerCase().includes(q))
    );
  }, [marketData, searchQuery]);

  const currentCropObj = useMemo(() => {
    return marketData?.crops?.find(c => c.crop === selectedCropName) || null;
  }, [marketData, selectedCropName]);

  const getPriceVal = (crop, type) => {
    if (priceUnit === 'bdt_kg') return crop[`${type}_bdt_kg`];
    if (priceUnit === 'bdt_maund') return crop[`${type}_bdt_maund`];
    return crop[`${type}_bdt_ton`];
  };

  return (
    <div className="market-intelligence-container" style={{ padding: '8px 0 32px 0', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <Card variant="glass" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>💰</span>
              <Pill tone="sun">MARKET BENCHMARKS</Pill>
              <Pill tone="neutral">Reference prices (static benchmark, not live)</Pill>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'bn' ? 'বাজার দর ও সম্ভাব্য মুনাফা বিশ্লেষণ' : 'Market Intelligence & Profitability'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'রেফারেন্স মূল্য (স্থির তালিকা, লাইভ নয়) — সরকারি কৃষি বিপণন অধিদপ্তর (DAM) ও বিএআরআই বেঞ্চমার্ক ভিত্তিক প্রাক্কলন।'
                : 'Reference prices (static benchmark, not live) / রেফারেন্স মূল্য (স্থির তালিকা, লাইভ নয়) — Transparent price benchmarks, authentic source citations, and conditional gross margin projections.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={`${API_BASE}/api/market/export`}
              download
              style={{ textDecoration: 'none' }}
            >
              <Button variant="secondary" size="sm">
                <span>📥</span> {lang === 'bn' ? 'দর তালিকা ডাউনলোড (CSV)' : 'Export CSV'}
              </Button>
            </a>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab && onNavigateTab('optimization')}
            >
              <span>🌱</span> {lang === 'bn' ? 'পরিকল্পনায় প্রয়োগ করুন' : 'Apply Prices in Optimizer'}
            </Button>
          </div>
        </div>

        {/* Honest Demand Signal Banner (Scientific transparency) */}
        <div style={{
          background: 'rgba(242, 193, 78, 0.08)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '12px 16px',
          marginTop: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>ℹ️</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                {lang === 'bn' ? 'বাজার চাহিদা অবস্থা:' : 'Market Demand Signal Status:'}
              </strong>
              <Pill tone="neutral">
                {lang === 'bn' ? 'চাহিদা সম্পর্কিত তথ্য উন্মুক্ত নয়' : 'Demand data unavailable'}
              </Pill>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {lang === 'bn'
                ? 'কৃষি বিপণন অধিদপ্তর (DAM) স্থানীয় হাটের লেনদেন দর সংগ্রহ করে, কিন্তু দৈনিক শোষণ বা স্থিতিস্থাপকতার উন্মুক্ত এপিআই নেই। ফিল্ডশিফ্ট কোনো কাল্পনিক ক্রেতা সংখ্যা বা অনুমাননির্ভর স্কোর তৈরি করে না।'
                : 'Official agricultural agencies in Bangladesh (DAM, TCB, BBS) collect spot transaction prices at terminal and district haats, but do not provide an open public API for daily volume absorption. FieldShift strictly avoids fabricating speculative demand scores.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Grid: Left Catalog, Right Profitability Calculator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Crop Price Catalog */}
        <Card variant="glass">
          <CardHeader
            icon="🇧🇩"
            title={lang === 'bn' ? 'ফসলের রেফারেন্স দর তালিকা' : 'Crop Price Catalog'}
            subtitle={lang === 'bn' ? 'রেফারেন্স মূল্য (স্থির তালিকা, লাইভ নয়)' : 'Reference prices (static benchmark, not live)'}
            action={
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', padding: 3, borderRadius: 8 }}>
                {['bdt_kg', 'bdt_maund', 'bdt_ton'].map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPriceUnit(u)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: priceUnit === u ? 600 : 400,
                      background: priceUnit === u ? 'var(--accent)' : 'transparent',
                      color: priceUnit === u ? 'var(--bg-deep)' : 'var(--text-2)',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {u === 'bdt_kg' ? 'BDT/kg' : u === 'bdt_maund' ? (lang === 'bn' ? 'মন (৪০কেজি)' : 'Maund (40kg)') : (lang === 'bn' ? 'টন (১০০০কেজি)' : 'Ton (1000kg)')}
                  </button>
                ))}
              </div>
            }
          />

          {/* Search bar */}
          <div style={{ margin: '14px 0' }}>
            <input
              type="text"
              placeholder={lang === 'bn' ? 'ফসলের নাম দিয়ে খুঁজুন (যেমন ধান, আলু, গম, সরিষা)...' : 'Search crop by name (e.g. Rice, Lentil, Potato)...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid var(--line)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              {lang === 'bn' ? 'বাজার দর লোড হচ্ছে...' : 'Loading market prices...'}
            </div>
          ) : error ? (
            <div style={{ padding: 16, color: 'var(--alert)', background: 'rgba(239, 122, 90, 0.12)', borderRadius: 10 }}>
              {error}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--text-3)' }}>
                    <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'ফসল' : 'Crop'}</th>
                    <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'খামার প্রান্ত' : 'Farmgate'}</th>
                    <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'পাইকারি' : 'Wholesale'}</th>
                    <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'খুচরা' : 'Retail'}</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>{lang === 'bn' ? 'পদক্ষেপ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrops.map(c => {
                    const isSelected = c.crop === selectedCropName;
                    return (
                      <tr
                        key={c.crop}
                        onClick={() => handleSelectCrop(c)}
                        style={{
                          borderBottom: '1px solid var(--line)',
                          background: isSelected ? 'rgba(197, 232, 108, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.crop}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.name_bn}</div>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--leaf)', fontWeight: 600 }}>
                          {formatNumber(getPriceVal(c, 'farmgate'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--water)' }}>
                          {formatNumber(getPriceVal(c, 'wholesale'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-2)' }}>
                          {formatNumber(getPriceVal(c, 'retail'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                          <Button
                            variant={isSelected ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleSelectCrop(c); }}
                          >
                            {isSelected ? (lang === 'bn' ? 'নির্বাচিত' : 'Selected') : (lang === 'bn' ? 'হিসাব' : 'Analyze')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Citation Footer */}
          {currentCropObj && (
            <Card variant="glass-strong" style={{ marginTop: 16, padding: '12px 14px', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ color: 'var(--text)' }}>Source Authority:</strong>
                <a href={currentCropObj.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--water)', textDecoration: 'none' }}>
                  {currentCropObj.primary_source} ↗
                </a>
              </div>
              <div style={{ color: 'var(--text-2)' }}>
                <strong>Report Date:</strong> {currentCropObj.report_date} | <strong>Classification:</strong> {currentCropObj.provenance_classification}
              </div>
              <div style={{ marginTop: 4, color: 'var(--text-3)' }}><em>{currentCropObj.notes}</em></div>
            </Card>
          )}
        </Card>

        {/* Right Column: Crop Profitability Calculator */}
        <Card variant="glass">
          <CardHeader
            icon="📊"
            title={`${lang === 'bn' ? 'মুনাফা ক্যালকুলেটর' : 'Crop Profitability Calculator'} (${selectedCropName})`}
            subtitle={lang === 'bn' ? 'আনুমানিক উৎপাদন খরচ ও সম্ভাব্য লাভ' : 'Estimated production costs and potential returns'}
            action={
              <Pill tone="water">
                {activeField?.name || (lang === 'bn' ? 'বগুড়া পরীক্ষামূলক খামার' : 'Bogura Demo Field')}
              </Pill>
            }
          />

          {/* Inputs Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '14px 0' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'জমির পরিমাণ (হেক্টর)' : 'Cultivated Area (Hectares)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={calcAreaHa}
                onChange={e => setCalcAreaHa(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'সম্ভাব্য ফলন (টন/হেক্টর)' : 'Expected Yield (t / ha)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={calcYield}
                onChange={e => setCalcYield(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'খামার প্রান্ত দর (টাকা/টন)' : 'Farmgate Price (BDT / ton)'}
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                value={calcPrice}
                onChange={e => setCalcPrice(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'উপাদান খরচ (টাকা/হেক্টর)' : 'Production Cost (BDT / ha)'}
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                value={calcProdCost}
                onChange={e => setCalcProdCost(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'সেচ খরচ (টাকা/হেক্টর)' : 'Irrigation Cost (BDT / ha)'}
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={calcIrrigCost}
                onChange={e => setCalcIrrigCost(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
                {lang === 'bn' ? 'পরিবহন/শ্রমিক (টাকা/হেক্টর)' : 'Harvest/Transport (BDT / ha)'}
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={calcMktgCost}
                onChange={e => setCalcMktgCost(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Results Summary Cards */}
          {profitResult && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                <Stat
                  label={lang === 'bn' ? 'মোট বিক্রয়মূল্য' : 'Gross Revenue'}
                  value={`${formatNumber(profitResult.results.gross_revenue_bdt, 0)} BDT`}
                  sub={`(${formatNumber(profitResult.results.gross_revenue_per_ha, 0)} BDT/ha)`}
                  tone="leaf"
                />

                <Stat
                  label={lang === 'bn' ? 'সর্বমোট খরচ' : 'Total Costs'}
                  value={`${formatNumber(profitResult.results.cost_breakdown.total_cost_bdt, 0)} BDT`}
                  sub={`(${formatNumber(profitResult.results.cost_breakdown.total_cost_per_ha, 0)} BDT/ha)`}
                  tone="alert"
                />

                <Stat
                  label={lang === 'bn' ? 'সম্ভাব্য নিট লাভ' : 'Net Return'}
                  value={`${formatNumber(profitResult.results.estimated_net_return_bdt, 0)} BDT`}
                  sub={`Break-even: ${formatNumber(profitResult.results.breakeven_selling_price_bdt_kg, 1)} BDT/kg`}
                  tone={profitResult.results.estimated_net_return_bdt >= 0 ? 'accent' : 'alert'}
                />
              </div>

              {/* Three-Point Scenario Projections */}
              <Card variant="glass-strong" style={{ padding: 14 }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
                  📈 {lang === 'bn' ? 'শর্তসাপেক্ষ দৃশ্যপট (Three-Point Scenarios)' : 'Three-Point Conditional Scenarios'}
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 12 }}>
                  <div style={{ padding: 10, background: 'rgba(239, 122, 90, 0.08)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{lang === 'bn' ? 'মন্দা (-২০% দর, -১৫% ফলন)' : 'Downside (-20% Price, -15% Yield)'}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: profitResult.scenarios.downside.net_return_bdt >= 0 ? 'var(--leaf)' : 'var(--alert)', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.downside.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatNumber(profitResult.scenarios.downside.net_return_per_ha, 0)} BDT/ha</div>
                  </div>

                  <div style={{ padding: 10, background: 'rgba(108, 196, 224, 0.08)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{lang === 'bn' ? 'স্বাভাবিক (প্রত্যাশিত)' : 'Baseline (Expected)'}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--water)', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.baseline.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatNumber(profitResult.scenarios.baseline.net_return_per_ha, 0)} BDT/ha</div>
                  </div>

                  <div style={{ padding: 10, background: 'rgba(197, 232, 108, 0.08)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{lang === 'bn' ? 'উচ্চ ফলন (+১৫% দর, +১০% ফলন)' : 'Optimistic (+15% Price, +10% Yield)'}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--leaf)', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.optimistic.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatNumber(profitResult.scenarios.optimistic.net_return_per_ha, 0)} BDT/ha</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentCropObj) handleSelectCrop(currentCropObj);
              }}
            >
              {lang === 'bn' ? 'ডিফল্ট মান পুনরুদ্ধার' : 'Reset to Benchmark Defaults'}
            </Button>
            <Button
              variant="primary"
              onClick={() => onNavigateTab && onNavigateTab('optimization')}
            >
              {lang === 'bn' ? 'এই ফসল দিয়ে আবর্তন অপ্টিমাইজ করুন' : 'Run Rotation Optimizer with this Crop'}
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}

export default MarketIntelligenceView;
