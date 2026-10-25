import React, { useState, useEffect, useCallback } from 'react';
import { formatNumber as defaultFormatNumber } from './marketUtils.js';
import { request as defaultRequest } from './apiClient.js';

function normalizeCrop(c) {
  if (!c) return null;
  const name = c.name || c.crop || 'Unknown Crop';
  const family = c.botanical_family || c.family || '';
  const season = c.season || c.primary_season || 'All seasons';
  const yieldKgHa = c.expected_yield_kg_ha != null
    ? c.expected_yield_kg_ha
    : (c.expected_yield_t_ha != null ? Math.round(c.expected_yield_t_ha * 1000) : null);
  const marginBdtHa = c.net_margin_bdt_ha != null
    ? c.net_margin_bdt_ha
    : (c.gross_margin_bdt_ha != null ? c.gross_margin_bdt_ha : null);
  const phMin = c.soil_ph_min ?? c.min_ph ?? '5.0';
  const phMax = c.soil_ph_max ?? c.max_ph ?? '7.5';
  const tempMin = c.temperature_min_c ?? c.min_temperature_c ?? '15';
  const tempMax = c.temperature_max_c ?? c.max_temperature_c ?? '35';
  const source = c.data_source || c.authority_source || 'BRRI / BARI';

  return {
    ...c,
    name,
    botanical_family: family,
    season,
    expected_yield_kg_ha: yieldKgHa,
    net_margin_bdt_ha: marginBdtHa,
    soil_ph_min: phMin,
    soil_ph_max: phMax,
    temperature_min_c: tempMin,
    temperature_max_c: tempMax,
    data_source: source,
  };
}

export function CropCatalogView({
  request: propRequest,
  formatNumber: propFormatNumber,
  onBack,
  onNavigateTab,
  lang = 'bn',
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const formatNumber = typeof propFormatNumber === 'function' ? propFormatNumber : defaultFormatNumber;

  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request('/api/crops/catalog');
      if (res && res.status === 'ok') {
        const normalizedCrops = (res.crops || []).map(normalizeCrop);
        setCatalog({ ...res, crops: normalizedCrops });
        if (normalizedCrops.length > 0) setSelectedCrop(normalizedCrops[0]);
      } else {
        throw new Error('Failed to load crop catalog.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching crop database.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const crops = catalog?.crops || [];

  const filteredCrops = crops.filter(c => {
    const cropName = c.name || c.crop || '';
    const family = c.botanical_family || c.family || '';
    const matchesCat = filterCat === 'All'
      || (filterCat === 'Legumes' && c.is_legume)
      || (filterCat === 'Cereals' && family.includes('Poaceae'))
      || (filterCat === 'Oilseeds' && ['Brassicaceae', 'Asteraceae', 'Pedaliaceae'].some(f => family.includes(f)))
      || (filterCat === 'Vegetables' && family.includes('Solanaceae'))
      || (filterCat === 'Fibers' && family.includes('Malvaceae'));
    const matchesSearch = !searchQuery
      || cropName.toLowerCase().includes(searchQuery.toLowerCase())
      || (c.bengali_name && c.bengali_name.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="crop-catalog-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>🌾</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Bangladesh Crop Knowledge Database &amp; Data Provenance
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P1 AGRONOMIC CATALOG ({crops.length} SPECIES)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              Transparent parameters utilized by FieldShift's MILP solver and RL policy. 
              Agronomic baselines are sourced from the <strong>Bangladesh Agricultural Research Institute (BARI)</strong>, 
              <strong>Bangladesh Rice Research Institute (BRRI)</strong>, and <strong>BBS Agricultural Statistics</strong>.
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          marginTop: '20px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Cereals', 'Legumes', 'Oilseeds', 'Vegetables', 'Fibers'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filterCat === cat ? '1px solid #f59e0b' : '1px solid #1e293b',
                  background: filterCat === cat ? 'rgba(245, 158, 11, 0.2)' : '#0e1318',
                  color: filterCat === cat ? '#f59e0b' : '#94a3b8',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ width: '260px' }}>
            <input
              type="text"
              placeholder="Search crop or Bengali name..."
              className="input-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: '#0e1318', border: '1px solid #1e293b', color: '#f8fafc', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8', padding: '20px' }}>Loading agronomic database...</div>}
      {error && (
        <div style={{
          color: '#ef4444',
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 10,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchCatalog}
            style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', background: '#334155', color: '#fff', border: 'none', borderRadius: 6 }}
          >
            🔄 Retry Catalog
          </button>
        </div>
      )}

      {/* Grid of Crops */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {filteredCrops.map(c => {
          const isSelected = selectedCrop?.name === c.name;
          return (
            <div
              key={c.name}
              onClick={() => setSelectedCrop(c)}
              style={{
                background: isSelected ? 'rgba(245, 158, 11, 0.08)' : '#131920',
                border: isSelected ? '1.5px solid #f59e0b' : '1px solid #1e293b',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                      {c.name}
                    </h4>
                    <span style={{ fontSize: '13px', color: '#f59e0b' }}>
                      ({c.bengali_name})
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {c.botanical_family} • {c.season}
                  </span>
                </div>
                {c.is_legume && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(0, 223, 129, 0.15)',
                    color: '#00df81',
                    fontWeight: 700,
                  }}>
                    BNF LEGUME
                  </span>
                )}
              </div>

              {/* Agronomic specs grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Duration:</span>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.duration_days} days</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Water Demand:</span>
                  <div style={{ color: '#38bdf8', fontWeight: 600 }}>{c.water_requirement_mm} mm</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Expected Yield:</span>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{formatNumber(c.expected_yield_kg_ha, 0)} kg/ha</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Net Cash Margin:</span>
                  <div style={{ color: '#00df81', fontWeight: 700 }}>BDT {formatNumber(c.net_margin_bdt_ha, 0)}/ha</div>
                </div>
              </div>

              {/* Ecological Tolerances */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>pH: {c.soil_ph_min} – {c.soil_ph_max}</span>
                <span>Temp: {c.temperature_min_c}°C – {c.temperature_max_c}°C</span>
                <span>Source: {c.data_source}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Authoritative Sources Registry Table */}
      {catalog?.sources && (
        <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📚</span> Authoritative Agronomic References &amp; Data Provenance
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Institution / Source</th>
                  <th style={{ padding: '8px 10px' }}>Title &amp; Publication Reference</th>
                  <th style={{ padding: '8px 10px' }}>Publication Year</th>
                  <th style={{ padding: '8px 10px' }}>Geographic Relevance</th>
                  <th style={{ padding: '8px 10px' }}>Data Provenance Role</th>
                </tr>
              </thead>
              <tbody>
                {catalog.sources.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#f59e0b' }}>{s.source_code}</td>
                    <td style={{ padding: '10px', color: '#e2e8f0' }}>{s.title}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{s.year}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{s.geographic_relevance}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{s.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
