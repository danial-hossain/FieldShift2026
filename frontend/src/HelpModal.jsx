// frontend/src/HelpModal.jsx
// In-App Contextual Help Modal for FieldShift 2026
// P6.3: Opened by the '?' button on each page; displays that page's specific section of the guide.

import React from 'react';
import { CloseIcon, InfoIcon, EvidenceIcon } from './ui/index.js';

const HELP_SECTIONS = {
  dashboard: {
    titleBn: 'হোম পেজ সহায়তা (Overview Guide)',
    titleEn: 'Overview Help & Guide',
    descBn: 'আজকের প্রধান কৃষি সিদ্ধান্ত, সারসংক্ষেপ ও প্রধান উপগ্রহ মেট্রিক্স।',
    descEn: 'Today\'s key agricultural recommendations, summary, and NASA satellite metrics.',
    bulletsBn: [
      'সিদ্ধান্ত বাক্য: আপনার নির্দিষ্ট জমির জন্য প্রস্তাবিত আবর্তন ও সাশ্রয় নির্দেশ করে।',
      '৫টি কেপিআই টাইলস: নাসা ক্লাইমেটোলজির ২৫ বছরের উপাত্ত এবং বর্তমান আর্দ্রতা বিশ্লেষণ।',
      '৩০ দিনের বৃষ্টিপাত চার্ট: NASA POWER পর্যবেক্ষণ ভিত্তিক বৃষ্টিপাতের গতিধারা।',
      'আমন অনসেট বিশ্লেষণ: সাম্প্রতিক দশকে বর্ষার বৃষ্টিপাত শুরুর পরিবর্তন।'
    ],
    bulletsEn: [
      'Answer Header: Clear recommendation showing the recommended rotation vs baseline.',
      '5 KPI Tiles: Real 25-year NASA climatology years, active districts, and rain sum.',
      '30-Day Rainfall: Daily observed precip series from NASA POWER.',
      'Aman Onset Shift: Empirical monsoon moisture shifts over recent decades.'
    ],
    sources: 'NASA POWER v2.4.1, NASA GPM IMERG v07, ISRIC SoilGrids 250m'
  },
  field: {
    titleBn: 'আমার জমি পেজ সহায়তা (My Fields Guide)',
    titleEn: 'My Fields Help & Guide',
    descBn: 'জমির প্লট তালিকা, ভৌগোলিক অবস্থান, মাটির ধরন ও বৈশিষ্ট্য।',
    descEn: 'Farm parcels registry, coordinates, soil texture, and irrigation capacity.',
    bulletsBn: [
      'প্লট নির্বাচন: ড্রপডাউন বা ম্যাপ থেকে জমি নির্বাচন করলে সব পেজে সেই জমির উপাত্ত লোড হয়।',
      'মাটির ধরন: বেলে, পলি, দোআঁশ বা এঁটেল অনুযায়ী পানির ধারণক্ষমতা ও ফসল নির্ধারণ হয়।',
      'জমি যুক্ত করা: নতুন জমির জিপিএস স্থানাঙ্ক দিয়ে মাটির স্যাটেলাইট প্রোফাইল পাওয়া যায়।'
    ],
    bulletsEn: [
      'Active Parcel: Selecting a parcel updates all views and optimization models.',
      'Soil Texture: ISRIC SoilGrids classification dictates available water capacity (AWC).',
      'Add Field: Enter coordinates to instantly enrich soil texture and climatology.'
    ],
    sources: 'ISRIC SoilGrids 250m, NASA SRTM 30m Digital Elevation'
  },
  farm_planning: {
    titleBn: 'আবর্তন পরিকল্পনা সহায়তা (Rotation Planner Guide)',
    titleEn: 'Rotation Planner Help & Guide',
    descBn: 'ঐতিহ্যবাহী বনাম লাভ ও পানির অনুকূল শস্য আবর্তন মডেল।',
    descEn: 'Comparing baseline farmer rotation against 3 optimized multi-season strategies.',
    bulletsBn: [
      'সিদ্ধান্ত শিরোনাম: বর্তমান বনাম নতুন আবর্তনের লাভ ও পানি সাশ্রয়ের তুলনামূলক পার্থক্য।',
      '৩টি অনুকূল কৌশল: ১. লাভ অগ্রাধিকার, ২. পানি সাশ্রয়, ৩. সুষম আবর্তন।',
      '১২ মাসের ক্যালেন্ডার: বীজ বপন, বৃদ্ধি ও ফসল তোলার সঠিক মৌসুমী সময়সূচি।',
      'প্রিন্ট ও এসএমএস: কৃষকদের জন্য এক ক্লিকে A4 রিপোর্ট প্রিন্ট বা SMS টেক্সট কপি।'
    ],
    bulletsEn: [
      'Answer-First Layer: Concrete profit, water, and soil nutrient deltas.',
      '3 Optimization Profiles: Profit-Focused, Water Conservation, and Balanced.',
      '12-Month Calendar: Clear sowing, vegetative, and harvest windows.',
      'Print & SMS: Printable farmer card or plain text SMS for rural delivery.'
    ],
    sources: 'BBS Agricultural Statistics, FAOSTAT Bangladesh, NASA POWER ET0'
  },
  weather: {
    titleBn: 'আবহাওয়া ও ঝুঁকি সহায়তা (Climate & Risk Guide)',
    titleEn: 'Climate & Risk Help & Guide',
    descBn: 'নাসা বৃষ্টিপাত, বর্ষা অনসেট শিফট ও তাপপ্রবাহ ঝুঁকি।',
    descEn: 'NASA 30-day precipitation series, monsoon onset shifts, and climate risks.',
    bulletsBn: [
      'বর্ষা অনসেট পরিবর্তন: গত ২০ বছরে বৃষ্টিপাত ক-দিন এগিয়ে বা পিছিয়ে এসেছে তা নির্দেশ করে।',
      'তাপপ্রবাহ ঝুঁকি: বোরো ও রবি ফসলের ফুলের সময় চরম তাপমাত্রার সম্ভাবনা।',
      'বাংলাদেশ জলবায়ু মানচিত্র: ৬৪ জেলার ভূগর্ভস্থ পানি (GRACE) ও বৃষ্টিপাতের মানচিত্র।'
    ],
    bulletsEn: [
      'Monsoon Onset Shift: Compares Period 1 (2001-2012) vs Period 2 (2013-2025).',
      'Heat Stress Index: Frequency of critical temperature spikes during flowering.',
      '64-District Climate Map: Interactive GRACE-FO groundwater & IMERG rainfall.'
    ],
    sources: 'NASA POWER v2.4.1, NASA GPM IMERG v07, NASA GRACE-FO Mascon'
  },
  water_irrigation: {
    titleBn: 'পানি ও সেচ সহায়তা (Water & Irrigation Guide)',
    titleEn: 'Water & Irrigation Help & Guide',
    descBn: 'সেচ ক্যালেন্ডার, এডব্লিউডি (AWD) এবং মাটির পানির স্তম্ভ।',
    descEn: 'FAO-56 dual crop coefficient water balance, AWD scheduling, and soil water column.',
    bulletsBn: [
      'সেচ ক্যালেন্ডার: কোন তারিখে কত মিমি সেচ দিতে হবে এবং কতদিন পর সেচ বন্ধ রাখা যাবে।',
      'এডব্লিউডি (AWD): পর্যায়ক্রমে ভেজানো ও শুকানো পদ্ধতিতে ২৫-৩০% সেচ সাশ্রয়।',
      'ত্রিমাত্রিক মাটির পানির স্তম্ভ: মাটির মূল অঞ্চলের পানির ওঠানামা ও বাষ্পীভবন পর্যবেক্ষণ।'
    ],
    bulletsEn: [
      'Irrigation Scheduling: Recommended application dates and depth in mm.',
      'Alternate Wetting & Drying: Safe drying cycle saves 25-30% pumping fuel.',
      '3D Soil-Water Column: Cutaway block showing root depth, depletion, and rain.'
    ],
    sources: 'FAO-56 Penman-Monteith, NASA SMAP L4 Root-Zone Moisture, NASA GRACE-FO'
  },
  harvest_profit: {
    titleBn: 'বাজার ও অর্থনীতি সহায়তা (Market Intelligence Guide)',
    titleEn: 'Market Intelligence Help & Guide',
    descBn: 'বাজারদর, উৎপাদন খরচ, মোট লাভ ও জাতীয় খাদ্য চাহিদা।',
    descEn: 'Crop market prices, cultivation costs, net margins, and national demand.',
    bulletsBn: [
      'বাজারদর ও খরচ: বিঘা বা হেক্টর প্রতি সার, বীজ ও সেচের আনুমানিক খরচের হিসাব।',
      'জাতীয় পুষ্টি চাহিদা: আমদানিনির্ভর তেলবীজ ও ডালশস্য উৎপাদনে উদ্বুদ্ধকরণ।',
      'ব্রেক-ইভেন মূল্য: সর্বনিম্ন কোন মূল্যে বিক্রি করলে কৃষকের ক্ষতি হবে না।'
    ],
    bulletsEn: [
      'Price & Cost Economics: Real BBS and FAO price series with illustrative tags.',
      'National Import Substitution: Highlights pulses and oilseeds saving foreign reserve.',
      'Break-even Price: Minimum farmgate price required to cover total costs.'
    ],
    sources: 'BBS Agricultural Statistics, FAOSTAT Bangladesh, DAM Market Rates'
  },
  digital_twin: {
    titleBn: '৩ডি খামার সহায়তা (3D Farm Diorama Guide)',
    titleEn: '3D Farm Diorama Help & Guide',
    descBn: 'বাস্তবসম্মত ত্রিমাত্রিক শস্য আবর্তন মডেল ও মাটির স্তর।',
    descEn: 'Photorealistic stylized 3D farm diorama driven by field data and season slider.',
    bulletsBn: [
      'মৌসুম স্লাইডার: রবি থেকে খরিফ পর্যন্ত ৬টি মৌসুমে ফসলের বৃদ্ধি ও পানির পরিবর্তন দেখুন।',
      'ক্যামেরা ভিউ: সার্বিক আইসোমেট্রিক, ক্লোজ-আপ, পার্শ্ব-ছেদ বা টপ-ডাউন ভিউ বেছে নিন।',
      'আঞ্চলিক মাটি: রাজশাহীর লালচে বরেন্দ্র মাটি ও সুনামগঞ্জের হাওরের রূপ প্রত্যক্ষ করুন।'
    ],
    bulletsEn: [
      'Season Slider: Step through all 6 planning periods to observe crop transitions.',
      'Camera Presets: Switch between Overview, Close-Up, Side Cut, and Top-Down.',
      'Regional Physics: Barind reddish terrace vs Haor alluvial flooded basin.'
    ],
    sources: 'FieldShift Procedural WebGL Engine, ISRIC SoilGrids, NASA POWER'
  },
  data_evidence: {
    titleBn: 'প্রমাণ ও পদ্ধতি সহায়তা (Evidence & Method Guide)',
    titleEn: 'Evidence & Method Help & Guide',
    descBn: 'নাসা উপগ্রহ তথ্যসূত্র, যাচাইকরণ কোড ও বিচারক চেকলিস্ট।',
    descEn: 'NASA dataset provenance, validation code, research lab, and judge checklist.',
    bulletsBn: [
      'উপাত্তের স্বচ্ছতা: নাসার প্রতিটি ডেটাসেটের রেজোলিউশন ও অ্যাক্সেস মেথড।',
      'বিচারক চেকলিস্ট: নাসা স্পেস অ্যাপস ২০২৬ এর মূল্যায়ন রুব্রিক ও বাস্তবায়ন প্রমাণ।',
      'গবেষণা ল্যাব: কাউন্টারফ্যাকচুয়াল সিমুলেশন ও অ্যালগরিদম বিশ্লেষণ।'
    ],
    bulletsEn: [
      'Data Provenance: Resolution, latency, and endpoints for all NASA datasets.',
      'Judge Checklist: Traceability matrix for NASA Space Apps Challenge rubric.',
      'Research Lab: Counterfactual simulations and optimization telemetry.'
    ],
    sources: 'NASA Earthdata, POWER API, GES DISC, SoilGrids, BBS, FAO'
  }
};

