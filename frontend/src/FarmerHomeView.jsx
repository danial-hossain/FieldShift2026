// frontend/src/FarmerHomeView.jsx
// Simple, welcoming, high-contrast home screen for Bangladeshi farmers

import React from 'react';
import { useTranslation, toBengaliNumber, formatArea } from './i18n.js';
import { FarmerFarm3D } from './FarmerFarm3D.jsx';

export function FarmerHomeView({
  activeField,
  userFields = [],
  nasa,
  lang = 'bn',
  onNavigate,
  onSelectField,
  onOpenVoice
}) {
  const { t } = useTranslation(lang);

  // Derive simple weather advisory
  const tempC = Math.round(nasa?.temperature_c || 28);
  const rainMm = Number(nasa?.rainfall_mm || 0);
  const humidity = Math.round(nasa?.relative_humidity_pct || 65);
  const windKmh = Math.round((nasa?.wind_speed_ms || 2.5) * 3.6);

  let weatherAdvisory = t('weather_advice_good');
  if (rainMm > 5) {
    weatherAdvisory = t('weather_advice_rain');
  } else if (tempC > 34) {
    weatherAdvisory = t('weather_advice_heat');
  }

  // Dynamic suggested next step
  let suggestedActionText = t('suggested_step_desc');
  let suggestedActionBtn = t('suggested_step_btn');
  let suggestedNav = 'field';

  if (!activeField?.area_ha || activeField.area_ha <= 0) {
    suggestedActionText = lang === 'bn'
      ? 'আপনার জমির আয়তন যোগ করুন, তাহলে ফসলের হিসাব আরও ভালোভাবে করা যাবে।'
      : 'Add your field area to enable precise yield and profit calculations.';
    suggestedActionBtn = lang === 'bn' ? 'জমির আয়তন যোগ করুন ➔' : 'Add Field Area ➔';
    suggestedNav = 'field';
  } else if (!activeField?.soil_ph) {
    suggestedActionText = lang === 'bn'
      ? 'আপনার জমির মাটির পিএইচ (pH) পরীক্ষা যোগ করুন, তাহলে ধানের সঠিক সার নির্ধারণ করা যাবে।'
      : 'Add soil pH to get tailored fertilizer recommendations.';
    suggestedActionBtn = lang === 'bn' ? 'মাটির পিএইচ দিন ➔' : 'Add Soil pH ➔';
    suggestedNav = 'field';
  } else {
    suggestedActionText = lang === 'bn'
      ? 'আপনার জমিতে আসন্ন রবি মৌসুমের জন্য সরিষা ও মসুর ডালের লাভের হিসাব যাচাই করুন।'
      : 'Check estimated net profit for mustard and lentils for the upcoming Rabi season.';
    suggestedActionBtn = lang === 'bn' ? 'লাভের হিসাব দেখুন ➔' : 'Check Profit Calculator ➔';
    suggestedNav = 'harvest_profit';
  }

  return (
    <div className="farmer-home-container">
      {/* A. Welcome Banner */}
      <div className="farmer-welcome-banner">
        <div className="welcome-text-wrap">
          <div className="welcome-pill">
            <span>🌾 {t('brand_tagline')}</span>
          </div>
          <h1 className="welcome-title">{t('welcome_greeting')}</h1>
          <h2 className="welcome-subtitle">{t('welcome_sub')}</h2>
          <p className="welcome-desc">{t('welcome_desc')}</p>
        </div>

        <div className="welcome-voice-trigger">
          <button
            type="button"
            className="btn-welcome-mic"
            onClick={onOpenVoice}
            title={t('voice_btn_title')}
          >
            <span className="mic-icon-large">🎙️</span>
            <span className="mic-text-large">{lang === 'bn' ? 'মুখে প্রশ্ন করুন' : 'Speak to AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: My Farm & Today Weather */}
      <div className="farmer-overview-grid">
        {/* B. My Farm Card */}
        <div className="farmer-card farmer-farm-card">
          <div className="card-top-header">
            <div className="card-badge">
              <span>🗺️ {t('my_farm_title')}</span>
            </div>
            <button
              type="button"
              className="btn-card-link"
              onClick={() => onNavigate('field')}
            >
              {t('view_my_farm_btn')}
            </button>
          </div>

          <div className="farm-card-content">
            {activeField ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 className="farm-name" style={{ margin: 0 }}>
                    {activeField.name}
                  </h3>
                  {(activeField.is_demo || activeField.id === 'demo') && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                      DEMO BENCHMARK
                    </span>
                  )}
                </div>

                <div className="farm-stats-grid">
                  <div className="farm-stat-box">
                    <span className="stat-label">{t('field_area')}</span>
                    <strong className="stat-value">
                      {formatArea(activeField.area_ha || 10.0, lang)}
                    </strong>
                  </div>

                  <div className="farm-stat-box">
                    <span className="stat-label">{t('field_soil')}</span>
                    <strong className="stat-value">
                      {activeField.soil_texture === 'loam' ? (lang === 'bn' ? 'দোঁআশ মাটি' : 'Loam')
                        : activeField.soil_texture === 'clay' ? (lang === 'bn' ? 'এঁটেল মাটি' : 'Clay')
                        : activeField.soil_texture === 'sandy' ? (lang === 'bn' ? 'বেলে মাটি' : 'Sandy')
                        : (activeField.soil_texture || (lang === 'bn' ? 'দোঁআশ মাটি' : 'Loam'))}
                    </strong>
                  </div>

                  <div className="farm-stat-box">
                    <span className="stat-label">{t('field_ph')}</span>
                    <strong className="stat-value">
                      {activeField.soil_ph != null ? toBengaliNumber(activeField.soil_ph) : (lang === 'bn' ? '৬.৫' : '6.5')}
                    </strong>
                  </div>

                  <div className="farm-stat-box">
                    <span className="stat-label">{t('field_water')}</span>
                    <strong className="stat-value">
                      {activeField.irrigation_capacity_mm != null
                        ? (lang === 'bn' ? `${toBengaliNumber(activeField.irrigation_capacity_mm)} মিমি` : `${activeField.irrigation_capacity_mm} mm`)
                        : (lang === 'bn' ? '৯০ মিমি' : '90 mm')}
                    </strong>
                  </div>
                </div>

                {/* Quick Farm Visualizer */}
                <div className="farm-card-preview-btn-wrap">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => onNavigate('crop_advice')}
                  >
                    🌾 {lang === 'bn' ? 'এই জমির সেরা ফসলের পরামর্শ দেখুন ➔' : 'View Best Crops for this Land ➔'}
                  </button>
                </div>
              </>
            ) : (
              <div className="farm-empty-state" style={{ padding: '12px 0' }}>
                <h3 className="farm-name" style={{ color: 'var(--text-muted, #64748b)', fontSize: 16 }}>
                  {lang === 'bn' ? 'কোনো সক্রিয় জমি নির্বাচন করা নেই' : 'No Active Field Selected'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: '6px 0 16px', lineHeight: 1.4 }}>
                  {lang === 'bn'
                    ? 'আপনার খামারের হিসাব দেখতে বগুড়া ডেমো খামার লোড করুন অথবা নতুন জমি নিবন্ধন করুন।'
                    : 'To view farm analytics, load the Bogura demo field or register your own parcel.'}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: 160, padding: '10px 14px', fontSize: 13 }}
                    onClick={() => onSelectField && onSelectField({ id: 'demo' }, false)}
                  >
                    🧪 {lang === 'bn' ? 'বগুড়া ডেমো খামার ব্যবহার করুন' : 'Use Bogura Demo (10 ha)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1, minWidth: 140, padding: '10px 14px', fontSize: 13 }}
                    onClick={() => onNavigate('field')}
                  >
                    ➕ {lang === 'bn' ? 'নতুন জমি যোগ করুন' : 'Register Field'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* C. Today's Weather Card */}
        <div className="farmer-card farmer-weather-card">
          <div className="card-top-header">
            <div className="card-badge weather-badge">
              <span>🌦️ {t('today_weather_title')}</span>
            </div>
            <button
              type="button"
              className="btn-card-link"
              onClick={() => onNavigate('weather')}
            >
              {t('view_weather_details_btn')}
            </button>
          </div>

          <div className="weather-card-content">
            <div className="weather-main-row">
              <div className="weather-temp-block">
                <span className="weather-icon-giant">☀️</span>
                <div className="temp-numbers">
                  <span className="temp-current">
                    {lang === 'bn' ? `${toBengaliNumber(tempC)}°` : `${tempC}°`}
                  </span>
                  <span className="temp-unit">সেলসিয়াস (C)</span>
                </div>
              </div>

              <div className="weather-quick-metrics">
                <div className="quick-metric-item">
                  <span className="q-label">🌧️ {t('rain_label')}:</span>
                  <strong className="q-val">
                    {lang === 'bn' ? `${toBengaliNumber(rainMm.toFixed(1))} মিমি` : `${rainMm.toFixed(1)} mm`}
                  </strong>
                </div>
                <div className="quick-metric-item">
                  <span className="q-label">💧 {t('humidity_label')}:</span>
                  <strong className="q-val">
                    {lang === 'bn' ? `${toBengaliNumber(humidity)}%` : `${humidity}%`}
                  </strong>
                </div>
                <div className="quick-metric-item">
                  <span className="q-label">💨 {t('wind_label')}:</span>
                  <strong className="q-val">
                    {lang === 'bn' ? `${toBengaliNumber(windKmh)} কিমি/ঘণ্টা` : `${windKmh} km/h`}
                  </strong>
                </div>
              </div>
            </div>

            {/* Practical Farmer Advisory */}
            <div className="weather-advisory-box">
              <p className="advisory-text">{weatherAdvisory}</p>
            </div>

            <div className="weather-source-cite">
              <small>
                ℹ️ {nasa && (nasa.data_status === 'observed' || nasa.data_status === 'live')
                  ? (lang === 'bn' ? 'উপাত্ত সূত্র: নাসা (NASA POWER) উপগ্রহ ও আবহাওয়া মডেল রি-অ্যানালাইসিস (সরাসরি পয়েন্ট এপিআই)।' : 'Data source: NASA POWER Daily Point API (Meteorological & Solar Reanalysis).')
                  : (lang === 'bn' ? 'উপাত্ত সূত্র: নাসা (NASA POWER) সংরক্ষিত ঐতিহাসিক বেঞ্চমার্ক ক্যাশ।' : 'Data source: NASA POWER Historical Benchmark Series (Cached / Offline).')}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Farm Visualizer Preview */}
      <FarmerFarm3D
        activeField={activeField}
        userFields={userFields}
        onSelectField={onSelectField}
        recommendedCrop="Rice"
        nasa={nasa}
        lang={lang}
      />

      {/* D. Main Action Cards (Large, Accessible Touch Targets) */}
      <div className="farmer-quick-actions-section">
        <h3 className="section-heading">🎯 {t('quick_actions_title')}</h3>
        <div className="action-cards-grid">
          {/* Card 1: Crop Advice */}
          <div
            className="action-card card-crop-advice"
            onClick={() => onNavigate('crop_advice')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-icon">🌱</div>
            <div className="action-card-text">
              <h4 className="action-card-title">{t('action_crop_advice_title')}</h4>
              <p className="action-card-desc">{t('action_crop_advice_desc')}</p>
            </div>
            <span className="action-card-arrow">➔</span>
          </div>

          {/* Card 2: Today Weather */}
          <div
            className="action-card card-weather"
            onClick={() => onNavigate('weather')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-icon">🌦️</div>
            <div className="action-card-text">
              <h4 className="action-card-title">{t('action_weather_title')}</h4>
              <p className="action-card-desc">{t('action_weather_desc')}</p>
            </div>
            <span className="action-card-arrow">➔</span>
          </div>

          {/* Card 3: Market Prices */}
          <div
            className="action-card card-market"
            onClick={() => onNavigate('market')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-icon">💰</div>
            <div className="action-card-text">
              <h4 className="action-card-title">{t('action_market_title')}</h4>
              <p className="action-card-desc">{t('action_market_desc')}</p>
            </div>
            <span className="action-card-arrow">➔</span>
          </div>

          {/* Card 4: Profit Calculator */}
          <div
            className="action-card card-profit"
            onClick={() => onNavigate('harvest_profit')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-icon">📋</div>
            <div className="action-card-text">
              <h4 className="action-card-title">{t('action_profit_title')}</h4>
              <p className="action-card-desc">{t('action_profit_desc')}</p>
            </div>
            <span className="action-card-arrow">➔</span>
          </div>

          {/* Card 5: AI Assistant */}
          <div
            className="action-card card-assistant"
            onClick={() => onNavigate('assistant')}
            role="button"
            tabIndex={0}
          >
            <div className="action-card-icon">🤖</div>
            <div className="action-card-text">
              <h4 className="action-card-title">{t('action_assistant_title')}</h4>
              <p className="action-card-desc">{t('action_assistant_desc')}</p>
            </div>
            <span className="action-card-arrow">➔</span>
          </div>
        </div>
      </div>

      {/* E. Suggested Next Step */}
      <div className="farmer-suggested-step-card">
        <div className="suggested-icon">💡</div>
        <div className="suggested-text-wrap">
          <h4 className="suggested-title">{t('suggested_step_title')}</h4>
          <p className="suggested-desc">{suggestedActionText}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate(suggestedNav)}
        >
          {suggestedActionBtn}
        </button>
      </div>
    </div>
  );
}
