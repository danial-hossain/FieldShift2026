// frontend/src/FarmerHomeView.jsx
// Modern Farm Dashboard for Bangladeshi farmers on the FieldShift Design System
import React, { useEffect, useState } from 'react';
import { useTranslation, toBengaliNumber, formatArea } from './i18n.js';
import { FarmerFarm3D } from './FarmerFarm3D.jsx';
import { Card, CardHeader, Stat, Button, Pill, DataSourceTag, EmptyState, Skeleton } from './ui/index.js';
import { evidenceBadge } from './advisoryBadges.js';

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

  // Weather Telemetry
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

  // Real Advisory Sentence from API
  const [advisoryData, setAdvisoryData] = useState(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(true);
  const [advisoryError, setAdvisoryError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const district = activeField?.district || 'rajshahi';

  useEffect(() => {
    let isMounted = true;
    setAdvisoryLoading(true);
    setAdvisoryError(null);
    fetch(`/api/advisory?district=${encodeURIComponent(district)}&crop=aman`)
      .then(res => {
        if (!res.ok) throw new Error('Advisory fetch failed');
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setAdvisoryData(data);
        }
      })
      .catch(err => {
        if (isMounted) {
          setAdvisoryError(err.message || 'Error');
        }
      })
      .finally(() => {
        if (isMounted) setAdvisoryLoading(false);
      });
    return () => { isMounted = false; };
  }, [district, reloadKey]);

  const headline = advisoryData?.recommendation
    ? (lang === 'bn' ? advisoryData.recommendation.bangla_headline : advisoryData.recommendation.english_headline)
    : null;

  const badge = evidenceBadge(advisoryData?.recommendation, advisoryData?.comparison, advisoryData?.status);

  return (
    <div className="farmer-home-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 12-Column Grid Row 1: Greeting Hero (8 cols) + Today's Weather (4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        {/* Left 8 Cols: Greeting Hero */}
        <Card variant="glass" style={{ gridColumn: 'span 8', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Pill tone="leaf" icon="🌾">{t('brand_tagline')}</Pill>
              <DataSourceTag source="NASA POWER" mode="climatology" period="2001-2025" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)', lineHeight: 1.2 }}>
              {t('welcome_greeting')}
            </h1>
            <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 12px 0', color: 'var(--text-2)' }}>
              {t('welcome_sub')}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
              {t('welcome_desc')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              icon="🎙️"
              onClick={onOpenVoice}
            >
              {lang === 'bn' ? 'মুখে প্রশ্ন করুন' : 'Speak to AI'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="🌱"
              onClick={() => onNavigate('crop_advice')}
            >
              {lang === 'bn' ? 'ফসলের পরামর্শ দেখুন' : 'View Crop Advisory'}
            </Button>
          </div>
        </Card>

        {/* Right 4 Cols: Today's Weather Card */}
        <Card variant="glass" style={{ gridColumn: 'span 4', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <CardHeader
              icon="🌦️"
              title={t('today_weather_title')}
              subtitle="NASA POWER Reanalysis"
              action={
                <Button variant="ghost" size="sm" onClick={() => onNavigate('weather')}>
                  ➔
                </Button>
              }
            />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '12px 0' }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)', lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>
                {lang === 'bn' ? `${toBengaliNumber(tempC)}°` : `${tempC}°`}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>C</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <Stat label={t('rain_label')} value={lang === 'bn' ? `${toBengaliNumber(rainMm.toFixed(1))}` : rainMm.toFixed(1)} unit="mm" tone="water" />
              <Stat label={t('humidity_label')} value={lang === 'bn' ? `${toBengaliNumber(humidity)}` : humidity} unit="%" tone="leaf" />
              <Stat label={t('wind_label')} value={lang === 'bn' ? `${toBengaliNumber(windKmh)}` : windKmh} unit="km/h" tone="sun" />
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>
            💡 {weatherAdvisory}
          </p>
        </Card>
      </div>

      {/* 12-Column Grid Row 2: Current Advisory (8 cols) + Active Field (4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        {/* Left 8 Cols: Advisory Card */}
        <Card variant="glass-strong" style={{ gridColumn: 'span 8', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {advisoryLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
              <Skeleton width="40%" height={24} />
              <Skeleton width="100%" height={20} />
              <Skeleton width="85%" height={20} />
            </div>
          ) : advisoryError ? (
            <EmptyState
              title={lang === 'bn' ? 'পরামর্শ লোড করা যায়নি' : 'Could not load advisory'}
              action={
                <Button size="sm" variant="secondary" onClick={() => setReloadKey(k => k + 1)}>
                  {lang === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
                </Button>
              }
            />
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>🛰️</span>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {lang === 'bn' ? 'নাসা রোপণ পরামর্শ ২০২৬' : 'NASA Planting Window Advisory 2026'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                      ({district.toUpperCase()})
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill tone={badge.tone}>
                    {lang === 'bn' ? badge.bn : badge.en}
                  </Pill>
                  <DataSourceTag source="NASA POWER" mode="daily" period="2001-2025" />
                </div>
              </div>

              {headline ? (
                <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.6, margin: '14px 0', fontFamily: 'Hind Siliguri, sans-serif' }}>
                  "{headline}"
                </p>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '14px 0' }}>
                  {lang === 'bn' ? 'কোনো পরামর্শ পাওয়া যায়নি।' : 'No advisory available.'}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {lang === 'bn' ? '২৫ বছরের বৃষ্টিপাত ডেটা ও অনসেট বিশ্লেষণ' : 'Based on 25-year Mann-Whitney U test'}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('crop_advice')}
            >
              {lang === 'bn' ? 'সম্পূর্ণ পরামর্শ ও এসএমএস দেখুন ➔' : 'View Full Advisory & SMS ➔'}
            </Button>
          </div>
        </Card>

        {/* Right 4 Cols: Active Field Card */}
        <Card variant="glass" style={{ gridColumn: 'span 4', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <CardHeader
            icon="🗺️"
            title={t('my_farm_title')}
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('field')}>
                {t('view_my_farm_btn')}
              </Button>
            }
          />

          {activeField ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  {activeField.name}
                </h3>
                {(activeField.is_demo || activeField.id === 'demo') && (
                  <Pill tone="water">DEMO</Pill>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid var(--line)' }}>
                <Stat label={t('field_area')} value={formatArea(activeField.area_ha || 10.0, lang)} />
                <Stat
                  label={t('field_soil')}
                  value={activeField.soil_texture === 'loam' ? (lang === 'bn' ? 'দোআঁশ' : 'Loam')
                    : activeField.soil_texture === 'clay' ? (lang === 'bn' ? 'এঁটেল' : 'Clay')
                    : (activeField.soil_texture || (lang === 'bn' ? 'দোআঁশ' : 'Loam'))}
                />
              </div>
            </div>
          ) : (
            <EmptyState
              icon="🗺️"
              title={lang === 'bn' ? 'কোনো জমি নির্বাচন করা নেই' : 'No Active Field'}
              description={lang === 'bn' ? 'ডেমো খামার ব্যবহার করুন অথবা নতুন জমি যোগ করুন।' : 'Load demo field or add a new parcel.'}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectField && onSelectField({ id: 'demo' }, false)}
                >
                  {lang === 'bn' ? 'ডেমো খামার লোড করুন' : 'Load Demo Field'}
                </Button>
              }
            />
          )}

          <div style={{ marginTop: 12 }}>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: '100%' }}
              onClick={() => onNavigate('crop_advice')}
            >
              🌾 {lang === 'bn' ? 'জমির সেরা ফসল দেখুন' : 'Best Crops for Land'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Row 3: Clay 3D Farm Card Full Width (12 cols) with Floating Shadow */}
      <Card variant="glass" style={{ padding: 20 }}>
        <FarmerFarm3D
          activeField={activeField}
          userFields={userFields}
          onSelectField={onSelectField}
          recommendedCrop="Rice"
          nasa={nasa}
          lang={lang}
        />
      </Card>

      {/* Row 4: Quick Actions as 4 Equal Glass Tiles (3 cols each) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
        {/* Tile 1: Crop Advice */}
        <Card
          variant="glass"
          style={{ gridColumn: 'span 3', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={() => onNavigate('crop_advice')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>🌱</span>
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>➔</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {t('action_crop_advice_title')}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {t('action_crop_advice_desc')}
            </p>
          </div>
        </Card>

        {/* Tile 2: NASA Weather */}
        <Card
          variant="glass"
          style={{ gridColumn: 'span 3', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={() => onNavigate('weather')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>🌦️</span>
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>➔</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {t('action_weather_title')}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {t('action_weather_desc')}
            </p>
          </div>
        </Card>

        {/* Tile 3: Market Prices */}
        <Card
          variant="glass"
          style={{ gridColumn: 'span 3', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={() => onNavigate('market')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>💰</span>
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>➔</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {t('action_market_title')}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {t('action_market_desc')}
            </p>
          </div>
        </Card>

        {/* Tile 4: Profit Calculator */}
        <Card
          variant="glass"
          style={{ gridColumn: 'span 3', padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={() => onNavigate('harvest_profit')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 28 }}>📋</span>
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>➔</span>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {t('action_profit_title')}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {t('action_profit_desc')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