export function HelpModal({
  isOpen,
  onClose,
  activeNav = 'dashboard',
  lang = 'bn',
  onOpenOnboarding = null
}) {
  if (!isOpen) return null;

  const section = HELP_SECTIONS[activeNav] || HELP_SECTIONS.dashboard;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(5, 11, 16, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%',
        maxWidth: '580px',
        background: 'var(--bg-card, #161d23)',
        border: '1.5px solid var(--border-medium, #2a3742)',
        borderRadius: 'var(--radius-lg, 16px)',
        boxShadow: 'var(--shadow-elevation-2, 0 16px 40px rgba(0,0,0,0.65))',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--primary, #00df81)' }}><InfoIcon size={22} /></span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #e8ece9)' }}>
              {lang === 'bn' ? section.titleBn : section.titleEn}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}
            aria-label="Close help"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted, #9aa5a0)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {lang === 'bn' ? section.descBn : section.descEn}
        </p>

        {/* Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {(lang === 'bn' ? section.bulletsBn : section.bulletsEn).map((bullet, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-light, #222c36)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: '12.5px',
              color: 'var(--text-main, #e8ece9)',
              lineHeight: 1.45
            }}>
              <span style={{ color: 'var(--primary, #00df81)', marginTop: 2, fontWeight: 800 }}>•</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {/* Data Sources Footnote */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 8,
          fontSize: '11.5px',
          color: 'var(--text-muted, #9aa5a0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <span>উৎস: <strong>{section.sources}</strong></span>
          <span className="source-tag verified">যাচাইকৃত</span>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light, #222c36)', paddingTop: 14 }}>
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenOnboarding(); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {lang === 'bn' ? 'সম্পূর্ণ ৩-ধাপের নির্দেশিকা দেখুন' : 'Replay 3-Step Tour'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--primary, #00df81)',
              border: 'none',
              color: '#0f172a',
              borderRadius: 8,
              padding: '6px 18px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            {lang === 'bn' ? 'বুঝেছি (Close)' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
