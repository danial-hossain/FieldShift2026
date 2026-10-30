// frontend/src/FarmerCropAdviceView.jsx
// Simple, transparent, card-based crop advice for Bangladeshi farmers

import React, { useState } from 'react';
import { useTranslation, formatArea } from './i18n.js';
import { NasaPlantingAdvisoryView } from './NasaPlantingAdvisoryView.jsx';
import { Card, CardHeader, Stat, Button, Pill, Tabs, PageHeader } from './ui/index.js';

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
      season: 'বর্ষা ও শরৎ (Kharif-2)',
      season_tag: 'kharif',
      icon: '🌾',
      badge: 'প্রধান খাদ্য শস্য',
      tone: 'leaf',
      why_suitable: 'আপনার জমির দোআঁশ ও এঁটেল মাটি এবং বর্তমান মৌসুমি বৃষ্টিপাত আমন ধান চাষের জন্য অত্যন্ত অনুকূল। মাটির পিএইচ (pH ৬.৫) ধানের পুষ্টি শোষণে সহায়ক।',
      why_suitable_en: 'Loamy soil and seasonal rainfall provide ideal conditions for Aman rice. Measured pH is optimal for nutrient uptake.',
      cost_bigha: '৯,৫০০ - ১১,০০০ টাকা',
      cost_bigha_en: '9,500 - 11,000 BDT',
      yield_bigha: '১৪ - ১৮ মণ',
      yield_bigha_en: '14 - 18 maunds',
      profit_bigha: '৫,০০০ - ৭,৫০০ টাকা',
      profit_bigha_en: '5,000 - 7,500 BDT',
      price: '১,০৪০ টাকা/মণ (২৬ টাকা/কেজি)',
      price_en: '1,040 BDT/maund (26 BDT/kg)',
      price_source: 'উৎস: কৃষি বিপণন অধিদপ্তর (DAM) খামার গেট দর',
      price_source_en: 'Source: DAM Farmgate price bulletin',
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
      tone: 'sun',
      why_suitable: 'ধানের পর জমি ফেলে না রেখে ৭৫-৮০ দিনে সরিষা তুলে ফেলা যায়। কম সেচ লাগে এবং জমিতে অবশিষ্ট জৈব উপাদান বাড়ায়।',
      why_suitable_en: 'Short 75-80 day duration fits between rice seasons. Low irrigation requirement and improves soil organic matter.',
      cost_bigha: '৫,২০০ - ৬,০০০ টাকা',
      cost_bigha_en: '5,200 - 6,000 BDT',
      yield_bigha: '৫.০ - ৬.৫ মণ',
      yield_bigha_en: '5.0 - 6.5 maunds',
      profit_bigha: '৫,৫০০ - ৭,০০০ টাকা',
      profit_bigha_en: '5,500 - 7,000 BDT',
      price: '২,১৬০ টাকা/মণ (৫৪ টাকা/কেজি)',
      price_en: '2,160 BDT/maund (54 BDT/kg)',
      price_source: 'উৎস: DAM তেলবীজ মনিটরিং বুলেটিন',
      price_source_en: 'Source: DAM Oilseed Monitoring Bulletin',
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
      tone: 'leaf',
      why_suitable: 'ডাল ফসল বাতাস থেকে শিকড়ের মাধ্যমে প্রাকৃতিকভাবে নাইট্রোজেন যুক্ত করে। এর ফলে পরবর্তী ফসলে ইউরিয়া সারের খরচ উল্লেখযোগ্যভাবে কমে।',
      why_suitable_en: 'Biological Nitrogen-Fixing legume. Replenishes soil nitrogen, reducing urea costs for next season.',
      cost_bigha: '৪,৫০০ - ৫,২০০ টাকা',
      cost_bigha_en: '4,500 - 5,200 BDT',
      yield_bigha: '৪.০ - ৫.৫ মণ',
      yield_bigha_en: '4.0 - 5.5 maunds',
      profit_bigha: '৭,৫০০ - ৯,৫০০ টাকা',
      profit_bigha_en: '7,500 - 9,500 BDT',
      price: '৩,০৪০ টাকা/মণ (৭৬ টাকা/কেজি)',
      price_en: '3,040 BDT/maund (76 BDT/kg)',
      price_source: 'উৎস: DAM ও টিসিবি নিত্যপ্রয়োজনীয় বুলেটিন',
      price_source_en: 'Source: DAM & TCB Commodity Bulletin',
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
      tone: 'sun',
      why_suitable: 'বেলে-দোআঁশ ও দোআঁশ মাটিতে আলুর কন্দ ভালো বাড়ে। সঠিক ব্যবস্থাপনায় স্বল্প সময়ে সর্বাধিক নগদ অর্থ পাওয়া যায়।',
      why_suitable_en: 'Sandy-loam soil supports tuber development. High gross revenue per hectare.',
      cost_bigha: '১৫,০০০ - ১৮,০০০ টাকা',
      cost_bigha_en: '15,000 - 18,000 BDT',
      yield_bigha: '৫০ - ৬০ মণ',
      yield_bigha_en: '50 - 60 maunds',
      profit_bigha: '১১,০০০ - ১৫,০০০ টাকা',
      profit_bigha_en: '11,000 - 15,000 BDT',
      price: '৫৬০ টাকা/মণ (১৪ টাকা/কেজি)',
      price_en: '560 BDT/maund (14 BDT/kg)',
      price_source: 'উৎস: DAM ও কোল্ড স্টোরেজ সমিতি গড় দর',
      price_source_en: 'Source: DAM & Cold Storage Association',
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
      tone: 'alert',
      why_suitable: 'পোল্ট্রি ও ফিড মিলে ভুট্টার ব্যাপক চাহিদা রয়েছে। দোআঁশ মাটিতে খরা সহনশীল এবং গভীর শিকড় দিয়ে মাটির নিচের খাবার টেনে নেয়।',
      why_suitable_en: 'High biomass crop with strong poultry feed demand. Drought resilient deep rooting.',
      cost_bigha: '৯,০০০ - ১০,৫০০ টাকা',
      cost_bigha_en: '9,000 - 10,500 BDT',
      yield_bigha: '২৫ - ৩২ মণ',
      yield_bigha_en: '25 - 32 maunds',
      profit_bigha: '১০,৫০০ - ১৪,০০০ টাকা',
      profit_bigha_en: '10,500 - 14,000 BDT',
      price: '৮৪০ টাকা/মণ (২১ টাকা/কেজি)',
      price_en: '840 BDT/maund (21 BDT/kg)',
      price_source: 'উৎস: DAM আঞ্চলিক ফিড মিল দর',
      price_source_en: 'Source: DAM Regional Feed Mill Benchmarks',
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
    <div className="farmer-view-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Advisory Nav Switcher */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Tabs
          items={[
            { id: 'nasa_advisory', label: lang === 'bn' ? 'নাসা রোপণ পরামর্শ (Planting Window)' : 'NASA Planting Window Advisory', icon: '🛰️' },
            { id: 'catalog', label: lang === 'bn' ? 'ফসল ক্যাটালগ ও লাভ-ক্ষতি' : 'Crop Catalog & Economics', icon: '📋' }
          ]}
          activeId={adviceTab}
          onChange={setAdviceTab}
        />
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
          {/* Header Card */}
          <Card variant="glass" style={{ padding: 24 }}>
            <PageHeader
              eyebrow={lang === 'bn' ? 'মৌসুমী ফসলের সুপারিশ' : 'Seasonal Crop Advisory'}
              title={t('crop_advice_heading')}
              subtitle={activeField ? (
                lang === 'bn'
                  ? `আপনার নির্বাচিত জমি "${activeField.name}" (${formatArea(activeField.area_ha || 10.0, 'bn')}, ${activeField.soil_texture || 'দোআঁশ'} মাটি) এর জন্য বিজ্ঞানসম্মত ফসল বাছাই:`
                  : `Scientifically matched crops for "${activeField.name}" (${formatArea(activeField.area_ha || 10.0, 'en')}, ${activeField.soil_texture || 'loam'} soil):`
              ) : t('crop_advice_sub')}
            />

            {/* Formula note */}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: '14px 0' }}>
              📐 {lang === 'bn'
                ? 'হিসাব ভিত্তি: সম্ভাব্য বিক্রয়মূল্য (ফলন মণ × দর টাকা/মণ) - উৎপাদন খরচ = সম্ভাব্য নিট লাভ। (১ মণ = ৪০ কেজি, ১ হেক্টর ≈ ৭.৪৭ বিঘা)। উপাত্ত সূত্র: বিএআরআই ও ডিএই ২০২৪-২০২৫ আঞ্চলিক বেঞ্চমার্ক প্রাক্কলন।'
                : 'Calculation formula: Gross Revenue (Yield Maund × Price/Maund) - Total Cost = Net Profit (1 maund = 40 kg, 1 ha ≈ 7.47 bigha). Data source: BARI & DAE 2024-2025 regional benchmark guidelines.'}
            </div>

            {/* Season Filter Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant={selectedSeason === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedSeason('all')}
              >
                {lang === 'bn' ? 'সব ফসল' : 'All Crops'}
              </Button>
              <Button
                variant={selectedSeason === 'rabi' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedSeason('rabi')}
              >
                {lang === 'bn' ? 'শীতকালীন ফসল (রবি)' : 'Winter (Rabi)'}
              </Button>
              <Button
                variant={selectedSeason === 'kharif' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedSeason('kharif')}
              >
                {lang === 'bn' ? 'বর্ষাকালীন ফসল (খরিফ)' : 'Monsoon (Kharif)'}
              </Button>
            </div>
          </Card>

          {/* Recommended Crop Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {filteredCrops.map((crop) => (
              <Card key={crop.id} variant="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{crop.icon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                          {lang === 'bn' ? crop.name : crop.name_en}
                        </h3>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{crop.variety}</span>
                      </div>
                    </div>
                    <Pill tone={crop.tone}>{crop.badge}</Pill>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: '10px 0', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                    💡 {lang === 'bn' ? crop.why_suitable : crop.why_suitable_en}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <Stat label={t('cost_label')} value={lang === 'bn' ? crop.cost_bigha : crop.cost_bigha_en} sub={t('bigha_unit')} />
                    <Stat label={t('yield_label')} value={lang === 'bn' ? crop.yield_bigha : crop.yield_bigha_en} sub={t('bigha_unit')} />
                    <Stat label={t('profit_label')} value={lang === 'bn' ? crop.profit_bigha : crop.profit_bigha_en} sub={t('bigha_unit')} tone="leaf" />
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0' }}>
                    🏷️ {t('price_label')}: <strong style={{ color: 'var(--text)' }}>{lang === 'bn' ? crop.price : crop.price_en}</strong>
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{lang === 'bn' ? crop.price_source : crop.price_source_en}</div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--alert)', margin: '8px 0', lineHeight: 1.4 }}>
                    ⚠️ {lang === 'bn' ? crop.risks : crop.risks_en}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => onNavigate && onNavigate('harvest_profit')}
                  >
                    {t('view_profit_calc_btn')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (onAskAi) {
                        onAskAi(`${crop.name} চাষের খরচ, সেচ ও রোগবালাই প্রতিরোধ সম্পর্কে পরামর্শ দিন।`);
                      } else if (onNavigate) {
                        onNavigate('assistant');
                      }
                    }}
                  >
                    🤖 {t('ask_ai_about_crop')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
