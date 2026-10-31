// frontend/src/OnsetScienceView.jsx
import React, { useState, useEffect } from 'react';
import { request as defaultRequest } from './apiClient.js';

export function OnsetScienceView({
  lang = 'bn',
  request = defaultRequest,
  onBack,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await request('/api/advisory/onset-comparison');
        if (active) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(String(err?.message || err));
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [request]);

  const uniqueCells = data?.unique_cells || [];
  const filteredCells = uniqueCells.filter(cell => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchesDist = (cell.districts || []).some(d => d.toLowerCase().includes(term));
    const matchesId = (cell.cell_id || '').toLowerCase().includes(term);
    return matchesDist || matchesId;
  });

  return (
    <div className="onset-science-view ui-card-hud" style={{
      background: 'rgba(15, 23, 42, 0.85)',
      borderRadius: '16px',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      padding: '24px',
      color: 'var(--text, #f8fafc)',
      maxWidth: '1680px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>🔬</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
              {lang === 'bn' ? 'অনসেট বিজ্ঞান: নাসা উপাত্তের দ্বৈত তুলনা (৩৯টি ইউনিক সেল)' : 'Onset Science: Dual NASA Observation Analysis (39 Unique Cells)'}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2, #94a3b8)' }}>
            {lang === 'bn'
              ? 'নাসা পাওয়ার (০.৫° রি-অ্যানালাইসিস) বনাম নাসা জিপিএম আইমার্জ (০.১° স্যাটেলাইট) বৃষ্টিপাত উপাত্তের বেনজামিনি-হোচবার্গ এফডিআর নিয়ন্ত্রণসহ তুলনামূলক বৈজ্ঞানিক প্রমাণ।'
              : 'Empirical comparison between NASA POWER (0.5° MERRA-2) and NASA GPM IMERG Final (0.1° satellite) with Benjamini-Hochberg FDR correction.'}
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ← {lang === 'bn' ? 'ফিরে যান' : 'Back'}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3, #64748b)', textTransform: 'uppercase' }}>
            {lang === 'bn' ? 'ইউনিক রেইনফল গ্রিড সেল' : 'Unique Rainfall Grid Cells'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--hud-cyan, #38bdf8)' }}>
            {data?.n_unique_cells || 39} / 39
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-2, #94a3b8)' }}>
            {lang === 'bn' ? '৬৪টি জেলা এই ৩৯টি সেলের অন্তর্ভুক্ত' : '64 districts map onto 39 distinct 0.5° cells'}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3, #64748b)', textTransform: 'uppercase' }}>
            {lang === 'bn' ? 'উভয় উৎসে প্রমাণিত অনসেট শিফট' : 'Confirmed Shift Across Both Sources'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
            0 / 39
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-2, #94a3b8)' }}>
            {lang === 'bn' ? 'আইমার্জ-এ প্রাক-বর্ষার শিফট নিশ্চিত হয়নি (q >= 0.10)' : 'IMERG does not confirm earlier shift (q >= 0.10)'}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3, #64748b)', textTransform: 'uppercase' }}>
            {lang === 'bn' ? 'প্রাথমিক বৃষ্টিপাত উৎস' : 'Primary Rainfall Source'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
            NASA GPM IMERG Final Daily v07
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-2, #94a3b8)' }}>
            0.1° (~10 km) স্যাটেলাইট প্রত্যক্ষ পরিমাপ (2001-2024)
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder={lang === 'bn' ? 'জেলা বা সেল আইডি খুঁজুন...' : 'Filter by district or cell ID...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text)',
            fontSize: '13px',
            width: '100%',
            maxWidth: '360px'
          }}
        />
      </div>

      {/* Scientific Comparison Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-2)' }}>
          {lang === 'bn' ? 'অনসেট উপাত্ত বিশ্লেষণ লোড হচ্ছে...' : 'Loading 39 unique rainfall cells onset data...'}
        </div>
      ) : error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.9)', color: 'var(--text-2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '10px 12px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ইউনিক সেল ও জেলাসমূহ' : 'Cell & Districts'}</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'পাওয়ার অনসেট শিফট (দিন) ও p' : 'POWER Onset Shift & p'}</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'আইমার্জ অনসেট শিফট (দিন) ও p' : 'IMERG Onset Shift & p'}</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'পাওয়ার মার্চ-মে জাম্প' : 'POWER Mar-May Jump'}</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'আইমার্জ মার্চ-মে জাম্প' : 'IMERG Mar-May Jump'}</th>
                <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'দৈনিক সহসম্বন্ধ (r)' : 'Daily Correlation (r)'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCells.map((cell, idx) => {
                const powerWet = cell.power?.wet_season;
                const imergWet = cell.imerg?.wet_season;
                const powerMam = cell.march_may_rainfall?.power;
                const imergMam = cell.march_may_rainfall?.imerg;
                const corr = cell.daily_correlation_power_vs_imerg;

                return (
                  <tr key={cell.cell_id || idx} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.3)' : 'transparent'
                  }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-3)' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {(cell.districts || []).join(', ')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {cell.cell_id}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: (powerWet?.shift_days || 0) < 0 ? '#38bdf8' : '#f59e0b', fontWeight: 600 }}>
                        {powerWet?.shift_days != null ? `${powerWet.shift_days > 0 ? '+' : ''}${powerWet.shift_days.toFixed(1)} d` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '6px' }}>
                        (p={powerWet?.p_value != null ? powerWet.p_value.toFixed(3) : '-'})
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: (imergWet?.shift_days || 0) < 0 ? '#38bdf8' : '#f59e0b', fontWeight: 600 }}>
                        {imergWet?.shift_days != null ? `${imergWet.shift_days > 0 ? '+' : ''}${imergWet.shift_days.toFixed(1)} d` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '6px' }}>
                        (p={imergWet?.p_value != null ? imergWet.p_value.toFixed(3) : '-'})
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: (powerMam?.step_change_mm || 0) > 50 ? '#ef4444' : 'var(--text)', fontWeight: 600 }}>
                        {powerMam?.step_change_mm != null ? `+${powerMam.step_change_mm.toFixed(1)} mm` : '-'}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {powerMam ? `${powerMam.period_1_mean_mm.toFixed(0)} → ${powerMam.period_2_mean_mm.toFixed(0)} mm` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        {imergMam?.step_change_mm != null ? `${imergMam.step_change_mm > 0 ? '+' : ''}${imergMam.step_change_mm.toFixed(1)} mm` : '-'}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {imergMam ? `${imergMam.period_1_mean_mm.toFixed(0)} → ${imergMam.period_2_mean_mm.toFixed(0)} mm` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-2)' }}>
                      {corr != null ? corr.toFixed(3) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Plain Verdict Under The Table */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        background: 'rgba(56, 189, 248, 0.08)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>⚖️</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--hud-cyan, #38bdf8)' }}>
            Two NASA datasets disagree on the trend; FieldShift only advises on what is confirmed.
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-2, #94a3b8)', marginTop: '4px' }}>
            {lang === 'bn'
              ? 'নাসা পাওয়ার রি-অ্যানালাইসিসের প্রাক-বর্ষার বড় ধরনের বৃষ্টিপাত বৃদ্ধি উপগ্রহ পর্যবেক্ষণ আইমার্জ (GPM IMERG)-এ নিশ্চিত নয়। তাই ফিল্ডশিফ্ট কোনো কৃত্রিম ট্রেন্ড দাবি না করে ২৪ বছরের সত্য ঝুঁকি ও ঐতিহাসিক বিস্তারের ভিত্তিতে কৃষকদের পরামর্শ দেয়।'
              : 'The large pre-monsoon rainfall jump in NASA POWER reanalysis is not corroborated by NASA GPM IMERG satellite observations. FieldShift strictly avoids unconfirmed shift claims and provides honest empirical risk guidance.'}
          </div>
        </div>
      </div>
    </div>
  );
}
