// frontend/src/FarmerCropAdviceView.jsx
// Simple, transparent, card-based crop advice for Bangladeshi farmers

import React, { useState } from 'react';
import { useTranslation, toBengaliNumber, formatArea } from './i18n.js';
import { NasaPlantingAdvisoryView } from './NasaPlantingAdvisoryView.jsx';

export function FarmerCropAdviceView({
  activeField,
  plan,
  nasa,
  lang = 'bn',
  onNavigate,
  onAskAi
}) {
  const { t } = useTranslation(lang);
  const [adviceTab, setAdviceTab] = useState('nasa_advisory'); // 'nasa_advisory' | 'catalog'
  const [selectedSeason, setSelectedSeason] = useState('all');

  const CROPS_DATA = [
    {
      id: 'rice',
      name: 'আমন ধান',
      name_en: 'Aman Rice',
      variety: 'ব্রি ধান-৪৯ / ব্রি ধান-৭৫',
      season: 'বর্ষা ও শরৎ (Rabi/Kharif)',
      season_tag: 'kharif',
      icon: '🌾',
      badge: 'প্রধান খাদ্য শস্য',
      badge_color: '#15803d',
      why_suitable: 'আপনার জমির দোঁআশ ও এঁটেল মাটি এবং বর্তমান মৌসুমি বৃষ্টিপাত আমন ধান চাষের জন্য অত্যন্ত অনুকূল। মাটির পিএইচ (pH ৬.৫) ধানের পুষ্টি শোষণে সহায়ক।',
      why_suitable_en: 'Loamy soil and seasonal rainfall provide ideal conditions for Aman rice. Measured pH is optimal for nutrient uptake.',
      cost_bigha: '৯,৫০০ - ১১,০০০ টাকা',
      cost_bigha_en: '9,500 - 11,000 BDT',
      cost_ha: '৭০,০০০ - ৮২,০০০ টাকা',
      cost_ha_en: '70,000 - 82,000 BDT',
      yield_bigha: '১৪ - ১৮ মণ',
      yield_bigha_en: '14 - 18 maunds',
      yield_ha: '৪.০ - ৫.২ টন',
      yield_ha_en: '4.0 - 5.2 tonnes',
      price: '১,০৪০ টাকা/মণ (২৬ টাকা/কেজি)',
      price_en: '1,040 BDT/maund (26 BDT/kg)',
      price_source: 'উৎস: কৃষি বিপণন অধিদপ্তর (DAM) খামার গেট দর',
      price_source_en: 'Source: DAM Farmgate price bulletin',
      profit_bigha: '৫,০০০ - ৭,৫০০ টাকা',
      profit_bigha_en: '5,000 - 7,500 BDT',
      profit_ha: '৩৭,০০০ - ৫৫,০০০ টাকা',
      profit_ha_en: '37,000 - 55,000 BDT',
      risks: 'দেরিতে বৃষ্টি হলে সম্পূরক সেচ লাগবে। মাজরা পোকা ও ব্লাস্ট রোগের আক্রমণ হতে পারে।',
      risks_en: 'Supplementary irrigation needed during dry spells. Watch for stem borer and blast fungus.',
      next_step: 'বিএডিসি বা বিশ্বস্ত ডিলার থেকে রোগমুক্ত সার্টিফাইড বীজ ধান সংগ্রহ করে বীজতলা তৈরি করুন।',
      next_step_en: 'Procure certified high-yield seed and prepare a clean nursery bed.',
      limitation: 'প্রস্তাবিত ফলন অনুকূল আবহাওয়া ও সুষম সার প্রয়োগের ওপর নির্ভরশীল, এটি আর্থিক নিশ্চয়তা নয়।',
      limitation_en: 'Estimated yield depends on climate and balanced fertilizer application; not a financial guarantee.'
    },
    {
      id: 'mustard',
      name: 'উন্নত সরিষা',
      name_en: 'Mustard (Bari Sarisha-14)',
      variety: 'বারি সরিষা-১৪ / বারি সরিষা-১৭',
      season: 'শীতকাল (Rabi)',
      season_tag: 'rabi',
      icon: '🌼',
      badge: 'স্বল্পমেয়াদী অর্থকরী',
      badge_color: '#ca8a04',
      why_suitable: 'ধানের পর জমি ফেলে না রেখে ৭৫-৮০ দিনে সরিষা তুলে ফেলা যায়। কম সেচ লাগে এবং জমিতে অবশিষ্ট জৈব উপাদান বাড়ায়।',
      why_suitable_en: 'Short 75-80 day duration fits between rice seasons. Low irrigation requirement and improves soil organic matter.',
      cost_bigha: '৫,২০০ - ৬,০০০ টাকা',
      cost_bigha_en: '5,200 - 6,000 BDT',
      cost_ha: '৩৮,০০০ - ৪৫,০০০ টাকা',
      cost_ha_en: '38,000 - 45,000 BDT',
      yield_bigha: '৫.০ - ৬.৫ মণ',
      yield_bigha_en: '5.0 - 6.5 maunds',
      yield_ha: '১.৪ - ১.৮ টন',
      yield_ha_en: '1.4 - 1.8 tonnes',
      price: '২,১৬০ টাকা/মণ (৫৪ টাকা/কেজি)',
      price_en: '2,160 BDT/maund (54 BDT/kg)',
      price_source: 'উৎস: DAM তেলবীজ মনিটরিং বুলেটিন',
      price_source_en: 'Source: DAM Oilseed Monitoring Bulletin',
      profit_bigha: '৫,৫০০ - ৭,০০০ টাকা',
      profit_bigha_en: '5,500 - 7,000 BDT',
      profit_ha: '৪০,০০০ - ৫২,০০০ টাকা',
      profit_ha_en: '40,000 - 52,000 BDT',
      risks: 'কুয়াশার কারণে জাব পোকার আক্রমণ বাড়তে পারে। ফুল আসার সময় পানির অভাব হলে ফলন কমে।',
      risks_en: 'Aphid infestations during foggy weeks. Maintain adequate moisture during flowering.',
      next_step: 'ধান কাটার পরপরই জো অবস্থায় জমিতে হালচাষ দিয়ে দ্রুত বীজ বপন করুন।',
      next_step_en: 'Plough field immediately after paddy harvest while residual moisture remains.',
      limitation: 'কুয়াশা ও শীতের স্থায়িত্বের ওপর তেলবীজের ফলন ওঠানামা করতে পারে।',
      limitation_en: 'Oilseed yields may vary with fog duration and winter intensity.'
    },
    {
      id: 'lentil',
      name: 'উন্নত মসুর ডাল',
      name_en: 'Lentil (Bari Masur-8)',
      variety: 'বারি মসুর-৮ / বিনা মসুর-৬',
      season: 'শীতকাল (Rabi)',
      season_tag: 'rabi',
      icon: '🌱',
      badge: 'মাটি উর্বরকারী ডাল',
      badge_color: '#0891b2',
      why_suitable: 'ডাল ফসল বাতাস থেকে শিকড়ের মাধ্যমে প্রাকৃতিকভাবে নাইট্রোজেন যুক্ত করে। এর ফলে পরবর্তী ফসলে ইউরিয়া সারের খরচ উল্লেখযোগ্যভাবে কমে।',
      why_suitable_en: 'Biological Nitrogen-Fixing legume. Replenishes soil nitrogen, reducing urea costs for next season.',
      cost_bigha: '৪,৫০০ - ৫,২০০ টাকা',
      cost_bigha_en: '4,500 - 5,200 BDT',
      cost_ha: '৩৩,০০০ - ৩৮,০০০ টাকা',
      cost_ha_en: '33,000 - 38,000 BDT',
      yield_bigha: '৪.০ - ৫.৫ মণ',
      yield_bigha_en: '4.0 - 5.5 maunds',
      yield_ha: '১.১ - ১.৫ টন',
      yield_ha_en: '1.1 - 1.5 tonnes',
      price: '৩,০৪০ টাকা/মণ (৭৬ টাকা/কেজি)',
      price_en: '3,040 BDT/maund (76 BDT/kg)',
      price_source: 'উৎস: DAM ও টিসিবি নিত্যপ্রয়োজনীয় বুলেটিন',
      price_source_en: 'Source: DAM & TCB Commodity Bulletin',
      profit_bigha: '৭,৫০০ - ৯,৫০০ টাকা',
      profit_bigha_en: '7,500 - 9,500 BDT',
      profit_ha: '৫৫,০০০ - ৭০,০০০ টাকা',
      profit_ha_en: '55,000 - 70,000 BDT',
      risks: 'জমিতে পানি জমে থাকলে শিকড় পচে গাছ মারা যায়। নিষ্কাশন নালা ভালো রাখা আবশ্যক।',
      risks_en: 'Highly vulnerable to waterlogging. Good drainage ditches are essential.',
      next_step: 'বীজ বপনের পূর্বে জমিতে পানি নিষ্কাশনের ড্রেন নিশ্চিত করুন।',
      next_step_en: 'Ensure proper field drainage ditches before sowing seeds.',
      limitation: 'অতিরিক্ত বৃষ্টিপাত বা জলাবদ্ধতা হলে ফলন মারাত্মক ক্ষতিগ্রস্ত হতে পারে।',
      limitation_en: 'Excessive rain or waterlogging will severely depress legume yields.'
    },
    {
      id: 'potato',
      name: 'গোল আলু',
      name_en: 'Potato (Diamond/Granola)',
      variety: 'ডায়মন্ড / কার্ডিনাল / গ্র্যানোলা',
      season: 'শীতকাল (Rabi)',
      season_tag: 'rabi',
      icon: '🥔',
      badge: 'উচ্চ মূল্যের ফসল',
      badge_color: '#d97706',
      why_suitable: 'বেলে-দোঁআশ ও দোঁআশ মাটিতে আলুর কন্দ ভালো বাড়ে। সঠিক ব্যবস্থাপনায় স্বল্প সময়ে সর্বাধিক নগদ অর্থ পাওয়া যায়।',
      why_suitable_en: 'Sandy-loam soil supports tuber development. High gross revenue per hectare.',
      cost_bigha: '১৫,০০০ - ১৮,০০০ টাকা',
      cost_bigha_en: '15,000 - 18,000 BDT',
      cost_ha: '১,১০,০০০ - ১,৩০,০০০ টাকা',
      cost_ha_en: '110,000 - 130,000 BDT',
      yield_bigha: '৫০ - ৬০ মণ',
      yield_bigha_en: '50 - 60 maunds',
      yield_ha: '১৫ - ১৮ টন',
      yield_ha_en: '15 - 18 tonnes',
      price: '৫৬০ টাকা/মণ (১৪ টাকা/কেজি)',
      price_en: '560 BDT/maund (14 BDT/kg)',
      price_source: 'উৎস: DAM ও কোল্ড স্টোরেজ সমিতি গড় দর',
      price_source_en: 'Source: DAM & Cold Storage Association',
      profit_bigha: '১১,০০০ - ১৫,০০০ টাকা',
      profit_bigha_en: '11,000 - 15,000 BDT',
      profit_ha: '৮০,০০০ - ১,১০,০০০ টাকা',
      profit_ha_en: '80,000 - 110,000 BDT',
      risks: 'নাবি ধসা (লেট ব্লাইট) রোগের ঝুঁকি। ফসল তোলার সময় বাজারে দাম কমে যাওয়ার সম্ভাবনা থাকে।',
      risks_en: 'Risk of late blight fungus during cold fog. Post-harvest market price slumps.',
      next_step: 'কোল্ড স্টোরেজে সংরক্ষণের সুবিধা বা স্থানীয় বিক্রির চুক্তি আগে নিশ্চিত করুন।',
      next_step_en: 'Confirm cold storage reservation or local buyers before planting.',
      limitation: 'উচ্চ মূলধনী ফসল; বীজ ও সংরক্ষণের খরচ বেশি হওয়ায় ঝুঁকিও তুলনামূলক বেশি।',
      limitation_en: 'Capital-intensive; high seed and storage costs increase operational risk.'
    },
    {
      id: 'maize',
      name: 'হাইব্রিড ভুট্টা',
      name_en: 'Hybrid Maize',
      variety: 'এনকে-৪০ / প্যাসিফিক-৯৮৪',
      season: 'রবি ও প্রাক-খরিফ',
      season_tag: 'rabi',
      icon: '🌽',
      badge: 'উচ্চ ফলনশীল দানা',
      badge_color: '#ea580c',
      why_suitable: 'পোল্ট্রি ও ফিড মিলে ভুট্টার ব্যাপক চাহিদা রয়েছে। দোঁআশ মাটিতে খরা সহনশীল এবং গভীর শিকড় দিয়ে মাটির নিচের খাবার টেনে নেয়।',
      why_suitable_en: 'High biomass crop with strong poultry feed demand. Drought resilient deep rooting.',
      cost_bigha: '৯,০০০ - ১০,৫০০ টাকা',
      cost_bigha_en: '9,000 - 10,500 BDT',
      cost_ha: '৬৫,০০০ - ৭৫,০০০ টাকা',
      cost_ha_en: '65,000 - 75,000 BDT',
      yield_bigha: '২৫ - ৩২ মণ',
      yield_bigha_en: '25 - 32 maunds',
      yield_ha: '৬.৫ - ৮.৫ টন',
      yield_ha_en: '6.5 - 8.5 tonnes',
      price: '৮৪০ টাকা/মণ (২১ টাকা/কেজি)',
      price_en: '840 BDT/maund (21 BDT/kg)',
      price_source: 'উৎস: DAM আঞ্চলিক ফিড মিল দর',
      price_source_en: 'Source: DAM Regional Feed Mill Benchmarks',
      profit_bigha: '১০,৫০০ - ১৪,০০০ টাকা',
      profit_bigha_en: '10,500 - 14,000 BDT',
      profit_ha: '৭৫,০০০ - ১,০০,০০০ টাকা',
      profit_ha_en: '75,000 - 100,000 BDT',
      risks: 'ফল আর্মিওয়ার্ম পোকার আক্রমণ ও সেচের মারাত্মক ঘাটতি হলে দানা পুষ্ট হয় না।',
      risks_en: 'Fall armyworm pest damage. Regular irrigation needed during cob formation.',
      next_step: 'ইউরিয়া ও পটাশ সারের সম সুষম প্রয়োগের প্রস্তুতি রাখুন।',
      next_step_en: 'Prepare balanced N-P-K fertilizer split schedules.',
      limitation: 'ফলন ফিড মিলের সংলগ্নতার ওপর এবং আন্তর্জাতিক ভুট্টার মূল্যের ওপর নির্ভরশীল।',
      limitation_en: 'Realized prices depend on feed mill proximity and regional grain import tariffs.'
    }
  ];

  const filteredCrops = selectedSeason === 'all'
    ? CROPS_DATA
    : CROPS_DATA.filter(c => c.season_tag === selectedSeason);

  return (
    <div className="farmer-view-container">
      {/* Top Advisory Nav Switcher */}
      <div style={{ display: 'flex', gap: 10, margin: '0 0 20px 0', borderBottom: '1px solid #2a3742', paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setAdviceTab('nasa_advisory')}
          style={{
            background: adviceTab === 'nasa_advisory' ? 'rgba(0, 223, 129, 0.18)' : '#161d23',
            border: adviceTab === 'nasa_advisory' ? '1px solid #00df81' : '1px solid #2a3742',
            color: adviceTab === 'nasa_advisory' ? '#00df81' : '#8a99a8',
            borderRadius: 8,
            padding: '9px 18px',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <span>🛰️</span>
          <span>{lang === 'bn' ? 'নাসা রোপণ পরামর্শ (Planting Window)' : 'Official NASA Planting Advisory'}</span>
        </button>
        <button
          type="button"
          onClick={() => setAdviceTab('catalog')}
          style={{
            background: adviceTab === 'catalog' ? 'rgba(56, 189, 248, 0.18)' : '#161d23',
            border: adviceTab === 'catalog' ? '1px solid #38bdf8' : '1px solid #2a3742',
            color: adviceTab === 'catalog' ? '#38bdf8' : '#8a99a8',
            borderRadius: 8,
            padding: '9px 18px',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <span>📋</span>
          <span>{lang === 'bn' ? 'ফসল ক্যাটালগ ও লাভ-ক্ষতি' : 'Crop Catalog & Economics'}</span>
        </button>
      </div>

      {adviceTab === 'nasa_advisory' ? (
        <NasaPlantingAdvisoryView
          defaultDistrict={activeField?.district ? String(activeField.district).toLowerCase() : 'rajshahi'}
          defaultCrop="aman"
          lang={lang}
          onNavigate={onNavigate}
        />
      ) : (
        <>
          {/* Top Banner */}
          <div className="farmer-hero-card">
            <div className="farmer-hero-badge">
          <span>🌿 {lang === 'bn' ? 'মৌসুমী ফসলের সুপারিশ' : 'Seasonal Crop Advisory'}</span>
        </div>
        <h2 className="farmer-hero-title">
          {t('crop_advice_heading')}
        </h2>
        <p className="farmer-hero-desc">
          {activeField ? (
            lang === 'bn'
              ? `আপনার নির্বাচিত জমি "${activeField.name}" (${formatArea(activeField.area_ha || 10.0, 'bn')}, ${activeField.soil_texture || 'দোঁআশ'} মাটি) এর জন্য বিজ্ঞানসম্মত ফসল বাছাই:`
              : `Scientifically matched crops for "${activeField.name}" (${formatArea(activeField.area_ha || 10.0, 'en')}, ${activeField.soil_texture || 'loam'} soil):`
          ) : (
            t('crop_advice_sub')
          )}
        </p>

        {/* Mathematical Transparency Note */}
        <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.12)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
          <span>📐</span>
          <span>
            {lang === 'bn'
              ? 'হিসাব ভিত্তি: সম্ভাব্য বিক্রয়মূল্য (ফলন মণ × দর টাকা/মণ) - উৎপাদন খরচ = সম্ভাব্য নিট লাভ। (১ মণ = ৪০ কেজি, ১ হেক্টর ≈ ৭.৪৭ বিঘা)। উপাত্ত সূত্র: বিএআরআই ও ডিএই ২০২৪-২০২৫ আঞ্চলিক বেঞ্চমার্ক প্রাক্কলন।'
              : 'Calculation formula: Gross Revenue (Yield Maund × Price/Maund) - Total Cost = Net Profit (1 maund = 40 kg, 1 ha ≈ 7.47 bigha). Data source: BARI & DAE 2024-2025 regional benchmark guidelines.'}
          </span>
        </div>

        {/* Season Filter Pills */}
        <div className="farmer-filter-pills">
          <button
            type="button"
            className={`filter-pill ${selectedSeason === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSeason('all')}
          >
            {lang === 'bn' ? 'সব ফসল' : 'All Crops'}
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedSeason === 'rabi' ? 'active' : ''}`}
            onClick={() => setSelectedSeason('rabi')}
          >
            {lang === 'bn' ? 'শীতকালীন ফসল (রবি)' : 'Winter (Rabi)'}
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedSeason === 'kharif' ? 'active' : ''}`}
            onClick={() => setSelectedSeason('kharif')}
          >
            {lang === 'bn' ? 'বর্ষাকালীন ফসল (খরিফ)' : 'Monsoon (Kharif)'}
          </button>
        </div>
      </div>

      {/* Recommended Crop Cards Grid */}
      <div className="farmer-cards-grid">
        {filteredCrops.map((crop) => (
          <div key={crop.id} className="farmer-crop-card">
            {/* Card Header */}
            <div className="farmer-crop-card-header">
              <div className="crop-title-group">
                <span className="crop-avatar-icon">{crop.icon}</span>
                <div>
                  <h3 className="crop-main-name">
                    {lang === 'bn' ? crop.name : crop.name_en}
                  </h3>
                  <span className="crop-variety-tag">{crop.variety}</span>
                </div>
              </div>
              <span
                className="crop-category-badge"
                style={{ backgroundColor: crop.badge_color }}
              >
                {crop.badge}
              </span>
            </div>

            {/* Why Suitable Box */}
            <div className="farmer-crop-section-box highlight-box">
              <span className="section-box-label">
                💡 {t('why_suitable_label')}
              </span>
              <p className="section-box-text">
                {lang === 'bn' ? crop.why_suitable : crop.why_suitable_en}
              </p>
            </div>

            {/* Financial & Yield Grid */}
            <div className="farmer-metrics-row">
              <div className="metric-cell">
                <span className="metric-label">{t('cost_label')}</span>
                <strong className="metric-val">{lang === 'bn' ? crop.cost_bigha : crop.cost_bigha_en}</strong>
                <small className="metric-sub">{t('bigha_unit')}</small>
              </div>

              <div className="metric-cell">
                <span className="metric-label">{t('yield_label')}</span>
                <strong className="metric-val">{lang === 'bn' ? crop.yield_bigha : crop.yield_bigha_en}</strong>
                <small className="metric-sub">{t('bigha_unit')}</small>
              </div>

              <div className="metric-cell profit-cell">
                <span className="metric-label">{t('profit_label')}</span>
                <strong className="metric-val profit-val">{lang === 'bn' ? crop.profit_bigha : crop.profit_bigha_en}</strong>
                <small className="metric-sub">{t('bigha_unit')}</small>
              </div>
            </div>

            {/* Price Citation Note */}
            <div className="farmer-price-note">
              <span>🏷️ {t('price_label')}: <strong>{lang === 'bn' ? crop.price : crop.price_en}</strong></span>
              <small className="source-cite">{lang === 'bn' ? crop.price_source : crop.price_source_en}</small>
            </div>

            {/* Risks & Precautions */}
            <div className="farmer-crop-section-box risk-box">
              <span className="section-box-label">
                ⚠️ {t('risks_label')}
              </span>
              <p className="section-box-text">
                {lang === 'bn' ? crop.risks : crop.risks_en}
              </p>
            </div>

            {/* Next Step & Limitations */}
            <div className="farmer-crop-section-box next-step-box">
              <span className="section-box-label">
                📋 {t('next_step_label')}
              </span>
              <p className="section-box-text">
                {lang === 'bn' ? crop.next_step : crop.next_step_en}
              </p>
            </div>

            <div className="crop-disclaimer-note">
              <small>ℹ️ {lang === 'bn' ? crop.limitation : crop.limitation_en}</small>
            </div>

            {/* Card Action Buttons */}
            <div className="farmer-card-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (onNavigate) onNavigate('harvest_profit');
                }}
              >
                {t('view_profit_calc_btn')}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (onAskAi) {
                    onAskAi(`${crop.name} চাষের খরচ, সেচ ও রোগবালাই প্রতিরোধ সম্পর্কে পরামর্শ দিন।`);
                  } else if (onNavigate) {
                    onNavigate('assistant');
                  }
                }}
              >
                🤖 {t('ask_ai_about_crop')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Research Workspace Gateway */}
      <div className="farmer-advanced-gateway-card">
        <div className="gateway-content">
          <span className="gateway-icon">🔬</span>
          <div>
            <h4 className="gateway-title">{t('tab_milp')}</h4>
            <p className="gateway-desc">{t('nav_advanced_desc')}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            if (onNavigate) onNavigate('research');
          }}
        >
          {t('advanced_milp_btn')}
        </button>
      </div>
        </>
      )}
    </div>
  );
}
