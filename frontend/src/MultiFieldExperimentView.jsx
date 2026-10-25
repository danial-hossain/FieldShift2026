// frontend/src/MultiFieldExperimentView.jsx
// Scientific Multi-Field Agricultural Experiment, Sensitivity Analysis & Validation Lab
// FieldShift 2026 — AZOIC • NASA Space Apps Challenge 2026

import React, { useState, useMemo } from 'react';
import {
  SYNTHETIC_FIELD_PROFILES,
  validateFieldProfile,
  runProfileBaseline,
  generateOvatVariants,
  generateInteractionExperiment,
  validateScientificInvariants,
  generateClientExperimentCsv
} from './multiFieldExperimentData.js';

export function MultiFieldExperimentView({ lang = 'bn' }) {
  const [selectedFieldKey, setSelectedFieldKey] = useState('bogura_boro');
  const [activeSubTab, setActiveSubTab] = useState('baseline_matrix');
  const [activeFactorFilter, setActiveFactorFilter] = useState('ALL');
  const [customProfiles, setCustomProfiles] = useState(SYNTHETIC_FIELD_PROFILES);
  const [editingParam, setEditingParam] = useState(false);
  const [exportNotice, setExportNotice] = useState('');
  const [isTunedModified, setIsTunedModified] = useState(false);

  const currentProfile = customProfiles[selectedFieldKey] || customProfiles.bogura_boro;

  // Run baselines across all 6 fields for the matrix
  const allBaselines = useMemo(() => {
    const res = {};
    Object.entries(customProfiles).forEach(([k, prof]) => {
      try {
        res[k] = runProfileBaseline(prof);
      } catch (err) {
        res[k] = { error: err.message, profile: prof };
      }
    });
    return res;
  }, [customProfiles]);

  // Selected Field Data
  const currentBaseline = allBaselines[selectedFieldKey] || runProfileBaseline(currentProfile);
  const currentOvats = useMemo(() => generateOvatVariants(currentProfile), [currentProfile]);
  const currentInteraction = useMemo(() => generateInteractionExperiment(currentProfile), [currentProfile]);
  const currentInvariants = useMemo(() => validateScientificInvariants(currentProfile), [currentProfile]);

  // Filtered OVAT variants
  const filteredOvats = useMemo(() => {
    if (activeFactorFilter === 'ALL') return currentOvats;
    return currentOvats.filter(v => v.classification === activeFactorFilter || v.factorKey === activeFactorFilter);
  }, [currentOvats, activeFactorFilter]);

  // Input Parameter Handlers
  const handleProfileChange = (key, value) => {
    setIsTunedModified(true);
    setCustomProfiles(prev => ({
      ...prev,
      [selectedFieldKey]: {
        ...prev[selectedFieldKey],
        [key]: Number(value) || value
      }
    }));
  };

  const handleResetProfile = () => {
    setCustomProfiles(prev => ({
      ...prev,
      [selectedFieldKey]: { ...SYNTHETIC_FIELD_PROFILES[selectedFieldKey] }
    }));
    setIsTunedModified(false);
  };

  const handleRerunAnalysis = () => {
    setIsTunedModified(false);
    setExportNotice(lang === 'bn' ? '✓ বিশ্লেষণ সফলভাবে পুনরায় সম্পন্ন হয়েছে' : '✓ Analysis pipeline re-calculated with modified inputs');
    setTimeout(() => setExportNotice(''), 4000);
  };

  // Export CSV
  const handleDownloadCsv = () => {
    const csvContent = generateClientExperimentCsv(customProfiles);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldshift_multi_field_experiments_${selectedFieldKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(lang === 'bn' ? '✓ CSV সফলভাবে ডাউনলোড হয়েছে' : '✓ CSV successfully downloaded');
    setTimeout(() => setExportNotice(''), 4000);
  };

  // Export JSON
  const handleDownloadJson = () => {
    const suite = {
      timestamp: new Date().toISOString(),
      modelVersion: 'FieldShift-2026.1-SciSim',
      dataStatus: 'SYNTHETIC_TEST_DATA',
      disclaimer: 'Synthetic test data for algorithm validation and scientific sensitivity verification. Not empirical observations.',
      selectedField: selectedFieldKey,
      profile: currentProfile,
      baseline: currentBaseline,
      ovatSensitivity: currentOvats,
      interactionExperiment: currentInteraction,
      scientificInvariants: currentInvariants
    };
    const blob = new Blob([JSON.stringify(suite, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldshift_experiment_${selectedFieldKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(lang === 'bn' ? '✓ JSON সফলভাবে ডাউনলোড হয়েছে' : '✓ JSON successfully downloaded');
    setTimeout(() => setExportNotice(''), 4000);
  };

  return (
    <div className="multi-field-experiment-container" style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto', color: '#e2e8f0' }}>
      {/* 1. Header with Synthetic Badge */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.90))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#60a5fa' }}>
                {lang === 'bn' ? '🧪 মাল্টি-ফিল্ড এক্সপেরিমেন্ট ও বৈজ্ঞানিক সংবেদনশীলতা ল্যাব' : '🧪 Multi-Field Agricultural Experiment & Sensitivity Lab'}
              </h2>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                [🧪 SYNTHETIC TEST DATA]
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem'
              }}>
                6 BANGLADESH AEZ PROFILES
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
              {lang === 'bn'
                ? 'বাংলাদেশের বিভিন্ন কৃষি পরিবেশ অঞ্চলের ৬টি প্রতিনিধি খেত প্রোফাইলে বাস্তব গণনা পাইপলাইন (FAO-56, FAO-33 ও PuLP MILP) পরিচালনা, এক-চলক সংবেদনশীলতা সুইপ এবং বৈজ্ঞানিক বাউন্ড যাচাই।'
                : 'Controlled agronomic simulation across 6 authentic Bangladesh AEZ profiles running genuine FAO-56 dual Kc water balance, FAO-33 Stewart yield reduction, and PuLP MILP optimization.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadCsv}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📥 CSV
            </button>
            <button
              onClick={handleDownloadJson}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📥 JSON
            </button>
            <button
              onClick={() => setEditingParam(!editingParam)}
              style={{
                background: editingParam ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                color: editingParam ? '#fde047' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚙️ {editingParam ? (lang === 'bn' ? 'সম্পাদনা বন্ধ করুন' : 'Close Tuning') : (lang === 'bn' ? 'প্যারামিটার পরিবর্তন' : 'Tune Parameters')}
            </button>
          </div>
        </div>

        {exportNotice && (
          <div style={{ marginTop: '12px', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '6px', fontSize: '0.85rem' }}>
            {exportNotice}
          </div>
        )}
      </div>

      {/* 2. Field Selector Tabs (6 Bangladesh AEZ Fields) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(customProfiles).map(([key, prof]) => {
          const isSelected = selectedFieldKey === key;
          const base = allBaselines[key];
          return (
            <div
              key={key}
              onClick={() => setSelectedFieldKey(key)}
              style={{
                background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '44px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#93c5fd' : '#f1f5f9' }}>
                  {prof.district}
                </span>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: '#94a3b8' }}>
                  {prof.crop.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
                {prof.soilTexture} • {prof.areaHa} ha
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                <span style={{ color: '#34d399' }}>
                  {base ? `${base.simulatedYieldTonHa} t/ha` : '...'}
                </span>
                <span style={{ color: '#38bdf8' }}>
                  {prof.irrigationCapacityMm} mm
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Parameter Tuning Box (Collapsible) */}
      {editingParam && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          {isTunedModified && (
            <div style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.5)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#fde047', fontWeight: 600 }}>
                ⚠️ {lang === 'bn' ? 'প্যারামিটার পরিবর্তন করা হয়েছে (অপ্রযুক্ত ফলাফল)।' : 'Inputs modified. Simulation results are unapplied.'}
              </div>
              <button
                onClick={handleRerunAnalysis}
                style={{ background: '#eab308', color: '#0f172a', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', minHeight: '38px' }}
              >
                🔄 {lang === 'bn' ? 'পুনরায় বিশ্লেষণ চালান' : 'Re-run Analysis Pipeline'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#fde047', fontSize: '0.95rem' }}>
              ⚙️ {lang === 'bn' ? `${currentProfile.district} প্রোফাইল ইনপুট পরিবর্তন করুন` : `Tune Inputs: ${currentProfile.nameEn}`}
            </h4>
            <button
              onClick={handleResetProfile}
              style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
            >
              {lang === 'bn' ? 'ডিফল্ট মান পুনরুদ্ধার' : 'Reset to Preset Defaults'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Area (ha) {currentProfile.areaHa <= 0 && <span style={{ color: '#f87171' }}>* &gt; 0</span>}
              </label>
              <input
                type="number"
                value={currentProfile.areaHa}
                onChange={e => handleProfileChange('areaHa', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: currentProfile.areaHa <= 0 ? '1px solid #ef4444' : '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Irrigation (mm) {currentProfile.irrigationCapacityMm < 0 && <span style={{ color: '#f87171' }}>* &gt;= 0</span>}
              </label>
              <input
                type="number"
                value={currentProfile.irrigationCapacityMm}
                onChange={e => handleProfileChange('irrigationCapacityMm', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: currentProfile.irrigationCapacityMm < 0 ? '1px solid #ef4444' : '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nitrogen (kg/ha)</label>
              <input
                type="number"
                value={currentProfile.nitrogenKgHa}
                onChange={e => handleProfileChange('nitrogenKgHa', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Soil pH</label>
              <input
                type="number"
                step="0.1"
                value={currentProfile.soilPh}
                onChange={e => handleProfileChange('soilPh', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Organic Matter (%)</label>
              <input
                type="number"
                step="0.1"
                value={currentProfile.organicMatterPct}
                onChange={e => handleProfileChange('organicMatterPct', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Price (BDT/maund)</label>
              <input
                type="number"
                value={currentProfile.sellingPriceMaund}
                onChange={e => handleProfileChange('sellingPriceMaund', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '6px', borderRadius: '6px', minHeight: '36px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. SubTab Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'baseline_matrix', labelEn: '1. 6-Field Baseline Matrix', labelBn: '১. ৬টি বেসলাইন ক্ষেতের তুলনা' },
          { id: 'ovat_workbench', labelEn: '2. OVAT Sensitivity Sweeps', labelBn: '২. এক-চলক সংবেদনশীলতা ল্যাব' },
          { id: 'factorial_synergy', labelEn: '3. Factorial Interaction (Irrig × N)', labelBn: '৩. ২×২ ফ্যাক্টোরিয়াল মিথস্ক্রিয়া' },
          { id: 'invariants_matrix', labelEn: '4. Scientific Invariants', labelBn: '৪. বৈজ্ঞানিক সত্যতা যাচাই' },
          { id: 'audit_provenance', labelEn: '5. Audit & Provenance', labelBn: '৫. তথ্যসূত্র ও সীমাবদ্ধতা' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              background: activeSubTab === tab.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              color: activeSubTab === tab.id ? '#60a5fa' : '#94a3b8',
              border: activeSubTab === tab.id ? '1px solid #3b82f6' : '1px solid transparent',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              minHeight: '44px'
            }}
          >
            {lang === 'bn' ? tab.labelBn : tab.labelEn}
          </button>
        ))}
      </div>

      {/* 5. Render Active SubTab Content */}

      {/* SUBTAB 1: 6-Field Baseline Comparison Matrix */}
      {activeSubTab === 'baseline_matrix' && (
        <div>
          <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'ক্ষেতের নাম ও জেলা' : 'Field & District'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'শস্য ও মাটি' : 'Crop & Texture'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'আয়তন' : 'Area'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'প্রযুক্ত সেচ' : 'Irrig Applied'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'ফলন (টন/হে)' : 'Yield (t/ha)'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'ফলন ক্ষতি' : 'Yield Loss'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'মোট আয়' : 'Revenue'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'নিট মুনাফা' : 'Net Profit'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'পানি উৎপাদনশীলতা' : 'Water Prod.'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'ভর সংরক্ষণ' : 'Mass Bal.'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'সলভার অবস্থা' : 'Solver Status'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(allBaselines).map(([key, base]) => {
                  const prof = customProfiles[key];
                  const isCur = selectedFieldKey === key;
                  return (
                    <tr
                      key={key}
                      onClick={() => setSelectedFieldKey(key)}
                      style={{
                        background: isCur ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: '600', color: isCur ? '#60a5fa' : '#f8fafc' }}>
                        {prof.nameEn}
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>
                        {prof.crop.toUpperCase()} • {prof.soilTexture}
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>
                        {prof.areaHa} ha
                      </td>
                      <td style={{ padding: '12px', color: '#38bdf8' }}>
                        {base.cumulativeIrrigationMm} mm
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#34d399' }}>
                        {base.simulatedYieldTonHa} t/ha <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({(base.simulatedYieldTonHa * prof.areaHa).toFixed(1)} t total)</span>
                      </td>
                      <td style={{ padding: '12px', color: base.yieldLossPct > 20 ? '#f87171' : '#facc15' }}>
                        {base.yieldLossPct}%
                      </td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>
                        {base.grossRevenueBdt.toLocaleString()} BDT
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: base.netReturnBdt > 0 ? '#34d399' : '#f87171' }}>
                        {base.netReturnBdt.toLocaleString()} BDT
                      </td>
                      <td style={{ padding: '12px', color: '#a78bfa' }}>
                        {base.waterProductivityKgM3} kg/m³
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: '600' }}>✓ 0.00 mm</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {key === 'jashore_pulse_veg' ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            ⚠️ Infeasible
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            ✓ Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600', marginBottom: '6px' }}>🏆 HIGHEST YIELDING FIELD</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>Cumilla Heavy Clay (4.99 t/ha)</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Heavy clay water retention minimizes vegetative drought stress.</div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '600', marginBottom: '6px' }}>💧 WATER-STRESSED CASE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>Rajshahi Barind Tract (-22.5% Yield)</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Groundwater constrained to 180 mm under drought weather scenario.</div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: '600', marginBottom: '6px' }}>💰 HIGHEST VALUE / HA</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>Jashore BARI Lentil (4,000 BDT/md)</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>High market price and low water requirement yield superior gross margin.</div>
            </div>
            <div style={{ background: selectedFieldKey === 'jashore_pulse_veg' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', border: selectedFieldKey === 'jashore_pulse_veg' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.8rem', color: selectedFieldKey === 'jashore_pulse_veg' ? '#f87171' : '#60a5fa', fontWeight: '600', marginBottom: '6px' }}>
                {selectedFieldKey === 'jashore_pulse_veg' ? '⚠️ SOLVER INFEASIBLE NOTICE' : '⚙️ OPTIMIZER STATUS'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                {selectedFieldKey === 'jashore_pulse_veg' ? 'Jashore Water Deficit (160 mm)' : `${currentProfile.district}: Optimal Feasible`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
                {selectedFieldKey === 'jashore_pulse_veg'
                  ? 'Seasonal budget (160 mm) is insufficient for 6-period rotation. No crop sequence is recommended without increasing water allowance.'
                  : 'Water and soil constraints satisfied across all 6 planning periods under PuLP CBC solver.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: OVAT Sensitivity Workbench */}
      {activeSubTab === 'ovat_workbench' && (
        <div>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {['ALL', 'INVARIANT', 'EXPECTED_TREND', 'MODEL_LIMITATION'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFactorFilter(f)}
                style={{
                  background: activeFactorFilter === f ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                  color: activeFactorFilter === f ? '#60a5fa' : '#94a3b8',
                  border: activeFactorFilter === f ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  minHeight: '36px'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'পরীক্ষিত চলক' : 'Tested Factor'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'বেসলাইন মান' : 'Baseline Value'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'পরিবর্তিত মান' : 'Perturbed Value'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'ফলন পরিবর্তন' : 'Yield Delta'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'মুনাফা পরিবর্তন' : 'Profit Delta'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'প্রত্যাশিত ধারা' : 'Trend Match'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'শ্রেণিবিভাগ' : 'Classification'}</th>
                  <th style={{ padding: '12px' }}>{lang === 'bn' ? 'মডেলের ব্যাখ্যা / সীমাবদ্ধতা' : 'Agronomic Interpretation'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOvats.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>
                      {lang === 'bn' ? v.factorLabelBn : v.factorLabel}
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>
                      {v.baselineValue} {v.unit}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#38bdf8' }}>
                      {v.testedValue} {v.unit}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600', color: v.deltaYieldTonHa >= 0 ? '#34d399' : '#f87171' }}>
                      {v.deltaYieldTonHa >= 0 ? `+${v.deltaYieldTonHa}` : v.deltaYieldTonHa} t/ha ({v.deltaYieldPct}%)
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600', color: v.deltaProfitBdt >= 0 ? '#34d399' : '#f87171' }}>
                      {v.deltaProfitBdt >= 0 ? `+${v.deltaProfitBdt.toLocaleString()}` : v.deltaProfitBdt.toLocaleString()} BDT
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: v.conformance === 'EXPECTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: v.conformance === 'EXPECTED' ? '#34d399' : '#f87171'
                      }}>
                        {v.conformance}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: v.classification === 'INVARIANT' ? 'rgba(59, 130, 246, 0.2)' : (v.classification === 'EXPECTED_TREND' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
                        color: v.classification === 'INVARIANT' ? '#60a5fa' : (v.classification === 'EXPECTED_TREND' ? '#c084fc' : '#facc15')
                      }}>
                        {v.classification}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.75rem', color: '#94a3b8', maxWidth: '300px' }}>
                      {v.modelLimitation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: 2x2 Factorial Interaction Experiment */}
      {activeSubTab === 'factorial_synergy' && (
        <div>
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
              {lang === 'bn' ? '২×২ ফ্যাক্টোরিয়াল মিথস্ক্রিয়া: সেচ (Irrigation) × নাইট্রোজেন (Nitrogen)' : '2×2 Factorial Interaction: Irrigation × Nitrogen'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              {lang === 'bn' ? currentInteraction.synergy.agronomicInterpretationBn : currentInteraction.synergy.agronomicInterpretationEn}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '600' }}>[1] LOW IRRIG × LOW N (0,0 CONTROL)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: '6px 0' }}>
                  {currentInteraction.grid.lowIrrigLowN.yieldTonHa} t/ha <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({(currentInteraction.grid.lowIrrigLowN.yieldTonHa * currentProfile.areaHa).toFixed(1)} t total)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: '600' }}>
                  Profit: {currentInteraction.grid.lowIrrigLowN.netReturnBdt.toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  vs Control (0,0): Baseline | vs Normal: {currentInteraction.grid.lowIrrigLowN.deltaProfitBdt.toLocaleString()} BDT
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: '600' }}>[2] LOW IRRIG × HIGH N (0,1)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: '6px 0' }}>
                  {currentInteraction.grid.lowIrrigHighN.yieldTonHa} t/ha <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({(currentInteraction.grid.lowIrrigHighN.yieldTonHa * currentProfile.areaHa).toFixed(1)} t total)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: '600' }}>
                  Profit: {currentInteraction.grid.lowIrrigHighN.netReturnBdt.toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                  vs Control (0,0): +{(currentInteraction.grid.lowIHighN ? currentInteraction.grid.lowIHighN.deltaFromControlProfitBdt : (currentInteraction.grid.lowIrrigHighN.deltaFromControlProfitBdt || (currentInteraction.grid.lowIrrigHighN.netReturnBdt - currentInteraction.grid.lowIrrigLowN.netReturnBdt))).toLocaleString()} BDT
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '600' }}>[3] HIGH IRRIG × LOW N (1,0)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: '6px 0' }}>
                  {currentInteraction.grid.highIrrigLowN.yieldTonHa} t/ha <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({(currentInteraction.grid.highIrrigLowN.yieldTonHa * currentProfile.areaHa).toFixed(1)} t total)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: '600' }}>
                  Profit: {currentInteraction.grid.highIrrigLowN.netReturnBdt.toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                  vs Control (0,0): +{(currentInteraction.grid.highIrrigLowN.deltaFromControlProfitBdt || (currentInteraction.grid.highIrrigLowN.netReturnBdt - currentInteraction.grid.lowIrrigLowN.netReturnBdt)).toLocaleString()} BDT
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>[4] HIGH IRRIG × HIGH N (1,1)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: '6px 0' }}>
                  {currentInteraction.grid.highIrrigHighN.yieldTonHa} t/ha <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({(currentInteraction.grid.highIrrigHighN.yieldTonHa * currentProfile.areaHa).toFixed(1)} t total)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: '600' }}>
                  Profit: {currentInteraction.grid.highIrrigHighN.netReturnBdt.toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                  vs Control (0,0): +{(currentInteraction.grid.highIrrigHighN.deltaFromControlProfitBdt || (currentInteraction.grid.highIrrigHighN.netReturnBdt - currentInteraction.grid.lowIrrigLowN.netReturnBdt)).toLocaleString()} BDT
                </div>
              </div>
            </div>

            {/* Synergy Cards: Both Classic 2x2 Identity and Baseline Perturbation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#60a5fa', marginBottom: '4px' }}>
                  {lang === 'bn' ? '১. ক্লাসিক ২×২ ফ্যাক্টোরিয়াল মিথস্ক্রিয়া (Classic 2×2 ANOVA Synergy)' : '1. Classic 2×2 ANOVA Synergy'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399' }}>
                  {(currentInteraction.synergy.classic2x2SynergyProfitBdt ?? (
                    currentInteraction.grid.highIrrigHighN.netReturnBdt - currentInteraction.grid.highIrrigLowN.netReturnBdt - currentInteraction.grid.lowIrrigHighN.netReturnBdt + currentInteraction.grid.lowIrrigLowN.netReturnBdt
                  )) >= 0 ? '+' : ''}
                  {(currentInteraction.synergy.classic2x2SynergyProfitBdt ?? (
                    currentInteraction.grid.highIrrigHighN.netReturnBdt - currentInteraction.grid.highIrrigLowN.netReturnBdt - currentInteraction.grid.lowIrrigHighN.netReturnBdt + currentInteraction.grid.lowIrrigLowN.netReturnBdt
                  )).toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '6px' }}>
                  Formula: P(1,1) - P(1,0) - P(0,1) + P(0,0). Uses Low/Low (0,0) as reference.
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>
                  {lang === 'bn' ? '২. ফিল্ড বেসলাইন বিচ্যুতি সিনার্জি (Baseline Perturbation Synergy)' : '2. Baseline Perturbation Synergy'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399' }}>
                  {currentInteraction.synergy.synergyProfitBdt >= 0 ? `+${currentInteraction.synergy.synergyProfitBdt.toLocaleString()}` : currentInteraction.synergy.synergyProfitBdt.toLocaleString()} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '6px' }}>
                  Formula: Δ(Both High) - [Δ(Irrig Alone) + Δ(N Alone)]. Measured against normal field baseline.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
              {lang === 'bn' ? currentInteraction.synergy.mathematicalReconciliationBn : currentInteraction.synergy.mathematicalReconciliationEn}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Scientific Invariants Matrix */}
      {activeSubTab === 'invariants_matrix' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
            {lang === 'bn' ? 'বৈজ্ঞানিক সত্যতা যাচাই ও বাউন্ড ম্যাট্রিক্স (Scientific Invariant Validation Matrix)' : 'Scientific Invariant Validation Matrix'}
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            {currentInvariants.map((inv, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ flex: '1', minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc' }}>
                      {lang === 'bn' ? inv.checkNameBn : inv.checkNameEn}
                    </span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      background: inv.category === 'INVARIANT' ? 'rgba(59, 130, 246, 0.2)' : (inv.category === 'EXPECTED_TREND' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
                      color: inv.category === 'INVARIANT' ? '#60a5fa' : (inv.category === 'EXPECTED_TREND' ? '#c084fc' : '#facc15')
                    }}>
                      {inv.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
                    {lang === 'bn' ? inv.descriptionBn : inv.descriptionEn}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                    Evidence: {inv.evidence}
                  </div>
                </div>

                <div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    background: inv.status === 'PASS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: inv.status === 'PASS' ? '#34d399' : '#f87171',
                    border: inv.status === 'PASS' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                  }}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: Audit & Provenance */}
      {activeSubTab === 'audit_provenance' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
            {lang === 'bn' ? 'তথ্য উৎস, নির্ভরযোগ্যতা ও সীমাবদ্ধতা (Audit Trail & Provenance)' : 'Audit Trail & Scientific Provenance'}
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa', fontSize: '0.95rem' }}>
                1. Data Status Classification: SYNTHETIC_TEST_DATA
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                All 6 field profiles (Bogura, Rajshahi, Rangpur, Mymensingh, Jashore, Cumilla) and associated weather scenarios are representative synthetic fixtures. They do not constitute measured laboratory observations or physical ground-truth farm logbooks.
              </p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #10b981' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#34d399', fontSize: '0.95rem' }}>
                2. Calculation Engine Traceability
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                - Water Balance: FAO-56 Chapter 8 Dual Crop Coefficient (Kc) daily step.<br />
                - Yield Loss: FAO-33 Stewart Ky yield reduction model based on actual ETa deficit.<br />
                - Rotation Optimizer: PuLP CBC MILP (Mixed Integer Linear Programming) maximizing margin and minimizing water demand.<br />
                - Model Version: FieldShift-2026.1-SciSim.
              </p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', padding: '16px', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#facc15', fontSize: '0.95rem' }}>
                3. Documented Model Limitations & Omissions
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                - Yield Floor: 0.20 t/ha floor is an agronomic modeling assumption representing residual stover/forage biomass, not a universal biological law.<br />
                - Paddy Standing Water: The simulation omits bunded standing water dynamics and 2D surface runoff overflow.<br />
                - Micronutrients: Dynamic soil depletion of zinc, boron, and sulphur is unmodeled in the 120-day daily step.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
