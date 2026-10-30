// frontend/src/NasaPlantingAdvisoryView.jsx
// Mobile-First NASA Planting-Window Advisory for Bangladeshi Rice
// Deterministic Agro-Meteorological Evidence from NASA POWER Daily Observations (2001–2025)

import React, { useState, useEffect, useMemo } from 'react';
import { request } from './apiClient.js';
import { RealFarmCanvas3D } from './RealFarmCanvas3D.jsx';

export function NasaPlantingAdvisoryView({
  defaultDistrict = 'rajshahi',
  defaultCrop = 'aman',
  lang = 'bn',
  onNavigate,
}) {
  const [district, setDistrict] = useState(defaultDistrict);
  const [crop, setCrop] = useState(defaultCrop);
  const [thresholdMm, setThresholdMm] = useState(25.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advisoryData, setAdvisoryData] = useState(null);
  const [copiedSms, setCopiedSms] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [show3dWorkbench, setShow3dWorkbench] = useState(false);
  const [viewMode3d, setViewMode3d] = useState('3d'); // '3d' or '2d'

  // Fetch advisory data whenever parameters change
  useEffect(() => {
    let isCancelled = false;
    async function fetchAdvisory() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          district,
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
    return () => {
      isCancelled = true;
    };
  }, [district, crop, thresholdMm, lang]);

  const districtsList = [
    { id: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi (Barind Tract)', icon: '🏛️' },
    { id: 'bogura', nameBn: 'বগুড়া', nameEn: 'Bogura (Floodplain)', icon: '🌾' },
    { id: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur (Tista Basin)', icon: '🌱' },
    { id: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh (Old Brahmaputra)', icon: '🌿' },
    { id: 'jashore', nameBn: 'যশোর', nameEn: 'Jashore (Ganges Plain)', icon: '🌻' },
    { id: 'cumilla', nameBn: 'কুমিল্লা', nameEn: 'Cumilla (Meghna Plain)', icon: '🚜' },
  ];

  const cropsList = [
    { id: 'aman', nameBn: 'আমন ধান', nameEn: 'Aman Rice (Monsoon Rainfed/AWD)', season: 'Kharif-2' },
    { id: 'boro', nameBn: 'বোরো ধান', nameEn: 'Boro Rice (Dry Irrigated)', season: 'Rabi' },
    { id: 'aus', nameBn: 'আউশ ধান', nameEn: 'Aus Rice (Pre-Monsoon)', season: 'Kharif-1' },
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

  return (
    <div className="nasa-advisory-container" style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>

      {/* 1. TOP BANGLA ADVISORY SENTENCE (MOBILE-FIRST HERO BANNER) */}
      <div
        className="advisory-hero-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.15) 0%, rgba(20, 30, 40, 0.95) 100%)',
          border: '1px solid rgba(0, 223, 129, 0.35)',
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🛰️🌾</span>
          <span
            style={{
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#00df81',
              fontWeight: 700,
              background: 'rgba(0, 223, 129, 0.1)',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            {lang === 'bn' ? 'নাসা উপগ্রহভিত্তিক রোপণ পরামর্শ ২০২৬' : 'Official NASA Planting Advisory 2026'}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: prov?.data_mode === 'live_acquired_cache' ? '#38bdf8' : (prov?.data_mode === 'cache' ? '#00df81' : '#fbbf24'),
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '3px 8px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {prov?.data_mode === 'live_acquired_cache' ? '● LIVE NASA API' : (prov?.data_mode === 'cache' ? '● LOCAL CACHE' : '● OFFLINE FIXTURE')}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '16px 0', color: '#8a99a8' }}>
            <span>{lang === 'bn' ? 'নাসা জলবায়ু উপাত্ত বিশ্লেষণ করা হচ্ছে...' : 'Analyzing 25-Year NASA Climate Telemetry...'}</span>
          </div>
        ) : error ? (
          <div style={{ color: '#f87171', padding: '8px 0' }}>{error}</div>
        ) : (
          <div>
            {(comp?.data_warning_bn || rec?.data_warning_bn || comp?.data_warning_en || rec?.data_warning_en) && (
              <div
                className="advisory-warning-box"
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid #fbbf24',
                  color: '#fbbf24',
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>
                  {lang === 'bn'
                    ? (comp?.data_warning_bn || rec?.data_warning_bn)
                    : (comp?.data_warning_en || rec?.data_warning_en)}
                </span>
              </div>
            )}
            <h1
              style={{
                fontSize: '1.35rem',
                lineHeight: 1.45,
                margin: '0 0 8px 0',
                color: '#f1f5f9',
                fontWeight: 700,
              }}
            >
              {lang === 'bn' ? rec?.bangla_headline : rec?.english_headline}
            </h1>
            {advisoryData?.status !== 'not_applicable' && rec?.status !== 'not_applicable' && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ab0c4', lineHeight: 1.5 }}>
                {lang === 'bn' ? (
                  <>
                    <strong style={{ color: '#00df81' }}>প্রস্তাবিত বীজতলা:</strong> {rec?.suggested_nursery_window_bn} &nbsp;|&nbsp;
                    <strong style={{ color: '#38bdf8' }}> চারা রোপণ:</strong> {rec?.suggested_transplant_window_bn}
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#00df81' }}>Nursery Sowing:</strong> {rec?.suggested_nursery_window_en} &nbsp;|&nbsp;
                    <strong style={{ color: '#38bdf8' }}> Transplanting:</strong> {rec?.suggested_transplant_window_en}
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. DISTRICT & CROP SELECTORS (RESPONSIVE CHIPS) */}
      <div
        className="advisory-selectors-card"
        style={{
          background: '#161d23',
          border: '1px solid #222c36',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 20,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#9ab0c4', display: 'block', marginBottom: 8 }}>
            {lang === 'bn' ? '১. জেলা নির্বাচন করুন (Select District):' : '1. Select District:'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {districtsList.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDistrict(d.id)}
                style={{
                  background: district === d.id ? 'rgba(0, 223, 129, 0.18)' : '#1c242c',
                  border: district === d.id ? '1px solid #00df81' : '1px solid #2a3742',
                  color: district === d.id ? '#00df81' : '#f1f5f9',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: district === d.id ? 700 : 500,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{d.icon}</span>
                <span>{lang === 'bn' ? d.nameBn : d.nameEn}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#9ab0c4', display: 'block', marginBottom: 8 }}>
            {lang === 'bn' ? '২. ধানের ফসল নির্বাচন করুন (Select Rice Crop):' : '2. Select Rice Crop:'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cropsList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCrop(c.id)}
                style={{
                  background: crop === c.id ? 'rgba(56, 189, 248, 0.18)' : '#1c242c',
                  border: crop === c.id ? '1px solid #38bdf8' : '1px solid #2a3742',
                  color: crop === c.id ? '#38bdf8' : '#f1f5f9',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: crop === c.id ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🌾 {lang === 'bn' ? c.nameBn : c.nameEn}</span>
                <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({c.season})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TWO-PERIOD COMPARISON & SHIFT METRICS */}
      {advisoryData && !loading && !error && advisoryData?.status !== 'not_applicable' && rec?.status !== 'not_applicable' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Card A: Historical Shift in Days & Statistics */}
          <div
            style={{
              background: '#161d23',
              border: '1px solid #222c36',
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8a99a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {lang === 'bn' ? 'বৃষ্টিপাত অনসেট মধ্যমা শিফট' : 'Rainfall Onset Shift'}
              </span>
              <span
                style={{
                  background: comp?.shift_days_median > 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 223, 129, 0.15)',
                  color: comp?.shift_days_median > 0 ? '#fbbf24' : '#00df81',
                  border: comp?.shift_days_median > 0 ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(0, 223, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {comp?.is_significant ? (lang === 'bn' ? 'পরিসংখ্যানগত তাৎপর্যপূর্ণ' : 'p < 0.05 Significant') : (lang === 'bn' ? 'মধ্যম ট্রেন্ড (সতর্কতা)' : 'Moderate Trend (p >= 0.05)')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: comp?.shift_days_median > 0 ? '#fbbf24' : '#00df81' }}>
                {comp?.shift_days_median > 0 ? `+${comp?.shift_days_median}` : comp?.shift_days_median}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
                {lang === 'bn' ? 'দিন দেরিতে অনসেট' : 'Days Delayed'}
              </span>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#8a99a8', lineHeight: 1.5 }}>
              {lang === 'bn'
                ? `২০০১–২০১২ ভিত্তি পর্বের তুলনায় ২০১৩–২০২৫ সাম্প্রতিক পর্বে কার্যকর বর্ষা শুরুর মধ্যমা ${Math.abs(comp?.shift_days_median || 0)} দিন দেরিতে ঘটছে।`
                : `Median usable rainfall onset has shifted by ${comp?.shift_days_median} days in 2013-2025 compared to 2001-2012.`}
            </p>

            <div style={{ background: '#1c242c', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#9ab0c4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{lang === 'bn' ? '২০০১–২০১২ মধ্যমা:' : '2001-2012 Median:'}</span>
                <strong style={{ color: '#f1f5f9' }}>দিন {p1?.median_doy} ({p1?.valid_samples} বছর)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{lang === 'bn' ? '২০১৩–২০২৫ মধ্যমা:' : '2013-2025 Median:'}</span>
                <strong style={{ color: '#f1f5f9' }}>দিন {p2?.median_doy} ({p2?.valid_samples} বছর)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a3742', paddingTop: 4, marginTop: 4 }}>
                <span>{lang === 'bn' ? 'ম্যান-হুইটনি U (p-মান):' : 'Mann-Whitney U (p-val):'}</span>
                <span style={{ color: '#38bdf8' }}>U={comp?.mann_whitney_u}, p={comp?.p_value}</span>
              </div>
            </div>
          </div>

          {/* Card B: Thermal Context (GDD) & Climate Evidence */}
          <div
            style={{
              background: '#161d23',
              border: '1px solid #222c36',
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8a99a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {lang === 'bn' ? 'তাপমাত্রা ও ডিগ্রি-ডে প্রসঙ্গ (GDD)' : 'Growing Degree Days (GDD)'}
              </span>
              <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                Base 10°C / Cap 35°C
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8' }}>
                {gdd?.gdd_change > 0 ? `+${gdd?.gdd_change}` : gdd?.gdd_change}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
                {lang === 'bn' ? 'ডিগ্রি-ডে বৃদ্ধি (GDD)' : 'Seasonal GDD Delta'}
              </span>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#8a99a8', lineHeight: 1.5 }}>
              {lang === 'bn'
                ? `খরিফ মৌসুমে মোট সঞ্চিত ডিগ্রি-ডে বৃদ্ধি পাওয়ায় উদ্ভিদের বৃদ্ধি ত্বরান্বিত হয় এবং বাষ্পীভবনের পানির চাহিদা বাড়ে।`
                : `Accumulated thermal units increased by ${gdd?.gdd_change} GDD, accelerating growth and increasing water loss.`}
            </p>

            <div style={{ background: '#1c242c', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#9ab0c4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{lang === 'bn' ? '২০০১–২০১২ গড় GDD:' : '2001-2012 Mean GDD:'}</span>
                <strong style={{ color: '#f1f5f9' }}>{gdd?.period_1_mean_seasonal_gdd} °C-দিন</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{lang === 'bn' ? '২০১৩–২০২৫ গড় GDD:' : '2013-2025 Mean GDD:'}</span>
                <strong style={{ color: '#f1f5f9' }}>{gdd?.period_2_mean_seasonal_gdd} °C-দিন</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. SMS-LENGTH BANGLA VERSION (< 160 CHARACTERS) */}
      {rec?.bangla_sms && (
        <div
          className="sms-advisory-card"
          style={{
            background: 'linear-gradient(135deg, #1c242c 0%, #161d23 100%)',
            border: '1px solid #2b3947',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <strong style={{ fontSize: 13, color: '#f1f5f9', letterSpacing: '0.02em' }}>
                {lang === 'bn' ? 'কৃষক মোবাইল এসএমএস সারসংক্ষেপ (১৬০ অক্ষরের নিচে)' : 'SMS-Length Bengali Farmer Summary (<160 chars)'}
              </strong>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 600,
                background: rec.sms_character_count <= 160 ? 'rgba(0, 223, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                color: rec.sms_character_count <= 160 ? '#00df81' : '#f87171',
              }}
            >
              {rec.sms_character_count} / ১৬০ অক্ষর
            </span>
          </div>

          <div
            style={{
              background: '#0e1318',
              border: '1px solid #222c36',
              borderRadius: 8,
              padding: '14px 16px',
              fontFamily: 'monospace, sans-serif',
              fontSize: '0.95rem',
              color: '#38bdf8',
              lineHeight: 1.5,
              marginBottom: 10,
            }}
          >
            "{rec.bangla_sms}"
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={handleCopySms}
              style={{
                background: copiedSms ? '#00df81' : '#2a3742',
                color: copiedSms ? '#0e1318' : '#f1f5f9',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
            >
              <span>{copiedSms ? '✓ কপি সম্পন্ন হয়েছে' : '📋 এসএমএস কপি করুন'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. RECOMMENDED VARIETY MATRIX & TACTICAL ACTIONS */}
      {rec?.recommended_varieties && (
        <div
          style={{
            background: '#161d23',
            border: '1px solid #222c36',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 14px 0', color: '#f1f5f9', fontWeight: 600 }}>
            {lang === 'bn' ? 'অনুকূল জাত ও সময় ব্যবস্থাপনা (BARI/BRRI Calibrated)' : 'Recommended Varieties & Variety Phenology'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
            {rec.recommended_varieties.map((v, idx) => (
              <div
                key={idx}
                style={{
                  background: '#1c242c',
                  border: idx === 0 ? '1px solid rgba(0, 223, 129, 0.4)' : '1px solid #2a3742',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14, color: idx === 0 ? '#00df81' : '#f1f5f9' }}>{v.name}</strong>
                  <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: 4, color: '#9ab0c4' }}>
                    {v.duration_days} দিন
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 4, fontWeight: 500 }}>{v.role}</div>
                <p style={{ margin: 0, fontSize: 12, color: '#8a99a8', lineHeight: 1.45 }}>{v.why}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#1c242c', borderRadius: 8, padding: '12px 16px' }}>
            <strong style={{ fontSize: 12, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              {lang === 'bn' ? 'মাঠপর্যায়ের কৌশলগত সুপারিশ:' : 'Tactical Field Actions:'}
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#9ab0c4', lineHeight: 1.6 }}>
              {rec.tactical_actions?.map((act, i) => (
                <li key={i}>{act}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 6. SENSITIVITY ANALYSIS CONTROLS (±5 mm RAINFALL THRESHOLD SWEEPS) */}
      <div
        style={{
          background: '#161d23',
          border: '1px solid #222c36',
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#f1f5f9', fontWeight: 600 }}>
              {lang === 'bn' ? 'সংবেদনশীলতা বিশ্লেষণ (Sensitivity Analysis: ±৫ মিমি)' : 'Sensitivity Analysis (Threshold ±5 mm)'}
            </h2>
            <span style={{ fontSize: 12, color: '#8a99a8' }}>
              {lang === 'bn' ? 'বৃষ্টিপাত অনসেট থ্রেশহোল্ড পরিবর্তনে শিফটের পরিবর্তন পর্যবেক্ষণ করুন' : 'Evaluate onset shift stability across rainfall thresholds'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[20.0, 25.0, 30.0].map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => setThresholdMm(th)}
                style={{
                  background: thresholdMm === th ? '#00df81' : '#1c242c',
                  color: thresholdMm === th ? '#0e1318' : '#f1f5f9',
                  border: thresholdMm === th ? '1px solid #00df81' : '1px solid #2a3742',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {th} mm {th === 25.0 ? '(ডিফল্ট)' : ''}
              </button>
            ))}
          </div>
        </div>

        {sens.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {sens.map((s, idx) => (
              <div
                key={idx}
                style={{
                  background: s.threshold_mm === thresholdMm ? 'rgba(0, 223, 129, 0.08)' : '#1c242c',
                  border: s.threshold_mm === thresholdMm ? '1px solid #00df81' : '1px solid #2a3742',
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 11, color: '#8a99a8', marginBottom: 2 }}>থ্রেশহোল্ড {s.threshold_mm} mm</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.shift_days_median > 0 ? '#fbbf24' : '#00df81' }}>
                  {s.shift_days_median > 0 ? `+${s.shift_days_median}` : s.shift_days_median} দিন
                </div>
                <div style={{ fontSize: 11, color: '#9ab0c4', marginTop: 4 }}>
                  p-মান: {s.p_value} (নমুনা: {s.valid_samples_p1}/{s.valid_samples_p2})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. EXPANDABLE METHODOLOGY, LIMITATIONS & DATA PROVENANCE */}
      <div
        style={{
          background: '#161d23',
          border: '1px solid #222c36',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          style={{
            background: 'none',
            border: 'none',
            color: '#f1f5f9',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>🔬 {lang === 'bn' ? 'গবেষণা পদ্ধতি, ডেটা প্রোভেন্যান্স ও সীমাবদ্ধতা' : 'Methodology, Data Provenance & Limitations'}</span>
          <span style={{ fontSize: 12, color: '#00df81' }}>{showMethodology ? '▲ সংক্ষেপ করুন' : '▼ বিস্তারিত দেখুন'}</span>
        </button>

        {showMethodology && (
          <div style={{ marginTop: 14, borderTop: '1px solid #222c36', paddingTop: 14, fontSize: '0.85rem', color: '#9ab0c4', lineHeight: 1.6 }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#f1f5f9' }}>অনসেট ও শুষ্ক স্পেল নির্ধারণের নিয়ম (Scientific Definition):</h4>
            <p style={{ margin: '0 0 10px 0' }}>{advisoryData?.methodology?.onset_rule || advisoryData?.methodology?.onset_definition}</p>
            <p style={{ margin: '0 0 10px 0' }}>{advisoryData?.methodology?.dry_spell_rule}</p>

            <h4 style={{ margin: '12px 0 6px 0', color: '#f1f5f9' }}>ডেটা প্রোভেন্যান্স ও উৎস (Provenance):</h4>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: 18 }}>
              <li><strong>উৎস:</strong> {prov?.dataset_name} ({prov?.spatial_resolution})</li>
              <li><strong>সময়কাল:</strong> {prov?.temporal_coverage}</li>
              <li><strong>স্থানাঙ্ক:</strong> অক্ষাংশ {prov?.coordinates?.latitude}° N, দ্রাঘিমাংশ {prov?.coordinates?.longitude}° E ({district})</li>
              <li><strong>কৃষি অঞ্চল (AEZ):</strong> {prov?.aez_context?.aez_name} (AEZ {prov?.aez_context?.aez_code})</li>
              <li><strong>অনুপস্থিত উপাত্ত ব্যবস্থাপনা:</strong> {prov?.missing_value_handling}</li>
              <li><strong>ডেটা মোড:</strong> {prov?.data_mode} ({prov?.offline_forced ? 'অফলাইন মোড কার্যকর' : 'অনলাইন সক্রিয়'})</li>
            </ul>

            <h4 style={{ margin: '12px 0 6px 0', color: '#f1f5f9' }}>সীমাবদ্ধতা (Scientific Limitations):</h4>
            <p style={{ margin: 0, color: '#f87171' }}>
              নাসা পাওয়ার উপাত্ত ০.৫° গ্রিড পরিমাপের ওপর ভিত্তি করে প্রাপ্ত। মাঠপর্যায়ের স্থানীয় ঢাল, ভূগর্ভস্থ নালার সংযোগ ও বিএমডিএ গভীর নলকূপের সহজলভ্যতার ওপর চূড়ান্ত পানি ব্যবস্থাপনা নির্ভর করে।
            </p>
          </div>
        )}
      </div>

      {/* 8. SUPPORTING 3D WORKBENCH / 2D FIELD FALLBACK */}
      <div
        style={{
          background: '#161d23',
          border: '1px solid #222c36',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#f1f5f9', fontWeight: 600 }}>
              {lang === 'bn' ? 'জমির ত্রিমাত্রিক কৃষি মডেল ও হাইড্রোলজি (3D Farm Visualizer)' : '3D Farm Simulation & Hydrology'}
            </h2>
            <span style={{ fontSize: 12, color: '#8a99a8' }}>
              {lang === 'bn' ? 'বর্তমান আবহাওয়া ও রোপণ পরামর্শের সাথে সংশ্লিষ্ট খেতের মডেল' : 'Scientific field visualization linked to active advisory'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setShow3dWorkbench(!show3dWorkbench)}
              style={{
                background: show3dWorkbench ? 'rgba(0, 223, 129, 0.2)' : '#1c242c',
                border: show3dWorkbench ? '1px solid #00df81' : '1px solid #2a3742',
                color: show3dWorkbench ? '#00df81' : '#f1f5f9',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {show3dWorkbench ? (lang === 'bn' ? 'মডেল বন্ধ করুন' : 'Hide Workbench') : (lang === 'bn' ? 'ত্রিমাত্রিক মডেল দেখুন' : 'Show 3D Workbench')}
            </button>
          </div>
        </div>

        {show3dWorkbench && (
          <div style={{ marginTop: 12, borderTop: '1px solid #222c36', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setViewMode3d('3d')}
                style={{
                  background: viewMode3d === '3d' ? '#00df81' : '#1c242c',
                  color: viewMode3d === '3d' ? '#0e1318' : '#f1f5f9',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                3D WebGL
              </button>
              <button
                type="button"
                onClick={() => setViewMode3d('2d')}
                style={{
                  background: viewMode3d === '2d' ? '#00df81' : '#1c242c',
                  color: viewMode3d === '2d' ? '#0e1318' : '#f1f5f9',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                2D Fallback
              </button>
            </div>

            <div style={{ height: 420, width: '100%', borderRadius: 8, overflow: 'hidden', background: '#0e1318', position: 'relative' }}>
              <RealFarmCanvas3D
                fieldProfile={{
                  name: `${district.toUpperCase()} Demo Farm`,
                  crop: crop === 'aman' ? 'rice' : crop,
                  soil_texture: prov?.aez_context?.soil_texture || 'loam',
                  soil_ph: 6.5,
                  area_ha: 8.0,
                  moisture_pct: 68,
                  water_level_cm: 4.5,
                }}
                viewMode={viewMode3d}
                activeOverlay="moisture"
                lang={lang}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  background: 'rgba(14, 19, 24, 0.85)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  color: '#9ab0c4',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                * খেতের ত্রিমাত্রিক রেন্ডারিং একটি সিমুলেশন প্রদর্শন; জলবায়ু উপাত্ত নাসার বাস্তব পর্যবেক্ষণ।
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default NasaPlantingAdvisoryView;
