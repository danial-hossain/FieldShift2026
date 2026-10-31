// frontend/src/MyFarmWorkspaceView.jsx
// My Farm & Parcel Workspace for FieldShift 2026
// Sub-navigation: Farm Overview, Field Parcels, Field Map, Soil Information, Field History.

import React, { useState } from 'react';
import { FieldParcelManagerView } from './FieldParcelManagerView.jsx';
import { GoogleFieldMapPicker } from './GoogleFieldMapPicker.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';
import { Card, CardHeader, Stat, Pill, Button, Tabs, EmptyState } from './ui/index.js';

export function MyFarmWorkspaceView({
  activeField,
  user,
  userFields = [],
  onSelectField,
  lang = 'bn',
  onNavigate,
  initialSubTab = 'overview',
}) {
  const { t } = useTranslation(lang);
  const [subTab, setSubTab] = useState(initialSubTab);

  // A1: Existing Rotation Baseline State
  const [existingRotation, setExistingRotation] = useState(() => {
    if (activeField?.existing_rotation && typeof activeField.existing_rotation === 'object') {
      return activeField.existing_rotation;
    }
    return {
      rabi: activeField?.previous_crop || 'Boro Rice',
      kharif1: 'Fallow',
      kharif2: 'Rice',
    };
  });
  const [baselineSaved, setBaselineSaved] = useState(false);
  const handleSaveBaseline = () => {
    if (!activeField) return;
    const updated = {
      ...activeField,
      existing_rotation: existingRotation,
      previous_crop: existingRotation.rabi,
    };
    if (typeof onSelectField === 'function') {
      onSelectField(updated);
    }
    setBaselineSaved(true);
    setTimeout(() => setBaselineSaved(false), 3000);
  };


  const fallbackText = lang === 'bn' ? 'তথ্য নেই' : 'No data';

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : null;
  const areaBigha = areaHa != null ? (areaHa * 7.47).toFixed(1) : null;
  const areaDisplay = areaHa != null
    ? `${formatNumber(areaHa, 2)} ${lang === 'bn' ? 'হেক্টর' : 'ha'} (${areaBigha} ${lang === 'bn' ? 'বিঘা' : 'bigha'})`
    : fallbackText;

  const soilTexture = activeField?.soil_texture || 'loam';

  const subTabs = [
    { id: 'overview', label: lang === 'bn' ? 'খামারের সারসংক্ষেপ' : '1. Overview', icon: '🏠' },
    { id: 'parcels', label: lang === 'bn' ? 'জমির তালিকা' : '2. Parcels', icon: '📋' },
    { id: 'map', label: lang === 'bn' ? 'স্যাটেলাইট ম্যাপ' : '3. Field Map', icon: '🗺️' },
    { id: 'soil', label: lang === 'bn' ? 'মাটির বৈশিষ্ট্য' : '4. Soil Info', icon: '🌱' },
    { id: 'history', label: lang === 'bn' ? 'ফসলের ইতিহাস' : '5. History', icon: '📜' },
  ];

  const SOIL_TEXTURE_DATA = {
    clay_loam: { label: 'Clay Loam (এটেল দোআঁশ)', fc: '32%', pwp: '18%', sand: 32, silt: 34, clay: 34, cond: '0.8 cm/hr' },
    loam: { label: 'Medium Loam (পলি দোআঁশ)', fc: '28%', pwp: '14%', sand: 40, silt: 40, clay: 20, cond: '1.5 cm/hr' },
    silty_loam: { label: 'Silty Loam (সিল্ট দোআঁশ)', fc: '31%', pwp: '15%', sand: 20, silt: 65, clay: 15, cond: '1.2 cm/hr' },
    sandy_loam: { label: 'Sandy Loam (বেলে দোআঁশ)', fc: '21%', pwp: '9%', sand: 65, silt: 25, clay: 10, cond: '3.2 cm/hr' },
    clay: { label: 'Heavy Clay (ভারী এটেল)', fc: '36%', pwp: '22%', sand: 10, silt: 45, clay: 45, cond: '0.2 cm/hr' },
  };

  const currentSoil = SOIL_TEXTURE_DATA[soilTexture] || SOIL_TEXTURE_DATA.loam;

  return (
    <div className="my-farm-workspace" style={{ padding: '8px 0 32px 0', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Top Banner & Sub-Navigation */}
      <Card variant="glass" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>🗺️🌱</span>
              <Pill tone="leaf">FIELD PARCEL &amp; SOIL REGISTRY</Pill>
              <Pill tone={activeField ? 'water' : 'neutral'}>
                {activeField?.name || (lang === 'bn' ? 'কোনো জমি নির্বাচিত নেই' : 'No Field Selected')}
              </Pill>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'bn' ? 'আমার জমি, সীমানা ও মাটির তথ্য' : 'My Farm: Parcels, Soil & Boundaries'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'গুগল স্যাটেলাইট ম্যাপে জমির সীমানা নির্ধারণ, পোস্টগ্রিসকিউএল পার্সেল রেজিস্ট্রি, মাটির পিএইচ (pH) ও জৈব পদার্থ এবং ঐতিহাসিক ফসল আবর্তন।'
                : 'Interactive Google Maps boundary mapping, PostgreSQL parcel management, soil chemistry diagnostics, and historical management logging.'}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <Tabs
            tabs={subTabs}
            activeTab={subTab}
            onChange={setSubTab}
          />
        </div>
      </Card>

      {/* SUB-TAB 1: FARM OVERVIEW */}
      {subTab === 'overview' && !activeField && (
        <Card variant="glass" style={{ padding: 36, textAlign: 'center' }}>
          <EmptyState
            icon="🗺️"
            title={lang === 'bn' ? 'কোনো জমি নির্বাচিত নেই' : 'No Field Selected'}
            description={lang === 'bn' ? 'কার্যক্রম শুরু করতে একটি ডেমো খামার লোড করুন অথবা আপনার নতুন জমি যুক্ত করুন।' : 'Load a demo farm or register a new field parcel to begin.'}
            action={
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const demo = userFields.find(f => f.id === 'demo' || f.name?.includes('ডেমো') || f.name?.includes('Demo')) || {
                      id: 'demo',
                      name: lang === 'bn' ? 'বগুড়া পরীক্ষামূলক খামার' : 'Bogura Demo Field',
                      district: 'bogura',
                      area_ha: 10.0,
                      soil_texture: 'loam',
                      soil_ph: 6.5,
                      organic_matter_pct: 1.8,
                      irrigation_capacity_mm: 450
                    };
                    if (onSelectField) onSelectField(demo);
                  }}
                >
                  {lang === 'bn' ? 'ডেমো খামার লোড করুন' : 'Load Demo Farm'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSubTab('parcels')}
                >
                  {lang === 'bn' ? 'নতুন জমি যোগ করুন' : 'Add New Field'}
                </Button>
              </div>
            }
          />
        </Card>
      )}

      {/* SUB-TAB 1: FARM OVERVIEW (ACTIVE FIELD) */}
      {subTab === 'overview' && activeField && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <Card variant="glass">
            <CardHeader
              icon="🌱"
              title={lang === 'bn' ? 'সক্রিয় জমির প্রোফাইল' : 'Active Field Profile'}
              subtitle={lang === 'bn' ? 'প্রাকৃতিক বৈশিষ্ট্য ও স্থানাঙ্ক' : 'Physical characteristics & location'}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 8 }}>
              <Stat
                label={lang === 'bn' ? 'জমির নাম' : 'Field Name'}
                value={activeField?.name || fallbackText}
                tone="leaf"
              />
              <Stat
                label={lang === 'bn' ? 'আয়তন (হেক্টর ও বিঘা)' : 'Area (ha & bigha)'}
                value={areaDisplay}
                tone="accent"
              />
              <Stat
                label={lang === 'bn' ? 'ভৌগোলিক স্থানাঙ্ক' : 'Coordinates'}
                value={activeField?.latitude != null && activeField?.longitude != null
                  ? `${activeField.latitude}° N, ${activeField.longitude}° E`
                  : fallbackText}
                tone="water"
              />
              <Stat
                label={lang === 'bn' ? 'মাটির গঠন' : 'Soil Texture'}
                value={activeField?.soil_texture ? currentSoil.label : fallbackText}
                tone="sun"
              />
              <Stat
                label={lang === 'bn' ? 'মাটির অম্লতা (pH)' : 'Soil pH'}
                value={activeField?.soil_ph != null ? activeField.soil_ph : fallbackText}
                sub={activeField?.soil_ph != null ? (activeField.soil_ph < 6 ? 'Acidic' : activeField.soil_ph > 7.5 ? 'Alkaline' : 'Neutral') : undefined}
                tone="neutral"
              />
              <Stat
                label={lang === 'bn' ? 'জৈব পদার্থ (OM)' : 'Organic Matter'}
                value={activeField?.organic_matter != null ? `${activeField.organic_matter}%` : fallbackText}
                sub={activeField?.organic_matter != null ? 'BARI target >= 2.0%' : undefined}
                tone="leaf"
              />
            </div>
          </Card>

          <Card variant="glass">
            <CardHeader
              icon="⚡"
              title={lang === 'bn' ? 'দ্রুত পদক্ষেপ' : 'Quick Actions'}
              subtitle={lang === 'bn' ? 'সরাসরি সম্পাদন ও বিশ্লেষণ' : 'Direct editing and navigation'}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={() => setSubTab('map')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <span>🗺️</span>
                <span>{lang === 'bn' ? 'স্যাটেলাইট ম্যাপে পিন ও সীমানা পরিবর্তন করুন ➔' : 'Update Satellite Pin & Boundary ➔'}</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSubTab('parcels')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <span>📋</span>
                <span>{lang === 'bn' ? 'নতুন জমি যোগ বা সম্পাদনা করুন (PostgreSQL CRUD) ➔' : 'Manage & Add Field Parcels ➔'}</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => onNavigate && onNavigate('crop_advice')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <span>🌾</span>
                <span>{lang === 'bn' ? 'এই জমির জন্য নাসা রোপণ পরামর্শ দেখুন ➔' : 'View NASA Planting Advisory ➔'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SUB-TAB 2: PARCELS CRUD */}
      {subTab === 'parcels' && (
        <FieldParcelManagerView
          activeField={activeField}
          user={user}
          userFields={userFields}
          onSelectField={onSelectField}
          lang={lang}
        />
      )}

      {/* SUB-TAB 3: GOOGLE FIELD MAP PICKER */}
      {subTab === 'map' && (
        <Card variant="glass">
          <CardHeader
            icon="🗺️"
            title={lang === 'bn' ? 'গুগল স্যাটেলাইট ম্যাপ পিকার ও স্থানাঙ্ক নির্বাচন' : 'Google Satellite Field Map & Coordinate Picker'}
            subtitle={lang === 'bn' ? 'মার্কার টেনে স্থানাঙ্ক নির্ধারণ করুন, নাসার টেলিমিতি স্বয়ংক্রিয় আপডেট হবে' : 'Click or drag marker to update field coordinates. Two-way binding updates live NASA telemetry.'}
          />
          {activeField?.latitude != null && activeField?.longitude != null ? (
            <div style={{ height: 460, borderRadius: 14, overflow: 'hidden', marginTop: 12, border: '1px solid var(--line)' }}>
              <GoogleFieldMapPicker
                latitude={Number(activeField.latitude)}
                longitude={Number(activeField.longitude)}
                onChange={(lat, lng) => {
                  console.log('Selected coordinates:', lat, lng);
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 36 }}>
              <EmptyState
                icon="🗺️"
                title={lang === 'bn' ? 'কোনো জমি নির্বাচিত নেই' : 'No Field Selected'}
                description={lang === 'bn' ? 'ম্যাপে স্থানাঙ্ক দেখতে ও পরিবর্তন করতে প্রথমে একটি জমি নির্বাচন করুন।' : 'Select or add a field parcel first to view and edit coordinates on the map.'}
                action={
                  <Button variant="secondary" size="sm" onClick={() => setSubTab('parcels')}>
                    {lang === 'bn' ? 'জমির তালিকা দেখুন' : 'View Parcels'}
                  </Button>
                }
              />
            </div>
          )}
        </Card>
      )}

      {/* SUB-TAB 4: SOIL INFORMATION */}
      {subTab === 'soil' && (
        <Card variant="glass">
          <CardHeader
            icon="🌱"
            title={lang === 'bn' ? 'মাটির ভৌত বৈশিষ্ট্য ও পানি ধারণ ক্ষমতা (BARI Standard)' : 'Soil Physics & Water Retention Parameters'}
            subtitle={lang === 'bn' ? 'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট মানদণ্ড' : 'BARI hydrological soil parameters'}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '14px 0' }}>
            <Stat
              label={lang === 'bn' ? 'ক্ষেত্র ধারণক্ষমতা (FC)' : 'Field Capacity'}
              value={currentSoil.fc}
              sub="Volumetric water at -33 kPa"
              tone="water"
            />
            <Stat
              label={lang === 'bn' ? 'শুষ্কতা বিন্দু (PWP)' : 'Permanent Wilting Point'}
              value={currentSoil.pwp}
              sub="Volumetric water at -1500 kPa"
              tone="alert"
            />
            <Stat
              label={lang === 'bn' ? 'পানি প্রবেশের হার (Conductivity)' : 'Hydraulic Conductivity'}
              value={currentSoil.cond}
              sub="Saturated infiltration velocity"
              tone="leaf"
            />
          </div>
          <Card variant="glass-strong" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
            <strong style={{ color: 'var(--text)' }}>Mechanical Composition:</strong> Sand: {currentSoil.sand}% • Silt: {currentSoil.silt}% • Clay: {currentSoil.clay}%
          </Card>
        </Card>
      )}

      {/* SUB-TAB 5: EXISTING ROTATION BASELINE & HISTORY (A1) */}
      {subTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 1. Existing Rotation Baseline Input Form */}
          <Card variant="glass">
            <CardHeader
              icon="🚜"
              title={lang === 'bn' ? 'বিদ্যমান ফসল আবর্তন বেসলাইন (Existing Rotation Practice)' : 'Current Rotation Baseline (Farmer Practice)'}
              subtitle={lang === 'bn' ? 'আপনার খামারে প্রচলিত ৩-মৌসুমের ফসল চক্র নির্ধারণ করুন, যা অপ্টিমাইজারের সাথে তুলনার মানদণ্ড হিসেবে ব্যবহৃত হবে।' : 'Configure your actual seasonal rotation baseline to benchmark against MILP optimization strategies.'}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveBaseline}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span>{baselineSaved ? '✓' : '💾'}</span>
                  <span>{baselineSaved ? (lang === 'bn' ? 'সংরক্ষিত হয়েছে' : 'Baseline Saved') : (lang === 'bn' ? 'বেসলাইন সংরক্ষণ' : 'Save Baseline')}</span>
                </Button>
              }
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '16px 0' }}>
              {/* Rabi Crop Selector */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--leaf)', marginBottom: 6, textTransform: 'uppercase' }}>
                  ১. রবি মৌসুম (Rabi: Nov - Apr)
                </label>
                <select
                  value={existingRotation.rabi}
                  onChange={e => setExistingRotation({ ...existingRotation, rabi: e.target.value })}
                  style={{ width: '100%', background: '#0b131a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="Boro Rice">বোরো ধান (Boro Rice - High Water)</option>
                  <option value="Wheat">গম (Wheat)</option>
                  <option value="Potato">গোল আলু (Potato - Cash Crop)</option>
                  <option value="Mustard">সরিষা (Mustard - Oilseed)</option>
                  <option value="Lentil">মসুর ডাল (Lentil - Legume BNF)</option>
                  <option value="Chickpea">ছোলা (Chickpea - Legume BNF)</option>
                  <option value="Sunflower">সূর্যমুখী (Sunflower)</option>
                  <option value="Maize">ভুট্টা (Maize)</option>
                  <option value="Tomato">টমেটো (Tomato)</option>
                  <option value="Fallow">পতিত জমি (Fallow / Rest)</option>
                </select>
              </div>

              {/* Kharif-1 Crop Selector */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--water)', marginBottom: 6, textTransform: 'uppercase' }}>
                  ২. খরিফ-১ মৌসুম (Kharif-1: Apr - Jun)
                </label>
                <select
                  value={existingRotation.kharif1}
                  onChange={e => setExistingRotation({ ...existingRotation, kharif1: e.target.value })}
                  style={{ width: '100%', background: '#0b131a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="Fallow">পতিত জমি (Fallow / Common Practice)</option>
                  <option value="Aus Rice">আউশ ধান (Aus Rice)</option>
                  <option value="Mungbean">মুগডাল (Mungbean - Legume BNF)</option>
                  <option value="Sesame">তিল (Sesame)</option>
                  <option value="Jute">পাট (Jute - Green Residue)</option>
                  <option value="Maize">গ্রীষ্মকালীন ভুট্টা (Summer Maize)</option>
                </select>
              </div>

              {/* Kharif-2 Crop Selector */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sun)', marginBottom: 6, textTransform: 'uppercase' }}>
                  ৩. খরিফ-২ মৌসুম (Kharif-2: Jul - Oct)
                </label>
                <select
                  value={existingRotation.kharif2}
                  onChange={e => setExistingRotation({ ...existingRotation, kharif2: e.target.value })}
                  style={{ width: '100%', background: '#0b131a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="Rice">রোপা আমন ধান (T.Aman Rice - Monsoon)</option>
                  <option value="Fallow">পতিত জমি (Fallow - Waterlogged Basin)</option>
                </select>
              </div>
            </div>

            {/* Instant Baseline Agronomic Diagnostics */}
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 10, padding: '14px 18px', marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--water)', marginBottom: 8 }}>
                🔬 {lang === 'bn' ? 'বিদ্যমান ফসল চক্রের কৃষি-পরিবেশগত মূল্যায়ন:' : 'Baseline Agro-Ecological Diagnostics:'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>{lang === 'bn' ? 'বার্ষিক আনুমানিক লাভ:' : 'Est. Annual Net Margin:'}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--leaf)', marginTop: 2 }}>
                    {existingRotation.rabi === 'Potato' ? '৳ ২,৪০,০০০ / হেক্টর' : existingRotation.rabi === 'Boro Rice' ? '৳ ১,২০,০০০ / হেক্টর' : '৳ ১,৬৫,০০০ / হেক্টর'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>{lang === 'bn' ? 'ভূগর্ভস্থ সেচ চাহিদা:' : 'Irrigation Water Load:'}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: existingRotation.rabi === 'Boro Rice' ? '#f87171' : 'var(--water)', marginTop: 2 }}>
                    {existingRotation.rabi === 'Boro Rice' ? '১,২০০ মিমি (উচ্চ চাপ)' : existingRotation.rabi === 'Potato' ? '৪৮০ মিমি' : '৩৫০ মিমি (সাশ্রয়ী)'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>{lang === 'bn' ? 'ডাল ফসল / নাইট্রোজেন:' : 'Legume BNF Balance:'}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: (existingRotation.rabi === 'Lentil' || existingRotation.rabi === 'Chickpea' || existingRotation.kharif1 === 'Mungbean') ? 'var(--leaf)' : '#f59e0b', marginTop: 2 }}>
                    {(existingRotation.rabi === 'Lentil' || existingRotation.rabi === 'Chickpea' || existingRotation.kharif1 === 'Mungbean') ? '+৪২ কেজি N/হেক্টর' : '০ কেজি (নাইট্রোজেন ক্ষয়)'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)' }}>{lang === 'bn' ? 'নগ্ন মাটি অনাবৃত দিন:' : 'Bare Soil Exposure:'}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: existingRotation.kharif1 === 'Fallow' ? '#f87171' : 'var(--leaf)', marginTop: 2 }}>
                    {existingRotation.kharif1 === 'Fallow' ? '৭৫ দিন (উচ্চ ক্ষয় ঝুঁকি)' : '২৫ দিন (কভার শস্য রক্ষিত)'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Historical Past Yield Records */}
          <Card variant="glass">
            <CardHeader
              icon="📜"
              title={lang === 'bn' ? 'ঐতিহাসিক ফলন ও সেচ লগ' : 'Historical Past Yield & Irrigation Log'}
              subtitle={lang === 'bn' ? 'বিগত মৌসুমসমূহের নথিভুক্ত ফলন ও মাটির পুষ্টি উপাত্ত' : 'Archived seasonal yield logs and soil nutrient balance'}
            />
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'মৌসুম ও বছর' : 'Season'}</th>
                    <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'উৎপাদিত ফসল' : 'Crop'}</th>
                    <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ফলন' : 'Yield'}</th>
                    <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সেচ' : 'Water Applied'}</th>
                    <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'মাটির প্রভাব' : 'Soil Impact'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { season: '2025 Rabi', crop: 'Potato (গোল আলু)', yield: '24.5 t/ha (61 maund/bigha)', water: '480 mm', impact: 'High nutrient depletion' },
                    { season: '2025 Kharif-1', crop: 'Mungbean (মুগডাল)', yield: '1.4 t/ha (3.5 maund/bigha)', water: '320 mm', impact: 'BNF +42 kg N/ha enrichment' },
                    { season: '2025 Kharif-2', crop: 'BRRI dhan75 (আমন ধান)', yield: '4.8 t/ha (12 maund/bigha)', water: '850 mm', impact: 'Cereal residue retained' },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>{row.season}</td>
                      <td style={{ padding: '12px', color: 'var(--leaf)', fontWeight: 700 }}>{row.crop}</td>
                      <td style={{ padding: '12px', color: 'var(--water)' }}>{row.yield}</td>
                      <td style={{ padding: '12px', color: 'var(--sun)' }}>{row.water}</td>
                      <td style={{ padding: '12px', color: 'var(--text-2)' }}>{row.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

export default MyFarmWorkspaceView;
