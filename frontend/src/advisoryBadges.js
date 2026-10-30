// Advisory evidence and formatting helpers

const BN_MONTHS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toBanglaDigits(num) {
  if (num == null) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

export function doyToDate(doy, lang = 'en') {
  if (doy == null || isNaN(doy)) return null;
  const floorDoy = Math.floor(Number(doy));
  if (floorDoy < 1 || floorDoy > 365) return null;
  // Non-leap year 2025
  const d = new Date(Date.UTC(2025, 0, floorDoy));
  const day = d.getUTCDate();
  const monthIdx = d.getUTCMonth();

  if (lang === 'bn') {
    return `${toBanglaDigits(day)} ${BN_MONTHS[monthIdx]}`;
  }
  return `${day} ${EN_MONTHS[monthIdx]}`;
}

export function evidenceBadge(rec, comp, status) {
  if (status === 'not_applicable' || rec?.status === 'not_applicable') {
    return { tone: 'neutral', bn: 'প্রযোজ্য নয়', en: 'Not applicable' };
  }
  if (rec?.evidence_level === 'insufficient' || comp?.status === 'insufficient') {
    return { tone: 'neutral', bn: 'অপর্যাপ্ত উপাত্ত', en: 'Insufficient data' };
  }
  if (comp?.status === 'unreliable_window_censored') {
    return { tone: 'sun', bn: 'অনির্ভরযোগ্য উপাত্ত', en: 'Unreliable data' };
  }
  if (rec?.evidence_level === 'not_significant') {
    return { tone: 'neutral', bn: 'নিশ্চিত পরিবর্তন নেই', en: 'No significant change' };
  }
  if (rec?.evidence_level === 'significant') {
    const shift = comp?.shift_days_median != null ? Number(comp.shift_days_median) : 0;
    if (shift > 0) {
      return { tone: 'alert', bn: 'বিলম্বের প্রমাণ আছে', en: 'Evidence of delay' };
    }
    if (shift < 0) {
      return { tone: 'leaf', bn: 'আগাম শুরুর প্রমাণ আছে', en: 'Evidence of earlier onset' };
    }
    return { tone: 'alert', bn: 'পরিবর্তনের প্রমাণ আছে', en: 'Evidence of change' };
  }
  return { tone: 'neutral', bn: 'নিশ্চিত পরিবর্তন নেই', en: 'No significant change' };
}
