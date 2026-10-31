// frontend/src/NasaPlantingAdvisoryView.jsx
// Mobile-First NASA Planting-Window Advisory for Bangladeshi Rice
// Deterministic Agro-Meteorological Evidence from NASA POWER Daily Observations (2001–2025)

import React, { useState, useEffect, useMemo } from 'react';
import { request } from './apiClient.js';
import { RealFarmCanvas3D } from './RealFarmCanvas3D.jsx';
import { Card, CardHeader, Stat, Button, Pill, DataSourceTag, PageHeader } from './ui/index.js';
import { evidenceBadge, doyToDate, toBanglaDigits } from './advisoryBadges.js';

export { evidenceBadge };

export function NasaPlantingAdvisoryView({
  defaultDistrict = 'rajshahi',
  defaultCrop = 'aman',
  lang = 'bn',
  onNavigate,
  activeField = null,
}) {
  const initialDistrict = (activeField?.district || defaultDistrict || 'rajshahi').toLowerCase();
  const [district, setDistrict] = useState(initialDistrict);
  const [crop, setCrop] = useState(defaultCrop);
  const [thresholdMm, setThresholdMm] = useState(25.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advisoryData, setAdvisoryData] = useState(null);
  const [copiedSms, setCopiedSms] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [show3dWorkbench, setShow3dWorkbench] = useState(false);
  const [viewMode3d, setViewMode3d] = useState('3d');

  useEffect(() => {
    if (activeField?.district && typeof activeField.district === 'string') {
      const d = activeField.district.trim().toLowerCase();
      if (d) setDistrict(d);
    }
  }, [activeField?.district]);

  useEffect(() => {
    let isCancelled = false;
    async function fetchAdvisory() {
      setLoading(true);
      setError(null);
      const queryDistrict = (district && district.trim()) ? district.trim().toLowerCase() : (activeField?.district || 'rajshahi').toLowerCase();
      try {
        const queryParams = new URLSearchParams({
          district: queryDistrict,
          crop,
          threshold_mm: String(thresholdMm),
          dry_spell_window: '21',
          dry_spell_max: '7',
          lang,
        });
        const data = await request(`/api/advisory?${queryParams.toString()}`);
        if (!isCancelled) {
          setAdvisoryData(data);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load NASA planting advisory.');
          setAdvisoryData(null);
          setLoading(false);
        }
      }
    }
    fetchAdvisory();
    return () => { isCancelled = true; };
  }, [district, crop, thresholdMm, lang, activeField?.district]);

  const districtsList = [
    { id: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi', icon: '🏛️' },
    { id: 'bogura', nameBn: 'বগুড়া', nameEn: 'Bogura', icon: '🌾' },
    { id: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur', icon: '🌱' },
    { id: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', icon: '🌿' },
    { id: 'jashore', nameBn: 'যশোর', nameEn: 'Jashore', icon: '🌻' },
    { id: 'cumilla', nameBn: 'কুমিল্লা', nameEn: 'Cumilla', icon: '🚜' },
  ];

  const cropsList = [
    { id: 'aman', nameBn: 'আমন ধান', nameEn: 'Aman Rice', season: 'Kharif-2' },
    { id: 'boro', nameBn: 'বোরো ধান', nameEn: 'Boro Rice', season: 'Rabi' },
    { id: 'aus', nameBn: 'আউশ ধান', nameEn: 'Aus Rice', season: 'Kharif-1' },
  ];

  const handleCopySms = () => {
    if (!advisoryData?.recommendation?.bangla_sms) return;
    navigator.clipboard.writeText(advisoryData.recommendation.bangla_sms);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const rec = advisoryData?.recommendation;
  const comp = advisoryData?.comparison;
  const p1 = advisoryData?.period_1;
  const p2 = advisoryData?.period_2;
  const gdd = advisoryData?.gdd_context;
  const prov = advisoryData?.provenance;
  const sens = advisoryData?.sensitivity || [];

  const headline = lang === 'bn' ? rec?.bangla_headline : rec?.english_headline;
  const warningText = lang === 'bn'
    ? (comp?.data_warning_bn || rec?.data_warning_bn)
    : (comp?.data_warning_en || rec?.data_warning_en);

  // Two-period onset series for distribution strip plot
  const s1 = useMemo(() => (p1?.series || []).filter(v => v != null && v > 0), [p1]);
  const s2 = useMemo(() => (p2?.series || []).filter(v => v != null && v > 0), [p2]);
  const allDoys = useMemo(() => [...s1, ...s2], [s1, s2]);
  const minDoy = allDoys.length ? Math.min(...allDoys) - 5 : 150;
  const maxDoy = allDoys.length ? Math.max(...allDoys) + 5 : 220;
  const doyRange = maxDoy - minDoy || 1;

  return (
    <div className="nasa-advisory-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <PageHeader
        eyebrow={lang === 'bn' ? 'নাসা এগ্রো-মেটিওরোলজি' : 'NASA Agro-Meteorology'}
        title={lang === 'bn' ? 'নাসা ধান রোপণ উপদেষ্টা ২০২৬' : 'NASA Planting Window Advisory 2026'}
        subtitle={lang === 'bn' ? '২৫ বছরের নাসা পাওয়ার পর্যবেক্ষণ (২০০১–২০২৫) ও বৃষ্টিপাত অনসেট বিশ্লেষণ' : '25-Year NASA POWER daily reanalysis & Mann-Whitney U test'}
        actions={
          <DataSourceTag source="NASA POWER" mode={prov?.data_mode || 'cache'} period="2001-2025" />
        }
      />

      {/* District & Crop Selector Row */}
      <Card variant="glass" style={{ padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Districts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
              {lang === 'bn' ? 'জেলা:' : 'District:'}
            </span>
            {districtsList.map(d => {
              const isSelected = district === d.id;
              return (
                <Button
                  key={d.id}
                  variant={isSelected ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setDistrict(d.id)}
                >
                  <span>{d.icon}</span>
                  <span>{lang === 'bn' ? d.nameBn : d.nameEn}</span>
                </Button>
              );
            })}
          </div>

          {/* Crops */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
              {lang === 'bn' ? 'ফসল:' : 'Crop:'}
            </span>
            {cropsList.map(c => {
              const isSelected = crop === c.id;
              return (
                <Button
                  key={c.id}
                  variant={isSelected ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setCrop(c.id)}
                >
                  🌾 {lang === 'bn' ? c.nameBn : c.nameEn}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 1. HERO ADVISORY CARD */}
      <Card variant="glass-strong" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>🛰️🌾</span>
            {(() => {
              const badge = evidenceBadge(rec, comp, advisoryData?.status);
              return (
                <Pill tone={badge.tone}>
                  {lang === 'bn' ? badge.bn : badge.en}
                </Pill>
              );
            })()}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {district.toUpperCase()} · {crop.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', color: 'var(--text-3)' }}>
            {lang === 'bn' ? 'নাসা জলবায়ু উপাত্ত বিশ্লেষণ করা হচ্ছে...' : 'Analyzing 25-Year NASA Climate Telemetry...'}
          </div>
        ) : error ? (
          <div style={{ color: 'var(--alert)', padding: '12px 0' }}>{error}</div>
        ) : (
          <div>
            {warningText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(242, 193, 78, 0.12)', border: '1px solid var(--sun)', borderRadius: 10, color: 'var(--sun)', marginBottom: 16 }}>
                <span>⚠️</span>
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>{warningText}</span>
              </div>
            )}

            <h1 style={{ fontSize: 24, lineHeight: 1.6, margin: '0 0 12px 0', color: 'var(--text)', fontWeight: 600, fontFamily: 'Hind Siliguri, sans-serif' }}>
              {headline}
            </h1>

            {advisoryData?.status !== 'not_applicable' && rec?.status !== 'not_applicable' && (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--text-2)', marginTop: 8 }}>
                <div>
                  <strong style={{ color: 'var(--leaf)' }}>{lang === 'bn' ? 'বীজতলা রোপণ:' : 'Nursery Sowing:'} </strong>
                  {lang === 'bn' ? rec?.suggested_nursery_window_bn : rec?.suggested_nursery_window_en}
                </div>
                <div>
                  <strong style={{ color: 'var(--water)' }}>{lang === 'bn' ? 'চারা রোপণ:' : 'Transplanting:'} </strong>
                  {lang === 'bn' ? rec?.suggested_transplant_window_bn : rec?.suggested_transplant_window_en}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* SMS Preview Card */}
      {rec?.bangla_sms && (
        <Card variant="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                {lang === 'bn' ? 'মোবাইল এসএমএস সারসংক্ষেপ (<১৬০ অক্ষর)' : 'Mobile SMS Summary (<160 chars)'}
              </strong>
            </div>
            <Pill tone={rec.sms_character_count <= 160 ? 'leaf' : 'alert'}>
              {rec.sms_character_count} / ১৬০ অক্ষর
            </Pill>
          </div>

          <div style={{ padding: '14px 16px', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--water)', fontFamily: 'Hind Siliguri, monospace', fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
            "{rec.bangla_sms}"
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={copiedSms ? '✓' : '📋'}
              onClick={handleCopySms}
            >
              {copiedSms ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'এসএমএস কপি করুন' : 'Copy SMS')}
            </Button>
          </div>
        </Card>
      )}

      {/* 2. EVIDENCE ROW (STAT CARDS & DISTRIBUTION CHART) */}
      {advisoryData && !loading && !error && (
        <Card variant="glass" style={{ padding: 24 }}>
          <CardHeader
            icon="📊"
            title={lang === 'bn' ? 'বৃষ্টিপাত অনসেট প্রমাণ ও বিতরণ' : 'Rainfall Onset Evidence & Two-Period Distribution'}
            subtitle={lang === 'bn' ? '২০০১–২০১২ বনাম ২০১৩–২০২৫ নাসা উপাত্তের তুলনা' : '2001-2012 vs 2013-2025 NASA comparison'}
          />

          {/* 4 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <Card variant="glass" style={{ padding: 16 }}>
              <Stat
                label={lang === 'bn' ? '২০০১–২০১২ মধ্যমা' : 'Median Onset 2001-2012'}
                value={p1?.median_doy != null ? (doyToDate(p1.median_doy, lang) || 'তথ্য নেই') : 'তথ্য নেই'}
                sub={p1?.median_doy != null ? `DOY ${p1.median_doy}${p1?.valid_samples ? (lang === 'bn' ? ` · ${toBanglaDigits(p1.valid_samples)} বছর` : ` · ${p1.valid_samples} years`) : ''}` : ''}
                tone="leaf"
              />
            </Card>

            <Card variant="glass" style={{ padding: 16 }}>
              <Stat
                label={lang === 'bn' ? '২০১৩–২০২৫ মধ্যমা' : 'Median Onset 2013-2025'}
                value={p2?.median_doy != null ? (doyToDate(p2.median_doy, lang) || 'তথ্য নেই') : 'তথ্য নেই'}
                sub={p2?.median_doy != null ? `DOY ${p2.median_doy}${p2?.valid_samples ? (lang === 'bn' ? ` · ${toBanglaDigits(p2.valid_samples)} বছর` : ` · ${p2.valid_samples} years`) : ''}` : ''}
                tone="water"
              />
            </Card>

            <Card variant="glass" style={{ padding: 16 }}>
              <Stat
                label={lang === 'bn' ? 'অনসেট শিফট (দিন)' : 'Onset Shift (days)'}
                value={comp?.shift_days_median != null ? (comp.shift_days_median > 0 ? `+${comp.shift_days_median}` : `${comp.shift_days_median}`) : '—'}
                unit={lang === 'bn' ? 'দিন' : 'days'}
                tone={comp?.shift_days_median > 0 ? 'sun' : 'leaf'}
              />
            </Card>

            <Card variant="glass" style={{ padding: 16 }}>
              <Stat
                label={lang === 'bn' ? 'ম্যান-হুইটনি p-মান' : 'p-value (MW U)'}
                value={comp?.p_value != null ? Number(comp.p_value).toFixed(4) : '—'}
                sub={
                  comp?.p_value != null
                    ? (Number(comp.p_value) < 0.05
                        ? (lang === 'bn' ? 'p < 0.05: তাৎপর্যপূর্ণ' : 'p < 0.05: Significant')
                        : (lang === 'bn' ? 'p ≥ 0.05: তাৎপর্যপূর্ণ নয়' : 'p ≥ 0.05: Not significant'))
                    : ''
                }
                tone="accent"
              />
            </Card>
          </div>

          {/* Two-Period Distribution Strip Plot (SVG) */}
          {allDoys.length > 0 && (
            <div style={{ padding: 16, background: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>
                {lang === 'bn' ? 'অনসেট দিনের স্ট্রিপ প্লট (Onset DOY Distribution):' : 'Onset Day of Year Distribution Strip Plot:'}
              </div>
              <svg width="100%" height="90" viewBox="0 0 600 90" style={{ overflow: 'visible' }}>
                {/* Horizontal Tracks */}
                <line x1="80" y1="28" x2="570" y2="28" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="80" y1="62" x2="570" y2="62" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 4" />

                {/* Track Labels */}
                <text x="0" y="32" fill="var(--leaf)" fontSize="11" fontWeight="600">2001-2012</text>
                <text x="0" y="66" fill="var(--water)" fontSize="11" fontWeight="600">2013-2025</text>

                {/* Period 1 Dots */}
                {s1.map((doy, i) => {
                  const cx = 80 + ((doy - minDoy) / doyRange) * 490;
                  return <circle key={`p1-${i}`} cx={cx} cy="28" r="4.5" fill="var(--leaf)" opacity="0.75" />;
                })}

                {/* Period 2 Dots */}
                {s2.map((doy, i) => {
                  const cx = 80 + ((doy - minDoy) / doyRange) * 490;
                  return <circle key={`p2-${i}`} cx={cx} cy="62" r="4.5" fill="var(--water)" opacity="0.75" />;
                })}

                {/* Median Marker Lines */}
                {p1?.median_doy && (
                  <line
                    x1={80 + ((p1.median_doy - minDoy) / doyRange) * 490}
                    y1="14"
                    x2={80 + ((p1.median_doy - minDoy) / doyRange) * 490}
                    y2="42"
                    stroke="var(--leaf)"
                    strokeWidth="3"
                  />
                )}
                {p2?.median_doy && (
                  <line
                    x1={80 + ((p2.median_doy - minDoy) / doyRange) * 490}
                    y1="48"
                    x2={80 + ((p2.median_doy - minDoy) / doyRange) * 490}
                    y2="76"
                    stroke="var(--water)"
                    strokeWidth="3"
                  />
                )}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', paddingLeft: 80, paddingRight: 30, marginTop: 4 }}>
                <span>দিন {minDoy}</span>
                <span>দিন {Math.round((minDoy + maxDoy) / 2)}</span>
                <span>দিন {maxDoy}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 3. SENSITIVITY ROW (STAT CARDS FOR 20, 25, 30 mm) */}
      {sens.length > 0 && (
        <Card variant="glass" style={{ padding: 22 }}>
          <CardHeader
            icon="⚖️"
            title={lang === 'bn' ? 'সংবেদনশীলতা বিশ্লেষণ (Sensitivity Analysis: ±৫ মিমি)' : 'Sensitivity Analysis (Threshold ±5 mm)'}
            subtitle={lang === 'bn' ? 'বৃষ্টিপাত থ্রেশহোল্ড পরিবর্তনে শিফট স্থায়িত্ব' : 'Onset shift stability across thresholds'}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {sens.map((s, idx) => {
              const isSelected = s.threshold_mm === thresholdMm;
              return (
                <Card
                  key={idx}
                  variant="glass"
                  style={{
                    padding: 16,
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--line)',
                    background: isSelected ? 'rgba(197, 232, 108, 0.08)' : 'var(--glass)'
                  }}
                  onClick={() => setThresholdMm(s.threshold_mm)}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                    {s.threshold_mm} mm {s.threshold_mm === 25.0 ? '(Default)' : ''}
                  </div>
                  <Stat
                    value={s.shift_days_median != null ? (s.shift_days_median > 0 ? `+${s.shift_days_median}` : `${s.shift_days_median}`) : '—'}
                    unit={lang === 'bn' ? 'দিন' : 'days'}
                    sub={`p = ${s.p_value} (${s.valid_samples_p1}/${s.valid_samples_p2} yr)`}
                    tone={isSelected ? 'accent' : 'neutral'}
                  />
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. METHODOLOGY & PROVENANCE COLLAPSIBLE CARD */}
      <Card variant="glass" style={{ padding: 20 }}>
        <div
          onClick={() => setShowMethodology(!showMethodology)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔬</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'bn' ? 'গবেষণা পদ্ধতি, ডেটা প্রোভেন্যান্স ও সীমাবদ্ধতা' : 'Methodology, Data Provenance & Limitations'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DataSourceTag source="NASA POWER" mode={prov?.data_mode || 'cache'} period="2001-2025" />
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>{showMethodology ? '▲' : '▼'}</span>
          </div>
        </div>

        {showMethodology && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <h4 style={{ margin: '0 0 6px 0', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>
              {lang === 'bn' ? 'অনসেট সংজ্ঞা ও নিয়মাবলী:' : 'Onset Definition & Agro Rules:'}
            </h4>
            <p style={{ margin: '0 0 10px 0' }}>{advisoryData?.methodology?.onset_rule || advisoryData?.methodology?.onset_definition}</p>
            <p style={{ margin: '0 0 14px 0' }}>{advisoryData?.methodology?.dry_spell_rule}</p>

            <h4 style={{ margin: '14px 0 6px 0', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>
              {lang === 'bn' ? 'ডেটা প্রোভেন্যান্স ও স্থানাঙ্ক:' : 'Data Provenance & Spatial Coordinates:'}
            </h4>
            <ul style={{ margin: '0 0 14px 0', paddingLeft: 20 }}>
              <li><strong>উৎস:</strong> {prov?.dataset_name} ({prov?.spatial_resolution})</li>
              <li><strong>সময়কাল:</strong> {prov?.temporal_coverage}</li>
              <li><strong>স্থানাঙ্ক:</strong> {prov?.coordinates?.latitude}°N, {prov?.coordinates?.longitude}°E ({district})</li>
              <li><strong>কৃষি অঞ্চল (AEZ):</strong> {prov?.aez_context?.aez_name} (AEZ {prov?.aez_context?.aez_code})</li>
            </ul>

            <h4 style={{ margin: '14px 0 6px 0', color: 'var(--alert)', fontSize: 13, fontWeight: 700 }}>
              {lang === 'bn' ? 'বৈজ্ঞানিক সীমাবদ্ধতা:' : 'Scientific Limitations:'}
            </h4>
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12.5 }}>
              {lang === 'bn'
                ? 'নাসা পাওয়ার উপাত্ত ০.৫° গ্রিড রি-অ্যানালাইসিসের ওপর ভিত্তি করে প্রস্তুত। স্থানীয় ঢাল ও বিএমডিএ সেচ ব্যবস্থার প্রাপ্যতার ওপর মাঠের চূড়ান্ত পানি নির্ভর করে।'
                : 'NASA POWER data is based on 0.5-degree grid reanalysis. Micro-topography and local BMDA irrigation availability govern local water tables.'}
            </p>
          </div>
        )}
      </Card>

      {/* 5. 3D Workbench Toggle & Canvas */}
      <Card variant="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'bn' ? 'জমির ত্রিমাত্রিক কৃষি মডেল ও হাইড্রোলজি' : '3D Farm Simulation & Hydrology'}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {lang === 'bn' ? 'সংশ্লিষ্ট জেলার মাটির গঠন ও রোপণ মডেল' : 'Field visualizer linked to active advisory'}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShow3dWorkbench(!show3dWorkbench)}
          >
            {show3dWorkbench ? (lang === 'bn' ? 'মডেল বন্ধ করুন' : 'Hide Model') : (lang === 'bn' ? 'ত্রিমাত্রিক মডেল দেখুন' : 'Show 3D Farm')}
          </Button>
        </div>

        {show3dWorkbench && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ height: 400, width: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <RealFarmCanvas3D
                fieldProfile={{
                  district: district,
                  crop: crop === 'aman' ? 'rice' : crop,
                  soil_texture: prov?.aez_context?.soil_texture || 'loam',
                }}
                viewMode={viewMode3d}
                activeOverlay="crop"
                hasAlert={
                  rec?.evidence_level === 'insufficient' ||
                  comp?.evidence_level === 'insufficient' ||
                  Boolean(comp?.data_warning_en || rec?.data_warning_en)
                }
                lang={lang}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default NasaPlantingAdvisoryView;
