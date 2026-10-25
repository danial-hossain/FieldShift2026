import React, { useState, useEffect, useMemo } from 'react';
import { formatNumber } from './main.jsx';
import { request, API_BASE } from './apiClient.js';

export function MarketIntelligenceView({ activeField, onNavigateTab }) {
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
          // Set initial crop if present
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
      c.crop.toLowerCase().includes(q) ||
      (c.name_bn && c.name_bn.toLowerCase().includes(q))
    );
  }, [marketData, searchQuery]);

  const currentCropObj = useMemo(() => {
    return marketData?.crops?.find(c => c.crop === selectedCropName) || null;
  }, [marketData, selectedCropName]);

  const unitLabel = priceUnit === 'bdt_kg' ? 'BDT / kg' : priceUnit === 'bdt_maund' ? 'BDT / maund (মন)' : 'BDT / ton (টন)';

  const getPriceVal = (crop, type) => {
    if (priceUnit === 'bdt_kg') return crop[`${type}_bdt_kg`];
    if (priceUnit === 'bdt_maund') return crop[`${type}_bdt_maund`];
    return crop[`${type}_bdt_ton`];
  };

  return (
    <div className="market-intelligence-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>💰</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Market Intelligence &amp; Profitability
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted, #64748b)' }}>
            বাজারদর ও লাভ বিশ্লেষণ — Transparent price benchmarks, authentic source citations, and conditional gross margin projections.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href={`${API_BASE}/api/market/export`}
            download
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, textDecoration: 'none' }}
          >
            <span>📥</span> Export Price Catalog (CSV)
          </a>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateTab && onNavigateTab('optimization')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
          >
            <span>🌱</span> Apply Prices in Optimizer
          </button>
        </div>
      </div>

      {/* Honest Demand Signal Banner (Scientific transparency) */}
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
        <span style={{ fontSize: 24, marginTop: 2 }}>ℹ️</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <strong style={{ fontSize: 14, color: 'var(--text-main, #0f172a)' }}>
              Market Demand Signal Status:
            </strong>
            <span style={{
              background: '#f1f5f9',
              color: '#475569',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1'
            }}>
              Demand data unavailable (চাহিদা সম্পর্কিত তথ্য উন্মুক্ত নয়)
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
            Official agricultural agencies in Bangladesh (DAM, TCB, BBS) collect spot transaction prices at terminal and district haats, but do not provide an open public API for daily volume absorption or consumer elasticity.
            <strong> FieldShift strictly avoids fabricating speculative demand scores or fictitious buyer counts.</strong>
          </p>
        </div>
      </div>

      {/* Main Grid: Left Catalog, Right Profitability Calculator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Crop Price Catalog */}
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              🇧🇩 Bangladesh Crop Price Catalog
            </h2>
            {/* Unit selector pills */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle, #f1f5f9)', padding: 3, borderRadius: 8 }}>
              {['bdt_kg', 'bdt_maund', 'bdt_ton'].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPriceUnit(u)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: priceUnit === u ? 700 : 500,
                    background: priceUnit === u ? 'var(--bg-card, #ffffff)' : 'transparent',
                    color: priceUnit === u ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    boxShadow: priceUnit === u ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {u === 'bdt_kg' ? 'BDT/kg' : u === 'bdt_maund' ? 'মন (40kg)' : 'টন (1000kg)'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search crop by name (e.g. Rice, ধান, Lentil, আলু)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading market prices...</div>
          ) : error ? (
            <div style={{ padding: 20, color: '#dc2626', background: '#fee2e2', borderRadius: 8 }}>{error}</div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                    <th style={{ padding: '8px 10px' }}>Crop</th>
                    <th style={{ padding: '8px 10px' }}>Farmgate</th>
                    <th style={{ padding: '8px 10px' }}>Wholesale</th>
                    <th style={{ padding: '8px 10px' }}>Retail</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
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
                          borderBottom: '1px solid var(--border-color, #e2e8f0)',
                          background: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{c.crop}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{c.name_bn}</div>
                        </td>
                        <td style={{ padding: '10px 10px', color: '#16a34a', fontWeight: 600 }}>
                          {formatNumber(getPriceVal(c, 'farmgate'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', color: '#0284c7' }}>
                          {formatNumber(getPriceVal(c, 'wholesale'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', color: '#64748b' }}>
                          {formatNumber(getPriceVal(c, 'retail'), 1)}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectCrop(c); }}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              borderRadius: 4,
                              border: isSelected ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              background: isSelected ? '#16a34a' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#334155',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {isSelected ? 'Selected' : 'Analyze'}
                          </button>
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
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 8, fontSize: 12, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>Source Authority:</strong>
                <a href={currentCropObj.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7' }}>
                  {currentCropObj.primary_source} ↗
                </a>
              </div>
              <div><strong>Report Date:</strong> {currentCropObj.report_date} | <strong>Classification:</strong> {currentCropObj.provenance_classification}</div>
              <div style={{ marginTop: 4, color: '#64748b' }}><em>{currentCropObj.notes}</em></div>
            </div>
          )}
        </div>

        {/* Right Column: Crop Profitability Calculator */}
        <div className="card" style={{ padding: 20, borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              📊 Crop Profitability Calculator ({selectedCropName})
            </h2>
            <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
              Active Parcel: {activeField?.name || 'Standard 1 ha'}
            </span>
          </div>

          {/* Inputs Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Cultivated Area (Hectares)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={calcAreaHa}
                onChange={e => setCalcAreaHa(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Expected Yield (t / ha)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={calcYield}
                onChange={e => setCalcYield(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Farmgate Price (BDT / ton)
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                value={calcPrice}
                onChange={e => setCalcPrice(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Production Cost (BDT / ha)
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                value={calcProdCost}
                onChange={e => setCalcProdCost(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Irrigation Cost (BDT / ha)
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={calcIrrigCost}
                onChange={e => setCalcIrrigCost(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #475569)', marginBottom: 4 }}>
                Harvest/Transport (BDT / ha)
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={calcMktgCost}
                onChange={e => setCalcMktgCost(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Results Summary Cards */}
          {profitResult && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>GROSS REVENUE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                    {formatNumber(profitResult.results.gross_revenue_bdt, 0)} BDT
                  </div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                    ({formatNumber(profitResult.results.gross_revenue_per_ha, 0)} BDT/ha)
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b' }}>TOTAL COSTS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>
                    {formatNumber(profitResult.results.cost_breakdown.total_cost_bdt, 0)} BDT
                  </div>
                  <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                    ({formatNumber(profitResult.results.cost_breakdown.total_cost_per_ha, 0)} BDT/ha)
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>NET RETURN</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
                    {formatNumber(profitResult.results.estimated_net_return_bdt, 0)} BDT
                  </div>
                  <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>
                    Break-even: {formatNumber(profitResult.results.breakeven_selling_price_bdt_kg, 1)} BDT/kg
                  </div>
                </div>
              </div>

              {/* Three-Point Scenario Projections */}
              <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: 14, background: 'var(--bg-subtle, #f8fafc)' }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--text-main, #0f172a)' }}>
                  📈 Three-Point Conditional Scenarios (শর্তসাপেক্ষ দৃশ্যপট)
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 12 }}>
                  <div style={{ padding: 10, background: '#ffffff', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 700, color: '#475569' }}>Downside (-20% Price, -15% Yield)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: profitResult.scenarios.downside.net_return_bdt >= 0 ? '#15803d' : '#b91c1c', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.downside.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatNumber(profitResult.scenarios.downside.net_return_per_ha, 0)} BDT/ha</div>
                  </div>

                  <div style={{ padding: 10, background: '#ffffff', borderRadius: 6, border: '1px solid #93c5fd' }}>
                    <div style={{ fontWeight: 700, color: '#1e40af' }}>Baseline (Expected)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.baseline.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatNumber(profitResult.scenarios.baseline.net_return_per_ha, 0)} BDT/ha</div>
                  </div>

                  <div style={{ padding: 10, background: '#ffffff', borderRadius: 6, border: '1px solid #86efac' }}>
                    <div style={{ fontWeight: 700, color: '#166534' }}>Optimistic (+15% Price, +10% Yield)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                      {formatNumber(profitResult.scenarios.optimistic.net_return_bdt, 0)} BDT
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatNumber(profitResult.scenarios.optimistic.net_return_per_ha, 0)} BDT/ha</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (currentCropObj) handleSelectCrop(currentCropObj);
              }}
            >
              Reset to Benchmark Defaults
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateTab && onNavigateTab('optimization')}
            >
              Run Rotation Optimizer with this Crop
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default MarketIntelligenceView;
