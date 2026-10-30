// frontend/src/comparisonLabEngine.js
// Deterministic business logic, schema validation, and normalization for Comparison Lab

/**
 * Validates the raw Comparison Lab API response.
 * Requires:
 * - status === 'ok'
 * - methods is an array
 * - contains all three required IDs: 'milp', 'rl', 'rule_based'
 */
export function validateComparisonResponse(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Comparison response is empty or invalid.' };
  }
  if (data.status !== 'ok') {
    return { isValid: false, error: data.detail || data.message || `Comparison status error: ${data.status || 'unknown'}` };
  }
  if (!Array.isArray(data.methods)) {
    return { isValid: false, error: 'Comparison response is missing the methods array.' };
  }
  const REQUIRED_METHOD_IDS = ['milp', 'rl', 'rule_based'];
  const presentIds = new Set(data.methods.map(m => m?.id));
  const missingMethods = REQUIRED_METHOD_IDS.filter(id => !presentIds.has(id));
  if (missingMethods.length > 0) {
    return { isValid: false, error: `Comparison response missing methods: ${missingMethods.join(', ')}.` };
  }
  return { isValid: true, error: null };
}

/**
 * Safely parses numeric metrics ensuring strictly finite numbers.
 * Missing, undefined, or empty values parse to null. Legitimate 0 remains 0.
 */
export function parseFiniteMetric(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

/**
 * Formats constraint violations count with explicit states.
 * Missing/invalid values are NEVER interpreted as 0.
 */
export function formatViolations(violations, isAmber = false) {
  if (violations === null || violations === undefined || !Number.isInteger(Number(violations)) || Number(violations) < 0) {
    return { text: 'Violation count unavailable', isZero: false, isMissing: true };
  }
  const v = Number(violations);
  if (v === 0) {
    return { text: '✓ 0 Violations', isZero: true, isMissing: false };
  }
  return { text: `${isAmber ? '⚠ ' : ''}${v} Violation${v === 1 ? '' : 's'}`, isZero: false, isMissing: false };
}

/**
 * Extracts first crop from rotation mapping or sequence string.
 * Supports both " -> " and "→" delimiters.
 */
export function extractFirstCrop(raw) {
  if (!raw) return null;
  if (raw.rotation && typeof raw.rotation === 'object') {
    const firstPeriod = Object.keys(raw.rotation)[0];
    if (firstPeriod && raw.rotation[firstPeriod]) {
      return String(raw.rotation[firstPeriod]).trim();
    }
  }
  if (typeof raw.rotation_sequence === 'string' && raw.rotation_sequence.trim()) {
    const parts = raw.rotation_sequence.split(/\s*(?:->|→)\s*/);
    if (parts[0] && parts[0].trim()) {
      return parts[0].trim();
    }
  }
  if (raw.crop && typeof raw.crop === 'string' && raw.crop.trim()) {
    return raw.crop.trim();
  }
  return null;
}

/**
 * Extracts the crop name for a specific seasonal period.
 * Supports both structured rotation mapping and delimited strings.
 */
export function getCropForSeason(method, seasonLabel, idx) {
  if (!method) return '—';
  if (method.rotation && typeof method.rotation === 'object' && method.rotation[seasonLabel]) {
    return String(method.rotation[seasonLabel]).trim();
  }
  if (typeof method.rotation_sequence === 'string' && method.rotation_sequence.trim()) {
    const parts = method.rotation_sequence.split(/\s*(?:->|→)\s*/);
    if (parts[idx] && parts[idx].trim()) {
      return parts[idx].trim();
    }
  }
  return '—';
}

/**
 * Validates field inputs before submitting to API.
 * Detects whether field is demo mode or a real farmer parcel with missing inputs.
 */
export function validateFieldInputs(activeField) {
  const isDemo = !activeField || activeField.id === 'demo' || activeField.is_demo || (typeof activeField.name === 'string' && activeField.name.toLowerCase().includes('demo'));
  if (isDemo) {
    return { isValid: true, isDemo: true, missingInputs: [] };
  }

  const missing = [];
  if (activeField.latitude == null || !Number.isFinite(Number(activeField.latitude))) {
    missing.push('Latitude');
  }
  if (activeField.longitude == null || !Number.isFinite(Number(activeField.longitude))) {
    missing.push('Longitude');
  }
  if (activeField.area_ha == null || !Number.isFinite(Number(activeField.area_ha)) || Number(activeField.area_ha) <= 0) {
    missing.push('Field Area (ha)');
  }

  return {
    isValid: missing.length === 0,
    isDemo: false,
    missingInputs: missing,
  };
}

/**
 * Determines winner without defaulting or fabricating outcomes.
 */
export function determineComparisonWinner(tradeOffs, category = 'highest_profit') {
  if (!tradeOffs || typeof tradeOffs !== 'object') {
    return { hasWinner: false, method: null, value: null, explanation: null };
  }
  const entry = tradeOffs[category];
  if (!entry || !entry.method) {
    return { hasWinner: false, method: null, value: null, explanation: null };
  }

  const valKey = category === 'highest_profit'
    ? 'value_bdt_ha'
    : category === 'most_water_efficient'
    ? 'value_mm'
    : 'value_delta';

  const val = entry[valKey];
  if (val === null || val === undefined || !Number.isFinite(Number(val))) {
    return { hasWinner: false, method: null, value: null, explanation: null };
  }

  return {
    hasWinner: true,
    method: entry.method,
    value: Number(val),
    explanation: entry.explanation || null,
  };
}

