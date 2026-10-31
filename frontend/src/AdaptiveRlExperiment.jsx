import React, { useEffect, useMemo, useRef, useState } from 'react';
import { request as defaultRequest } from './apiClient.js';
import {
  normalizeNumberInput,
  normalizeSimulationState,
  readInputValue
} from './rlSimulationState.js';

const SEASONS = ['Y1_S1', 'Y1_S2', 'Y1_S3', 'Y2_S1', 'Y2_S2', 'Y2_S3'];
const ACTIONS = ['Sesame', 'Groundnut', 'Chickpea', 'Lentil', 'Mungbean', 'Sorghum', 'Tomato', 'Soybean'];
const num = (value, digits = 1) =>
  value == null || !Number.isFinite(Number(value)) ? 'Not Available' : Number(value).toFixed(digits);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const temperatureSourceLabel = source => source || 'unavailable';
const inputSourceLabel = source => source === 'user_override'
  ? 'user-supplied simulation assumption'
  : typeof source === 'string' && source ? source : 'unavailable';
const feasibilityFor = (candidates, crop) => candidates?.find(action => action.crop === crop) || null;

function rotationValues(result) {
  const rotation = result?.rotation || result?.selected_crop_by_period || {};
  return Object.values(rotation);
}

export function AdaptiveRlExperiment({
  activeField,
  fieldState,
  loading,
  benchmarkError,
  onRetryBenchmark,
  selectedStrategyId,
  selectedBenchmarkContext,
  strategyProfiles,
  benchmarkData,
  activeMilpResult,
  strategyMetrics,
  strategyYieldAnalysis,
  form,
  workflowPayload,
  request: propRequest
}) {
  const request = typeof propRequest === 'function' ? propRequest : defaultRequest;
  const rawFieldId = activeField?.id ?? fieldState?.field_id ?? null;
  const fieldId = typeof rawFieldId === 'string' || (
    typeof rawFieldId === 'number' && Number.isFinite(rawFieldId)
  ) ? rawFieldId : null;
  const syntheticBenchmark = selectedBenchmarkContext !== 'operational' && benchmarkData?.inputs
    ? benchmarkData
    : null;
  const initialInputs = syntheticBenchmark?.inputs;
  const stateValue = (benchmarkValue, fieldValue) => syntheticBenchmark
    ? benchmarkValue ?? null
    : fieldValue ?? null;
  const fallbackProfiles = {
    profit_focused: { name: 'Profit Focused', icon: '💰', weights: { profit: 0.70, water: 0.20, soil: 0.10 } },
    water_efficiency: { name: 'Water Efficiency', icon: '💧', weights: { profit: 0.20, water: 0.60, soil: 0.20 } },
    soil_health: { name: 'Soil Health & Regeneration', icon: '🌱', weights: { profit: 0.20, water: 0.20, soil: 0.60 } },
    balanced: { name: 'Balanced Multi-Objective', icon: '⚖️', weights: { profit: 0.34, water: 0.33, soil: 0.33 } }
  };
  const activeProfiles = strategyProfiles || fallbackProfiles;
  const selectedStrategy = (selectedStrategyId && activeProfiles[selectedStrategyId]) || activeProfiles.balanced || fallbackProfiles.balanced;
  const activeSolverStatus = String(activeMilpResult?.solver_status || activeMilpResult?.status || '').toLowerCase();


  const hasFeasibleMilpReference = Boolean(
    activeMilpResult &&
    rotationValues(activeMilpResult).length === 6 &&
    !/(infeasible|failed|error|unavailable|not[_ ]available)/.test(activeSolverStatus)
  );
  const initialState = useMemo(() => normalizeSimulationState({
    season_id: SEASONS[0],
    temperature_c: stateValue(initialInputs?.temperature_c, fieldState?.temperature_c),
    available_water_mm: stateValue(initialInputs?.available_water_mm, fieldState?.available_water_mm),
    soil_moisture: stateValue(initialInputs?.soil_moisture, fieldState?.soil_moisture),
    organic_matter_pct: stateValue(initialInputs?.organic_matter_pct, fieldState?.organic_matter_percent),
    organic_matter_source: stateValue(initialInputs?.organic_matter_source, fieldState?.soil_data_source) ?? 'unavailable',
    soil_health_score: stateValue(initialInputs?.soil_health_score_proxy, fieldState?.soil_health_score_proxy),
    soil_health_score_source: stateValue(initialInputs?.soil_health_score_source, fieldState?.soil_health_score_source) ?? 'unavailable',
    temperature_source: temperatureSourceLabel(stateValue(initialInputs?.temperature_source, fieldState?.temperature_source ?? fieldState?.environment_source)),
    available_water_source: inputSourceLabel(stateValue(initialInputs?.available_water_source, fieldState?.available_water_source)),
    soil_ph: stateValue(initialInputs?.soil_ph, fieldState?.soil_ph),
    soil_ph_source: stateValue(initialInputs?.soil_ph_source, fieldState?.soil_ph_source) ?? 'unavailable',
    previous_crop: stateValue(initialInputs?.previous_crop, fieldState?.previous_crop ?? activeField?.previous_crop),
    previous_crop_family: syntheticBenchmark ? null : fieldState?.previous_crop_family ?? null,
    previous_crop_is_legume: syntheticBenchmark ? null : fieldState?.previous_crop_is_legume ?? null,
    seasons_since_legume: !syntheticBenchmark
      ? fieldState?.seasons_since_legume ?? (fieldState?.previous_crop_is_legume === true ? 0 : null)
      : null,
    field_id: fieldId,
    field_area_ha: stateValue(initialInputs?.field_size_ha, activeField?.area_ha ?? fieldState?.field_size_ha),
    irrigation_capacity_mm: stateValue(initialInputs?.irrigation_capacity_mm, activeField?.irrigation_capacity_mm ?? fieldState?.irrigation_capacity_mm),
    environmental_source: syntheticBenchmark ? 'synthetic benchmark scenario' : fieldState?.environment_source ?? 'unavailable',
    soil_moisture_source: stateValue(initialInputs?.soil_moisture_source, fieldState?.soil_moisture_source) ?? 'unavailable'
  }), [fieldState, activeField, fieldId, initialInputs, syntheticBenchmark]);

  const [experiment, setExperiment] = useState(null);
  const activeExperimentIdRef = useRef(null);
  const [availableWaterAssumption, setAvailableWaterAssumption] = useState('');
  const [requestedSeasonCount, setRequestedSeasonCount] = useState(1);
  const [interventionDraft, setInterventionDraft] = useState({
    water_reduction_pct: 0,
    temperature_delta_c: 0,
    available_water_override_mm: '',
    temperature_override_c: '',
    applied_crop: ''
  });
  const [scoresExpanded, setScoresExpanded] = useState(false);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [reoptimization, setReoptimization] = useState({ status: 'not_available', result: null, error: '' });

  useEffect(() => {
    activeExperimentIdRef.current = null;
    setExperiment(null);
    setReoptimization({ status: 'not_available', result: null, error: '' });
    setSelectedSeasonIndex(0);
    setRequestedSeasonCount(1);
    setAvailableWaterAssumption('');
  }, [fieldId, selectedStrategyId, selectedBenchmarkContext]);

  const parsedWaterAssumption = normalizeNumberInput(availableWaterAssumption);
  const preparedInitialState = {
    ...initialState,
    available_water_mm: initialState.available_water_mm == null
      ? parsedWaterAssumption === '' ? null : parsedWaterAssumption
      : initialState.available_water_mm,
    available_water_source: initialState.available_water_mm == null && parsedWaterAssumption !== ''
      ? 'user-supplied simulation assumption'
      : initialState.available_water_source
  };
  const baselineStateReady = [
    preparedInitialState.temperature_c,
    preparedInitialState.available_water_mm,
    preparedInitialState.soil_health_score,
    preparedInitialState.field_area_ha
  ].every(value => value != null && Number.isFinite(Number(value))) &&
    Number(preparedInitialState.temperature_c) >= -10 &&
    Number(preparedInitialState.temperature_c) <= 60 &&
    Number(preparedInitialState.available_water_mm) >= 0 &&
    Number(preparedInitialState.available_water_mm) <= 100000 &&
    Number(preparedInitialState.field_area_ha) > 0 &&
    Number(preparedInitialState.soil_health_score) >= 0 &&
    Number(preparedInitialState.soil_health_score) <= 100 &&
    (preparedInitialState.soil_ph == null || (
      Number(preparedInitialState.soil_ph) >= 0 &&
      Number(preparedInitialState.soil_ph) <= 14
    ));
  const displayedInitialState = experiment?.initialState || preparedInitialState;

  const start = () => {
    const seasonCount = Number(requestedSeasonCount);
    if (!Number.isInteger(seasonCount) || seasonCount < 1 || seasonCount > SEASONS.length) return;
    if (!baselineStateReady || !fieldId || !hasFeasibleMilpReference) return;
    const initialSnapshot = normalizeSimulationState(preparedInitialState);
    const experimentId = `${String(fieldId)}-${Date.now()}`;
    activeExperimentIdRef.current = experimentId;
    setExperiment({
      experimentId,
      fieldId,
      selectedStrategyId,
      initialMilpRotation: [...rotationValues(activeMilpResult)],
      selectedBenchmarkContext,
      benchmarkId: syntheticBenchmark?.scenario?.scenario_id ?? null,
      initialWorkflowPayload: syntheticBenchmark ? null : workflowPayload(form, activeField),
      plannedSeasonCount: seasonCount,
      currentSeasonIndex: 0,
      initialState: initialSnapshot,
      currentState: initialSnapshot,
      currentDecision: null,
      seasons: [],
      finalState: null,
      phase: 'awaiting_baseline_execution',
      status: 'ready',
      error: ''
    });
    setInterventionDraft({
      water_reduction_pct: 0,
      temperature_delta_c: 0,
      available_water_override_mm: '',
      temperature_override_c: '',
      applied_crop: ''
    });
    setReoptimization({ status: 'not_available', result: null, error: '' });
    setSelectedSeasonIndex(0);
    setScoresExpanded(false);
    setRequestedSeasonCount(seasonCount);
  };

  const extendSeasonHorizon = () => {
    if (!experiment || experiment.phase !== 'horizon_reached') return;
    const nextHorizon = Number(requestedSeasonCount);
    if (!Number.isInteger(nextHorizon) || nextHorizon <= experiment.seasons.length || nextHorizon > SEASONS.length) return;
    setExperiment(previous => ({
      ...previous,
      plannedSeasonCount: nextHorizon,
      phase: 'awaiting_rl_action',
      status: 'partial',
      error: ''
    }));
  };

  const stopExperiment = () => {
    if (!experiment || experiment.phase !== 'awaiting_rl_action' || completedSeasonCount === 0) return;
    setExperiment(previous => ({ ...previous, phase: 'stopped', status: 'stopped', error: '' }));
  };

  const resumeExperiment = () => {
    if (!experiment || experiment.phase !== 'stopped') return;
    setExperiment(previous => ({ ...previous, phase: 'awaiting_rl_action', status: 'partial', error: '' }));
  };

  const resetSimulation = () => {
    activeExperimentIdRef.current = null;
    setExperiment(null);
    setReoptimization({ status: 'not_available', result: null, error: '' });
    setSelectedSeasonIndex(0);
    setScoresExpanded(false);
    setRequestedSeasonCount(1);
    setInterventionDraft({
      water_reduction_pct: 0,
      temperature_delta_c: 0,
      available_water_override_mm: '',
      temperature_override_c: '',
      applied_crop: ''
    });
  };

  const selectedIndex = experiment?.currentSeasonIndex ?? 0;
  const stateForNextAction = experiment?.currentState;
  const currentSeasonId = SEASONS[Math.min(selectedIndex, SEASONS.length - 1)];
  const currentReference = (experiment?.initialMilpRotation || rotationValues(activeMilpResult))[selectedIndex] ?? null;
  const currentStepLabel = (() => {
    if (!experiment) {
      return baselineStateReady && fieldId && hasFeasibleMilpReference
        ? 'Current Experiment Step: Year 1 · Season 1 — MILP Baseline ready'
        : 'Current Experiment Step: Year 1 · Season 1 — Field/MILP context unavailable';
    }
    const completed = experiment.seasons.filter(season => season.status === 'completed').length;
    switch (experiment.phase) {
      case 'completed':
        return `Current Experiment Step: Season 6 — Full trajectory completed (${completed} / 6 seasons)`;
      case 'stopped':
        return `Current Experiment Step: Experiment stopped by user after Season ${completed}`;
      case 'horizon_reached':
        return `Current Experiment Step: Season ${completed} completed — paused at the selected run horizon`;
      case 'error':
        return `Current Experiment Step: Season ${selectedIndex + 1} — Error; retry the current step`;
      case 'loading_decision':
        return `Current Experiment Step: Season ${selectedIndex + 1} — Generating RL adaptive decision`;
      case 'loading_outcome':
        return `Current Experiment Step: Season ${selectedIndex + 1} — Running season simulation`;
      case 'awaiting_baseline_execution':
        return 'Current Experiment Step: Year 1 · Season 1 — MILP Baseline ready to run';
      case 'loading_intervention':
        return `Current Experiment Step: Season ${experiment.seasons.length} — Applying state update`;
      case 'awaiting_season_execution':
        return `Current Experiment Step: Season ${selectedIndex + 1} — RL adaptive action ready to run`;
      case 'awaiting_intervention':
        return `Current Experiment Step: Season ${experiment.seasons.length} — Awaiting optional post-season intervention`;
      default:
        return `Current Experiment Step: Season ${selectedIndex + 1} — Ready to Generate RL Adaptive Action`;
    }
  })();

  const executeBaselineSeason = async () => {
    if (!experiment || experiment.seasons.length || !stateForNextAction) return;
    const experimentId = experiment.experimentId;
    setExperiment(previous => ({ ...previous, status: 'loading', phase: 'loading_outcome', error: '' }));
    try {
      const response = await request('/api/rl/baseline-execute', {
        method: 'POST',
        body: JSON.stringify({
          field_id: experiment.fieldId,
          state: normalizeSimulationState(stateForNextAction),
          season_index: 0,
          strategy_id: experiment.selectedStrategyId,
          field_area_ha: stateForNextAction.field_area_ha,
          initial_state: normalizeSimulationState(experiment.initialState),
          completed_seasons: [],
          milp_reference_rotation: experiment.initialMilpRotation
        })
      });
      if (response?.status !== 'completed' || response?.season?.status !== 'completed'
        || response.season.decision_source !== 'milp_baseline'
        || response.season.applied_action !== experiment.initialMilpRotation[0]
        || response.season.rl_proposed_action != null) {
        throw new Error('MILP baseline execution did not return the selected Season 1 crop.');
      }
      if (activeExperimentIdRef.current !== experimentId) return;
      const season = {
        seasonId: currentSeasonId,
        stateBefore: normalizeSimulationState(stateForNextAction),
        milpReferenceCrop: currentReference,
        rlProposedAction: null,
        rlPolicyScore: null,
        decisionReason: null,
        appliedAction: response.season.applied_action,
        decisionSource: 'milp_baseline',
        outcome: response.season.outcome,
        stressIntervention: null,
        stateAfterCrop: normalizeSimulationState(response.season.state_after_crop),
        stateAfter: null,
        candidateActions: [],
        status: 'awaiting_intervention'
      };
      setExperiment(previous => previous?.experimentId === experimentId ? {
        ...previous,
        seasons: [season],
        currentDecision: null,
        currentSeasonIndex: 0,
        phase: 'awaiting_intervention',
        status: 'partial',
        error: ''
      } : previous);
      setSelectedSeasonIndex(0);
    } catch (error) {
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => previous?.experimentId === experimentId
        ? { ...previous, status: 'error', phase: 'error', error: error.message }
        : previous);
    }
  };

  const runAdaptation = async () => {
    if (!experiment || !stateForNextAction || selectedIndex < 1 || selectedIndex >= SEASONS.length) return;
    const experimentId = experiment.experimentId;
    setExperiment(previous => ({ ...previous, status: 'loading', phase: 'loading_decision', error: '' }));
    try {
      const response = await request('/api/rl/decision', {
        method: 'POST',
        body: JSON.stringify({
          field_id: experiment.fieldId,
          state: normalizeSimulationState(stateForNextAction),
          season_index: selectedIndex,
          strategy_id: experiment.selectedStrategyId,
          field_area_ha: stateForNextAction.field_area_ha,
          initial_state: normalizeSimulationState(experiment.initialState),
          completed_seasons: experiment.seasons.map(season => ({
            season_id: season.seasonId,
            state_before: normalizeSimulationState(season.stateBefore),
            milp_reference_crop: season.milpReferenceCrop,
            rl_proposed_action: season.rlProposedAction,
            applied_action: season.appliedAction,
            decision_source: season.decisionSource,
            outcome: season.outcome,
            stress_intervention: season.stressIntervention,
            state_after_crop: normalizeSimulationState(season.stateAfterCrop),
            state_after: normalizeSimulationState(season.stateAfter),
            status: season.status
          })),
          milp_reference_rotation: experiment.initialMilpRotation
        })
      });
      if (!response?.decision?.rl_proposed_action || !Array.isArray(response.decision.candidate_actions) || !response.decision.reward_configuration) {
        throw new Error('RL decision service returned an incomplete decision.');
      }
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => previous?.experimentId === experimentId ? ({
        ...previous,
        currentDecision: response.decision,
        policyLabel: response.decision.policy_label,
        rewardConfiguration: response.decision.reward_configuration,
        decisionContext: response.decision.experiment_context,
        phase: 'awaiting_season_execution',
        status: 'ready',
        error: ''
      }) : previous);
      setSelectedSeasonIndex(selectedIndex);
    } catch (error) {
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => previous?.experimentId === experimentId
        ? { ...previous, status: 'error', phase: 'error', error: error.message }
        : previous);
    }
  };

  const executeSeason = async () => {
    if (!experiment?.currentDecision || !stateForNextAction) return;
    const experimentId = experiment.experimentId;
    setExperiment(previous => ({ ...previous, status: 'loading', phase: 'loading_outcome', error: '' }));
    try {
      const response = await request('/api/rl/execute', {
        method: 'POST',
        body: JSON.stringify({
          field_id: experiment.fieldId,
          state: normalizeSimulationState(stateForNextAction),
          season_index: selectedIndex,
          strategy_id: experiment.selectedStrategyId,
          field_area_ha: stateForNextAction.field_area_ha,
          initial_state: normalizeSimulationState(experiment.initialState),
          completed_seasons: experiment.seasons.map(season => ({
            season_id: season.seasonId,
            state_before: normalizeSimulationState(season.stateBefore),
            milp_reference_crop: season.milpReferenceCrop,
            rl_proposed_action: season.rlProposedAction,
            applied_action: season.appliedAction,
            decision_source: season.decisionSource,
            outcome: season.outcome,
            stress_intervention: season.stressIntervention,
            state_after_crop: normalizeSimulationState(season.stateAfterCrop),
            state_after: normalizeSimulationState(season.stateAfter),
            status: season.status
          })),
          milp_reference_rotation: experiment.initialMilpRotation,
          applied_crop: interventionDraft.applied_crop || null,
          expected_proposed_action: experiment.currentDecision.rl_proposed_action
        })
      });
      if (response?.status !== 'completed' || response?.season?.status !== 'completed') {
        throw new Error('Season execution did not return a completed simulation result.');
      }
      const season = {
        seasonId: currentSeasonId,
        stateBefore: normalizeSimulationState(stateForNextAction),
        milpReferenceCrop: currentReference,
        rlProposedAction: response.season.rl_proposed_action,
        rlPolicyScore: response.season.rl_policy_score,
        decisionReason: response.season.decision_reason,
        appliedAction: response.season.applied_action,
        decisionSource: response.season.decision_source,
        outcome: response.season.outcome,
        stressIntervention: null,
        stateAfterCrop: normalizeSimulationState(response.season.state_after_crop),
        stateAfter: null,
        candidateActions: response.season.candidate_actions,
        status: 'awaiting_intervention'
      };
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => {
        if (previous?.experimentId !== experimentId) return previous;
        const seasons = [...previous.seasons, season];
        return {
          ...previous,
          seasons,
          finalState: null,
          currentDecision: null,
          currentSeasonIndex: seasons.length,
          phase: 'awaiting_intervention',
          status: 'partial',
          error: ''
        };
      });
      setSelectedSeasonIndex(selectedIndex);
      setInterventionDraft({
        water_reduction_pct: 0,
        temperature_delta_c: 0,
        available_water_override_mm: '',
        temperature_override_c: '',
        applied_crop: ''
      });
    } catch (error) {
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => previous?.experimentId === experimentId
        ? { ...previous, status: 'error', phase: 'error', error: error.message }
        : previous);
    }
  };

  const applyIntervention = async (draft = interventionDraft) => {
    const completedSeasonIndex = experiment?.seasons.length - 1;
    const lastSeason = experiment?.seasons[completedSeasonIndex];
    if (!lastSeason?.stateAfterCrop) return;
    const experimentId = experiment.experimentId;
    const isFinalSeason = completedSeasonIndex === SEASONS.length - 1;
    setExperiment(previous => ({ ...previous, status: 'loading', phase: 'loading_intervention', error: '' }));
    try {
      const waterReduction = normalizeNumberInput(draft?.water_reduction_pct);
      const temperatureDelta = normalizeNumberInput(draft?.temperature_delta_c);
      const waterOverride = normalizeNumberInput(draft?.available_water_override_mm);
      const temperatureOverride = normalizeNumberInput(draft?.temperature_override_c);
      if (![0, 0.2, 0.4, 0.6].includes(waterReduction)) {
        throw new Error('Water stress must be No Change, -20%, -40%, or -60%.');
      }
      if (![0, 1, 3, 5].includes(temperatureDelta)) {
        throw new Error('Temperature change must be No Change, +1°C, +3°C, or +5°C.');
      }
      if (waterOverride !== '' && (waterOverride < 0 || waterOverride > 100000)) {
        throw new Error('Water override must be between 0 and 100000 mm.');
      }
      if (temperatureOverride !== '' && (temperatureOverride < -10 || temperatureOverride > 60)) {
        throw new Error('Temperature override must be between -10 and 60°C.');
      }
      const response = await request('/api/rl/intervene', {
        method: 'POST',
        body: JSON.stringify({
          field_id: experiment.fieldId,
          season_index: completedSeasonIndex,
          state: normalizeSimulationState(lastSeason.stateAfterCrop),
          intervention: {
            water_reduction_pct: waterReduction,
            temperature_delta_c: temperatureDelta,
            available_water_override_mm: waterOverride === '' ? null : waterOverride,
            temperature_override_c: temperatureOverride === '' ? null : temperatureOverride
          }
        })
      });
      if (response?.status !== 'updated' || !response.state_after) {
        throw new Error('Intervention service returned no updated state.');
      }
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => {
        if (previous?.experimentId !== experimentId) return previous;
        const seasons = [...previous.seasons];
        seasons[completedSeasonIndex] = {
          ...seasons[completedSeasonIndex],
          stressIntervention: response.intervention,
          stateAfter: normalizeSimulationState(response.state_after),
          status: 'completed'
        };
        return {
          ...previous,
          seasons,
          currentState: normalizeSimulationState(response.state_after),
          finalState: isFinalSeason ? normalizeSimulationState(response.state_after) : null,
          currentSeasonIndex: seasons.length,
          phase: isFinalSeason
            ? 'completed'
            : seasons.length >= previous.plannedSeasonCount
              ? 'horizon_reached'
              : 'awaiting_rl_action',
          status: isFinalSeason ? 'completed' : 'partial',
          error: ''
        };
      });
      setInterventionDraft({
        water_reduction_pct: 0,
        temperature_delta_c: 0,
        available_water_override_mm: '',
        temperature_override_c: '',
        applied_crop: ''
      });
    } catch (error) {
      if (activeExperimentIdRef.current !== experimentId) return;
      setExperiment(previous => previous?.experimentId === experimentId
        ? { ...previous, status: 'error', phase: 'error', error: error.message }
        : previous);
    }
  };

  const retry = () => {
    if (experiment?.phase === 'error') {
      const lastSeason = experiment.seasons[experiment.seasons.length - 1];
      const phase = experiment.currentDecision
        ? 'awaiting_season_execution'
        : !lastSeason
          ? 'awaiting_baseline_execution'
          : lastSeason.status !== 'completed'
          ? 'awaiting_intervention'
          : experiment.seasons.length >= experiment.plannedSeasonCount
            ? 'horizon_reached'
            : 'awaiting_rl_action';
      setExperiment(previous => ({
        ...previous,
        status: previous.seasons.length ? 'partial' : 'ready',
        phase,
        error: ''
      }));
    }
  };

  const integrityErrors = useMemo(() => {
    if (!experiment) return [];
    const errors = [];
    experiment.seasons.forEach((season, index) => {
      if (index === 0 && !same(experiment.initialState, season.stateBefore)) {
        errors.push('S1 state_before does not match the selected field/MILP context.');
      }
      if (index === 0 && (
        season.decisionSource !== 'milp_baseline'
        || season.rlProposedAction != null
        || season.appliedAction !== season.milpReferenceCrop
      )) {
        errors.push('S1 must record the selected MILP baseline crop without an RL proposal.');
      }
      if (index > 0 && !['rl_policy', 'user_override'].includes(season.decisionSource)) {
        errors.push(`${season.seasonId} must record an RL policy or user override decision source.`);
      }
      if (index > 0) {
        const previousSeason = experiment.seasons[index - 1];
        if (!previousSeason.stateAfter) {
          errors.push(`${previousSeason.seasonId} has no completed State After before ${season.seasonId}.`);
        } else if (!same(previousSeason.stateAfter, season.stateBefore)) {
          errors.push(`State continuity failed between ${previousSeason.seasonId} and ${season.seasonId}.`);
        }
      }
      if (season.outcome?.crop !== season.appliedAction) {
        errors.push(`${season.seasonId} outcome does not match the applied crop.`);
      }
      if (season.stateAfterCrop?.previous_crop !== season.appliedAction) {
        errors.push(`${season.seasonId} post-crop state does not record its applied crop.`);
      }
      if (season.stateAfter && season.stateAfter.previous_crop !== season.appliedAction) {
        errors.push(`${season.seasonId} resulting state does not record the applied crop.`);
      }
    });
    return errors;
  }, [experiment]);

  useEffect(() => {
    if (import.meta.env.DEV && integrityErrors.length) {
      integrityErrors.forEach(message => console.error(`[RL experiment integrity] ${message}`));
    }
  }, [integrityErrors]);

  const selectedRecord = experiment?.seasons[selectedSeasonIndex] || (
    experiment?.currentDecision && selectedSeasonIndex === experiment.currentSeasonIndex
      ? {
          seasonId: currentSeasonId,
          stateBefore: experiment.currentState,
          milpReferenceCrop: currentReference,
          rlProposedAction: experiment.currentDecision.rl_proposed_action,
          rlPolicyScore: experiment.currentDecision.rl_policy_score,
          decisionReason: experiment.currentDecision.decision_reason,
          candidateActions: experiment.currentDecision.candidate_actions,
          status: 'action_generated'
        }
      : null
  );
  const selectedAppliedCandidate = selectedRecord?.appliedAction
    ? feasibilityFor(selectedRecord.candidateActions, selectedRecord.appliedAction)
    : null;
  const selectedProposalCandidate = selectedRecord
    ? feasibilityFor(selectedRecord.candidateActions, selectedRecord.rlProposedAction)
    : null;
  const initialRotation = experiment?.initialMilpRotation || rotationValues(activeMilpResult);
  const appliedRotation = experiment?.seasons.map(season => season.appliedAction) || [];
  const proposedRotation = [
    ...(experiment?.seasons.filter((_, index) => index > 0).map(season => season.rlProposedAction) || []),
    ...(experiment?.currentDecision ? [experiment.currentDecision.rl_proposed_action] : [])
  ];
  const changedFromMilp = experiment?.seasons.filter(season =>
    season.milpReferenceCrop && season.appliedAction !== season.milpReferenceCrop
  ).length || 0;
  const overrideCount = experiment?.seasons.filter(season => season.decisionSource === 'user_override').length || 0;
  const stressCount = experiment?.seasons.filter(season =>
    season.stressIntervention?.water_reduction_pct > 0 ||
    season.stressIntervention?.temperature_delta_c > 0 ||
    season.stressIntervention?.available_water_override_mm != null ||
    season.stressIntervention?.temperature_override_c != null
  ).length || 0;
  const totalProduction = experiment?.seasons.length && experiment.seasons.every(season => season.outcome?.production_tons != null)
    ? experiment.seasons.reduce((sum, season) => sum + Number(season.outcome.production_tons), 0)
    : null;
  const totalWater = experiment?.seasons.reduce((sum, season) => sum + (Number(season.outcome?.water_use_mm) || 0), 0);
  const totalReward = experiment?.seasons.reduce((sum, season) => sum + (Number(season.outcome?.reward) || 0), 0);
  const completedSeasonCount = experiment?.seasons.filter(season => season.status === 'completed').length || 0;
  const latestRlState = experiment?.finalState
    || experiment?.seasons[experiment.seasons.length - 1]?.stateAfter
    || experiment?.seasons[experiment.seasons.length - 1]?.stateAfterCrop
    || experiment?.currentState;
  const latestSeasonRecord = experiment?.seasons[experiment.seasons.length - 1] || null;

  const strategyMetric = id => {
    const entry = Object.entries(strategyMetrics || {}).find(([name]) => {
      const key = name.toLowerCase().replace(/[\s-]+/g, '_');
      return key === id || (id === 'water_efficiency' && key === 'water_focused') || (id === 'soil_health' && key === 'soil_focused');
    });
    return entry?.[1] || {};
  };
  const selectedBaselineMetrics = strategyMetric(selectedStrategyId);
  const selectedBaselineSoilScore = selectedBaselineMetrics.soil_score
    ?? selectedBaselineMetrics.soil_health_score
    ?? activeMilpResult?.soil_score
    ?? activeMilpResult?.soil_component;
  const selectedBaselineProduction = selectedBaselineMetrics.total_harvest_tons
    ?? activeMilpResult?.total_harvest_tons
    ?? activeMilpResult?.production_tons;
  const syntheticMlStrategyKey = selectedStrategyId === 'water_efficiency'
    ? 'water_focused'
    : selectedStrategyId === 'soil_health' ? 'soil_focused' : selectedStrategyId;
  const selectedSyntheticMlAnalysis = strategyYieldAnalysis?.[syntheticMlStrategyKey];
  const syntheticMlRotationMatches = Array.isArray(selectedSyntheticMlAnalysis?.seasons)
    && selectedSyntheticMlAnalysis.seasons.length === initialRotation.length
    && selectedSyntheticMlAnalysis.seasons.every((season, index) =>
      season.crop === initialRotation[index]
      && season.period_key === `Y${Math.floor(index / 2) + 1}_S${(index % 2) + 1}`
    );
  const milpProductionBreakdown = selectedBaselineMetrics.seasonal_production_breakdown || [];
  const mlProductionByPeriod = new Map(
    (syntheticMlRotationMatches ? selectedSyntheticMlAnalysis.seasons : [])
      .map(season => [season.period_key, season])
  );
  const matchingSyntheticMlProduction = syntheticMlRotationMatches
    ? selectedSyntheticMlAnalysis.metrics?.total_production_tons
    : null;
  const selectedBaselineWater = selectedBaselineMetrics.total_water_requirement_mm
    ?? activeMilpResult?.total_water_requirement_mm
    ?? activeMilpResult?.water_demand_mm;

  const reoptimize = async () => {
    if (experiment?.seasons.length !== 6 || !experiment.finalState || integrityErrors.length) return;
    const experimentId = experiment.experimentId;
    setReoptimization({ status: 'loading', result: null, error: '' });
    try {
      const result = await request('/api/rl/reoptimize', {
        method: 'POST',
        body: JSON.stringify({
          field_id: experiment.fieldId,
          strategy_id: experiment.selectedStrategyId,
          final_state: normalizeSimulationState(experiment.finalState),
          rl_trajectory: experiment.seasons.map(season => ({
            season_id: season.seasonId,
            state_before: normalizeSimulationState(season.stateBefore),
            milp_reference_crop: season.milpReferenceCrop,
            rl_proposed_action: season.rlProposedAction,
            applied_action: season.appliedAction,
            decision_source: season.decisionSource,
            outcome: season.outcome,
            stress_intervention: season.stressIntervention,
            state_after_crop: normalizeSimulationState(season.stateAfterCrop),
            state_after: normalizeSimulationState(season.stateAfter),
            status: season.status
          })),
          benchmark_id: experiment.benchmarkId || undefined,
          workflow_payload: experiment.initialWorkflowPayload || undefined
        })
      });
      if (activeExperimentIdRef.current !== experimentId) return;
      if (!result?.summary?.planning) throw new Error('MILP service returned no optimization summary.');
      setReoptimization({ status: 'ready', result, error: '' });
    } catch (error) {
      if (activeExperimentIdRef.current !== experimentId) return;
      setReoptimization({ status: 'error', result: null, error: error.message });
    }
  };

  const fmtCrop = crop => crop || 'Not Available';
  const provenanceState = experiment?.initialState || preparedInitialState;
  const sourceText = `Temperature: ${provenanceState.temperature_source || 'unavailable'}; available water: ${provenanceState.available_water_source || 'unavailable'}; soil moisture: ${provenanceState.soil_moisture_source || 'unavailable'}; soil pH: ${provenanceState.soil_ph_source || 'unavailable'}; soil-health proxy: ${provenanceState.soil_health_score_source || 'unavailable'}.`;

  return (
    <div className="rl-experiment-container">
      <header className="dash-card rl-hero-banner">
        <div className="rl-hero-header">
          <div className="rl-hero-title-group">
            <h3 className="rl-hero-title">Experimental RL Policy &amp; Adaptive Stress Simulation</h3>
            <p className="rl-hero-subtitle">
              Season-by-season simulation-trained policy adaptation under changing field conditions and sequential stress/intervention events.
            </p>
          </div>
          <span className="rl-badge-experimental">
            <span className="rl-badge-dot" aria-hidden="true"></span>
            Simulation-Trained · Experimental · Not Field Validated
          </span>
        </div>
        <div className="rl-hero-notice">
          S1 establishes the MILP baseline. From S2 onward, the simulation-trained experimental RL policy adapts to simulated changes in field state; it does not replace MILP planning and is not a field-validated agronomic recommendation.
        </div>
        <div className="rl-hero-subnotice">
          RL adaptation begins after the MILP baseline season. RL decisions are simulation-trained and experimental, not field-validated agronomic recommendations.
        </div>
      </header>

      <section className="dash-card rl-context-section">
        <h4 className="rl-section-title">Experiment Context</h4>
        {loading && <div role="status" className="rl-alert-info">Loading selected field and MILP results…</div>}
        {benchmarkError && (
          <div role="alert" className="rl-alert-error">
            <span>Benchmark load failed: {benchmarkError}</span>
            <button type="button" className="btn-secondary-sm" onClick={onRetryBenchmark}>Retry benchmark</button>
          </div>
        )}
        <div className="rl-context-grid">
          <div className="rl-context-tile">
            <span className="rl-context-label">Selected Field</span>
            <strong className="rl-context-value">{syntheticBenchmark?.scenario?.name || activeField?.name || 'Not Available'}</strong>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Field ID / Scenario</span>
            <strong className="rl-context-value">{syntheticBenchmark?.scenario?.scenario_id || fieldId || 'Not Available'}</strong>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Field Area</span>
            <strong className="rl-context-value">{num(initialState.field_area_ha)} ha</strong>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Soil Texture</span>
            <strong className="rl-context-value">{syntheticBenchmark?.scenario?.soil_texture || activeField?.soil_texture || fieldState?.soil_texture || 'Not Available'}</strong>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Organic Matter</span>
            <strong className="rl-context-value">{num(initialState.organic_matter_pct)}%</strong>
            <span className="rl-context-meta">{displayedInitialState.organic_matter_source}</span>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Irrigation Capacity</span>
            <strong className="rl-context-value">{num(initialState.irrigation_capacity_mm)} mm</strong>
          </div>
          <div className="rl-context-tile">
            <span className="rl-context-label">Simulation Horizon</span>
            <strong className="rl-context-value">6 Seasons / 3 Years</strong>
          </div>
        </div>
      </section>

      <section className="dash-card rl-baseline-card">
        <h4 className="rl-section-title">Selected Initial MILP Baseline</h4>
        {hasFeasibleMilpReference ? (
          <>
            <div className="rl-strategy-header">
              <span className="rl-strategy-name">{selectedStrategy.name}</span>
              <div className="rl-weights-group">
                <span className="rl-weight-pill profit">{Math.round(selectedStrategy.weights.profit * 100)}% Profit</span>
                <span className="rl-weight-pill water">{Math.round(selectedStrategy.weights.water * 100)}% Water</span>
                <span className="rl-weight-pill soil">{Math.round(selectedStrategy.weights.soil * 100)}% Soil</span>
              </div>
            </div>
            <div className="rl-rotation-ribbon">
              {initialRotation.length ? initialRotation.map((crop, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="rl-ribbon-arrow" aria-hidden="true">→</span>}
                  <span className="rl-ribbon-step">S{index + 1} {crop}</span>
                </React.Fragment>
              )) : 'Initial MILP rotation not available.'}
            </div>
            <div className="rl-kpi-grid">
              <div className="rl-kpi-tile">
                <div className="rl-kpi-tile-label">Optimizer-Side Rotation Yield</div>
                <div className="rl-kpi-tile-value">{num(selectedBaselineProduction)} tons</div>
              </div>
              <div className="rl-kpi-tile">
                <div className="rl-kpi-tile-label">Water Demand</div>
                <div className="rl-kpi-tile-value">{num(selectedBaselineWater, 0)} mm</div>
              </div>
              <div className="rl-kpi-tile">
                <div className="rl-kpi-tile-label">Soil Metric</div>
                <div className="rl-kpi-tile-value">{selectedBaselineSoilScore == null ? 'Not Available' : `${num(selectedBaselineSoilScore, 2)} / 6.0`}</div>
              </div>
              <div className="rl-kpi-tile">
                <div className="rl-kpi-tile-label">Composite Score</div>
                <div className="rl-kpi-tile-value">{num(activeMilpResult.composite_score, 3)}</div>
              </div>
            </div>
            <h5 className="rl-table-section-title">Six-Season Production Audit</h5>
            <div className="rl-table-caption">
              Dynamic MILP yield = base crop yield × thermal × soil × water-stress factors (zero when infeasible); season production = dynamic yield × {num(selectedBaselineMetrics.field_size_ha ?? initialState.field_size_ha, 1)} ha. One selected crop is counted per period. ML is shown only when its crop rotation and season keys match.
            </div>
            <div className="table-scroll-container">
              <table className="strategy-table-enhanced modern-audit-table">
                <thead>
                  <tr>
                    <th>Season / Crop</th>
                    <th>Feasible</th>
                    <th>Base yield (t/ha)</th>
                    <th>Thermal factor</th>
                    <th>Soil factor</th>
                    <th>Water factor</th>
                    <th>MILP yield (t/ha)</th>
                    <th>MILP production (tons)</th>
                    <th>ML yield (t/ha)</th>
                    <th>ML production (tons)</th>
                  </tr>
                </thead>
                <tbody>
                  {milpProductionBreakdown.map(row => {
                    const mlSeason = mlProductionByPeriod.get(row.period);
                    return (
                      <tr key={row.period}>
                        <td><strong>{row.period}</strong> · {row.crop}</td>
                        <td>
                          <span className={`feasible-badge ${row.is_feasible === true ? 'yes' : row.is_feasible === false ? 'no' : 'unknown'}`}>
                            {row.is_feasible == null ? 'Not available' : row.is_feasible ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>{num(row.base_yield_t_ha, 3)}</td>
                        <td>{num(row.thermal_factor, 3)}</td>
                        <td>{num(row.soil_factor, 3)}</td>
                        <td>{num(row.water_stress_factor, 3)}</td>
                        <td><strong>{num(row.yield_t_ha, 3)}</strong></td>
                        <td><strong>{num(row.production_tons, 3)}</strong></td>
                        <td>{mlSeason ? num(mlSeason.predicted_yield_t_ha, 3) : 'Not available'}</td>
                        <td>{mlSeason?.production_tons == null ? 'Not available' : num(mlSeason.production_tons, 3)}</td>
                      </tr>
                    );
                  })}
                  {milpProductionBreakdown.length > 0 && (
                    <tr className="audit-total-row">
                      <td><strong>Six-season total</strong></td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td><strong>{num(selectedBaselineProduction, 2)}</strong></td>
                      <td>—</td>
                      <td><strong>{matchingSyntheticMlProduction == null ? 'Not available' : num(matchingSyntheticMlProduction, 2)}</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : <div role="status">A feasible six-season MILP reference rotation is unavailable for the selected field and strategy.</div>}
      </section>

      <section className="dash-card rl-starting-card">
        <h4 className="rl-section-title">S1 Starting Conditions</h4>
        <div className="rl-table-caption">
          S1 uses existing field/scenario inputs and the selected MILP baseline. Missing values remain Not Available; no separate starting-state inputs are requested.
        </div>
        <div className="rl-sensors-grid">
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Soil Moisture</span>
            <div className="rl-sensor-value">{num(displayedInitialState.soil_moisture, 3)}<span className="rl-sensor-unit">m³/m³</span></div>
            <span className="rl-sensor-source">{displayedInitialState.soil_moisture_source}</span>
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Available Water</span>
            <div className="rl-sensor-value">{num(initialState.available_water_mm)}<span className="rl-sensor-unit">mm</span></div>
            <span className="rl-sensor-source">{initialState.available_water_source}</span>
            {initialState.available_water_mm == null && (
              <div className="rl-water-assumption-box">
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  S1 Available Water Assumption
                  <div className="rl-water-input-group" style={{ marginTop: 4 }}>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="any"
                      value={availableWaterAssumption}
                      disabled={Boolean(experiment)}
                      onChange={event => setAvailableWaterAssumption(normalizeNumberInput(readInputValue(event)))}
                      placeholder="Enter available water"
                      aria-label="S1 Available Water Assumption in millimeters"
                      className="rl-water-input"
                    />
                    <span className="rl-water-unit">mm</span>
                  </div>
                  <span className="rl-water-caption"><strong>User-supplied simulation assumption</strong>. This value is not inferred from irrigation capacity or field measurements.</span>
                </label>
              </div>
            )}
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Temperature</span>
            <div className="rl-sensor-value">{num(displayedInitialState.temperature_c)}<span className="rl-sensor-unit">°C</span></div>
            <span className="rl-sensor-source">{displayedInitialState.temperature_source}</span>
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Soil pH</span>
            <div className="rl-sensor-value">{num(displayedInitialState.soil_ph)}</div>
            <span className="rl-sensor-source">{displayedInitialState.soil_ph_source || 'unavailable'}</span>
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Organic Matter</span>
            <div className="rl-sensor-value">{num(displayedInitialState.organic_matter_pct)}<span className="rl-sensor-unit">%</span></div>
            <span className="rl-sensor-source">{displayedInitialState.organic_matter_source}</span>
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Simulation Soil-Health Proxy</span>
            <div className="rl-sensor-value">{num(displayedInitialState.soil_health_score)}<span className="rl-sensor-unit">/ 100</span></div>
            <span className="rl-sensor-source">{displayedInitialState.soil_health_score_source}</span>
          </div>
          <div className="rl-sensor-tile">
            <span className="rl-sensor-label">Previous Crop</span>
            <div className="rl-sensor-value">{displayedInitialState.previous_crop || 'Not Available'}</div>
            <span className="rl-sensor-source">Prior harvest state</span>
          </div>
        </div>
        <div className="rl-horizon-bar">
          <div className="rl-horizon-select-group">
            <label className="rl-horizon-label">Run Horizon</label>
            <select
              value={experiment?.plannedSeasonCount || requestedSeasonCount}
              disabled={Boolean(experiment)}
              onChange={event => {
                const value = Number(readInputValue(event));
                if (Number.isInteger(value) && value >= 1 && value <= SEASONS.length) setRequestedSeasonCount(value);
              }}
              className="rl-horizon-select"
            >
              {SEASONS.map((_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'Season' : 'Seasons'}</option>)}
            </select>
          </div>
          <span role="status" className="rl-horizon-badge">
            Selected: {requestedSeasonCount} {Number(requestedSeasonCount) === 1 ? 'Season' : 'Seasons'}
          </span>
          {!experiment && (
            <button type="button" className="btn-start-simulation" onClick={() => start()} disabled={loading || !baselineStateReady || !fieldId || !hasFeasibleMilpReference}>
              <span>🚀</span> Start Simulation — {requestedSeasonCount} {Number(requestedSeasonCount) === 1 ? 'Season' : 'Seasons'}
            </button>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>Maximum experiment horizon: 6 seasons.</div>
        {!experiment && (!baselineStateReady || !fieldId || !hasFeasibleMilpReference) && (
          <div role="status" className="rl-alert-warning">
            {preparedInitialState.available_water_mm == null
              ? 'S1 cannot run because available water is unavailable. Enter an explicit S1 Available Water Assumption to run the baseline.'
              : (preparedInitialState.temperature_c == null
                || preparedInitialState.soil_health_score == null
                || preparedInitialState.field_area_ha == null)
                ? 'S1 cannot run because required field/scenario values are unavailable. No values have been fabricated.'
              : !fieldId
                ? 'Select a registered field or explicit research demo.'
                : 'A feasible six-season reference plan for the selected MILP strategy is required.'}
          </div>
        )}
      </section>

      {experiment && latestSeasonRecord && (
        <section className="dash-card rl-outcome-banner">
          <div className="rl-outcome-header">
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: 15, fontWeight: 800 }}>
              {latestSeasonRecord.seasonId === 'Y1_S1' ? 'S1 Outcome & State Change' : `${latestSeasonRecord.seasonId.replace('_', ' · ')} Outcome & State Change`}
            </h4>
            <span className="rl-outcome-crop-badge">Applied: {latestSeasonRecord.appliedAction}</span>
          </div>
          <div className="rl-outcome-metrics">
            <span>Expected Yield: <strong>{num(latestSeasonRecord.outcome?.expected_yield_t_ha, 2)} t/ha</strong></span>
            <span>·</span>
            <span>Water Demand: <strong>{num(latestSeasonRecord.outcome?.water_use_mm, 0)} mm</strong></span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }}>
            {latestSeasonRecord.stateAfter
              ? 'Resulting state after optional intervention; simulation-derived, not a measured field observation.'
              : 'Post-crop simulated state before the optional intervention; not a measured field observation.'}
          </div>
          <div className="rl-context-grid">
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Available Water</span>
              <strong className="rl-context-value">{num((latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).available_water_mm)} mm</strong>
              <span className="rl-context-meta">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).available_water_source || 'unavailable'}</span>
            </div>
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Temperature</span>
              <strong className="rl-context-value">{num((latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).temperature_c)}°C</strong>
              <span className="rl-context-meta">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).temperature_source || 'unavailable'}</span>
            </div>
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Soil pH</span>
              <strong className="rl-context-value">{num((latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_ph)}</strong>
              <span className="rl-context-meta">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_ph_source || 'unavailable'}</span>
            </div>
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Soil Moisture</span>
              <strong className="rl-context-value">{num((latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_moisture, 3)} m³/m³</strong>
              <span className="rl-context-meta">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_moisture_source || 'unavailable'}</span>
            </div>
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Soil-Health Proxy</span>
              <strong className="rl-context-value">{num((latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_health_score)} / 100</strong>
              <span className="rl-context-meta">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).soil_health_score_source || 'unavailable'}</span>
            </div>
            <div className="rl-context-tile rl-outcome-tile">
              <span className="rl-context-label">Previous Crop</span>
              <strong className="rl-context-value">{(latestSeasonRecord.stateAfter || latestSeasonRecord.stateAfterCrop).previous_crop || 'Not Available'}</strong>
              <span className="rl-context-meta">Simulated rotation state</span>
            </div>
          </div>
        </section>
      )}

      <section className="dash-card rl-config-strip">
        <div className="rl-config-title">RL Configuration</div>
        <div className="rl-config-text">
          <strong>Algorithm:</strong> {experiment?.policyLabel || 'Backend sequential policy'} · <strong>Action Space:</strong> {ACTIONS.join(', ')} · <strong>Horizon:</strong> 6 seasons
        </div>
        <div className="rl-config-subtext">
          {experiment?.rewardConfiguration
            ? <><strong>Backend reward:</strong> {experiment.rewardConfiguration.formula}. <strong>Normalization:</strong> profit ÷ {num(experiment.rewardConfiguration.normalization.profit_scale_bdt_ha, 0)} BDT/ha; water denominator floor {num(experiment.rewardConfiguration.normalization.water_denominator_floor_mm, 0)} mm; soil scale {num(experiment.rewardConfiguration.normalization.soil_health_scale, 0)}. <strong>Active strategy weights:</strong> {JSON.stringify(experiment.rewardConfiguration.strategy_weights)}. These are experimental simulation settings, not validated priorities.</>
            : 'Reward formula and configuration are supplied by the backend with the first sequential RL decision.'}
        </div>
      </section>

      <section className="dash-card rl-main-experiment-card">
        <div className="rl-main-header">
          <div>
            <h4 className="rl-section-title" style={{ margin: 0 }}>Adaptive RL Experiment — Up to 6 Seasons</h4>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
              {currentStepLabel}
            </div>
            <div className="rl-progress-status">
              Current run horizon: <strong>{experiment?.plannedSeasonCount || requestedSeasonCount} {Number(experiment?.plannedSeasonCount || requestedSeasonCount) === 1 ? 'season' : 'seasons'}</strong> · Progress: <strong>{completedSeasonCount} / {experiment?.plannedSeasonCount || requestedSeasonCount}</strong> selected seasons completed · Maximum experiment horizon: 6 seasons.
              {experiment?.seasons.some(season => season.status === 'awaiting_intervention') && ' A season outcome is recorded; its post-season state update is pending.'}
            </div>
            {experiment?.phase === 'horizon_reached' && (
              <div role="status" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, fontWeight: 600 }}>
                Season {completedSeasonCount} completed — experiment paused at the selected horizon. You can extend the experiment to Season {completedSeasonCount + 1}–6.
              </div>
            )}
            {experiment?.phase === 'completed' && completedSeasonCount === 6 && (
              <div role="status" style={{ fontSize: 12, color: 'var(--primary)', marginTop: 5, fontWeight: 700 }}>Six-season RL trajectory complete: 6 / 6 selected seasons completed.</div>
            )}
          </div>
          {experiment && <button type="button" className="btn-secondary-sm" onClick={resetSimulation}>Reset Simulation</button>}
        </div>

        <div className="rl-pipeline-tracker">
          {['Selected MILP Baseline', 'S1 · MILP Baseline', 'State Change / Optional Intervention', 'S2–S6 · RL Adaptive', 'Season Outcomes'].map((label, index) => (
            <React.Fragment key={label}>
              {index > 0 && <span className="rl-tracker-arrow" aria-hidden="true">→</span>}
              <span className="rl-tracker-step">{label}</span>
            </React.Fragment>
          ))}
        </div>

        {experiment?.error && (
          <div role="alert" className="rl-alert-error">
            <span>RL experiment error: {experiment.error}</span>
            <button type="button" onClick={retry} className="btn-secondary-sm">Retry</button>
          </div>
        )}
        {integrityErrors.map(error => <div key={error} role="alert" style={{ color: '#991b1b', marginBottom: 6, fontSize: 12 }}>State integrity diagnostic: {error}</div>)}

        <div className="table-scroll-container">
          <table className="strategy-table-enhanced rl-trajectory-table">
            <thead>
              <tr>
                <th>Season / Type</th>
                <th>State / Basis</th>
                <th>MILP Reference</th>
                <th>RL Proposal</th>
                <th>Applied Action</th>
                <th>Season Outcome</th>
                <th>State Change / Stress</th>
                <th>State After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SEASONS.map((seasonId, index) => {
                const record = experiment?.seasons[index];
                const stateBefore = record?.stateBefore
                  || (index === 0
                    ? experiment?.initialState || preparedInitialState
                    : index === selectedIndex && ['awaiting_rl_action', 'awaiting_season_execution', 'loading_decision', 'loading_outcome', 'horizon_reached', 'stopped'].includes(experiment?.phase)
                      ? experiment?.currentState
                      : null);
                const outcome = record?.outcome;
                const futureStatus = 'Not generated';
                const currentStatus = !experiment
                  ? index === 0 ? baselineStateReady ? 'Ready to Start MILP Baseline' : 'Field inputs unavailable' : 'Not generated'
                  : index !== selectedIndex ? futureStatus
                    : experiment.phase === 'stopped' ? 'Not generated — experiment stopped by user'
                    : experiment.phase === 'loading_decision' ? 'Generating RL action'
                      : experiment.phase === 'loading_outcome' ? 'Running season simulation'
                        : experiment.phase === 'error'
                          ? 'Error — retry the current step'
                        : experiment.phase === 'awaiting_baseline_execution' ? 'Ready to Run MILP Baseline'
                          : experiment.phase === 'awaiting_rl_action' ? 'Ready to Generate RL Adaptive Action'
                            : experiment.phase === 'awaiting_season_execution' ? 'Ready to Run'
                              : experiment.phase === 'awaiting_intervention' ? 'Awaiting Post-Season Intervention'
                                : experiment.phase === 'loading_intervention' ? 'Applying State Update'
                                  : experiment.phase === 'horizon_reached' ? 'Not generated — stopped at selected horizon'
                                    : experiment.phase === 'completed' ? 'Not generated' : 'Not generated';
                const isSelectedRow = selectedIndex === index;
                const isInteractive = record || (experiment?.currentDecision && index === selectedIndex);
                return (
                  <tr
                    key={seasonId}
                    onClick={() => isInteractive && setSelectedSeasonIndex(index)}
                    className={isSelectedRow ? 'rl-row-selected' : ''}
                    style={{ cursor: isInteractive ? 'pointer' : undefined }}
                  >
                    <td>
                      <div className="rl-season-cell">
                        <span className="rl-season-year">Year {Math.floor(index / 2) + 1} · Season {(index % 2) + 1}</span>
                        <span className="rl-season-type-pill">{index === 0 ? 'MILP Baseline' : 'RL Adaptive'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="rl-state-text">
                        {stateBefore
                          ? `${index === 0 ? 'Field / MILP context' : `Post-${SEASONS[index - 1]} state`} · Water ${num(stateBefore.available_water_mm)} mm · Temp ${num(stateBefore.temperature_c)}°C · Soil ${num(stateBefore.soil_health_score)}`
                          : 'Not generated'}
                      </span>
                    </td>
                    <td><span className="rl-crop-badge">{fmtCrop(record?.milpReferenceCrop ?? initialRotation[index])}</span></td>
                    <td>
                      {index === 0 ? (
                        <span style={{ color: '#64748b' }}>Not Applicable — S1 is MILP baseline</span>
                      ) : (
                        <span className="rl-crop-badge">
                          {record?.rlProposedAction || (experiment?.currentDecision && index === selectedIndex ? experiment.currentDecision.rl_proposed_action : 'Not generated')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="rl-action-cell">
                        <strong>
                          {record?.appliedAction || (experiment?.currentDecision && index === selectedIndex
                            ? interventionDraft.applied_crop
                              ? `${interventionDraft.applied_crop} · Pending user override`
                              : 'Pending · defaults to RL proposal'
                            : 'Not executed')}
                        </strong>
                        {record?.decisionSource && (
                          <span className="rl-source-badge">
                            {record.decisionSource === 'user_override' ? 'User Override' : record.decisionSource === 'rl_policy' ? 'RL Policy' : 'MILP Baseline'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="rl-outcome-cell">
                        {outcome ? `${num(outcome.expected_yield_t_ha, 2)} t/ha · ${num(outcome.production_tons, 1)} tons · ${num(outcome.water_use_mm, 0)} mm demand · Soil ${num(outcome.soil_health_delta)} · Reward ${num(outcome.reward, 2)}` : 'Not executed'}
                      </span>
                    </td>
                    <td>
                      {record?.stateAfter && record.stressIntervention
                        ? ((record.stressIntervention.water_reduction_pct || 0) === 0
                          && (record.stressIntervention?.temperature_delta_c || 0) === 0
                          && record.stressIntervention?.available_water_override_mm == null
                          && record.stressIntervention?.temperature_override_c == null
                          ? 'None'
                          : `Water -${Math.round((record.stressIntervention.water_reduction_pct || 0) * 100)}% · Temp +${record.stressIntervention.temperature_delta_c || 0}°C${record.stressIntervention.available_water_override_mm != null ? ` · Water set ${record.stressIntervention.available_water_override_mm} mm` : ''}${record.stressIntervention.temperature_override_c != null ? ` · Temp set ${record.stressIntervention.temperature_override_c}°C` : ''}`)
                        : record?.status === 'awaiting_intervention' ? 'Awaiting user choice' : record?.stressIntervention ? 'None' : 'Not generated'}
                    </td>
                    <td>
                      <span className="rl-state-text">
                        {record?.stateAfter
                          ? `Water ${num(record.stateAfter.available_water_mm)} mm · Temp ${num(record.stateAfter.temperature_c)}°C · Soil ${num(record.stateAfter.soil_health_score)}`
                          : record?.stateAfterCrop
                            ? `Post-crop, before intervention: Water ${num(record.stateAfterCrop.available_water_mm)} mm · Temp ${num(record.stateAfterCrop.temperature_c)}°C · Soil ${num(record.stateAfterCrop.soil_health_score)}`
                            : 'Not generated'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${record?.status === 'completed' ? 'completed' : record?.status === 'awaiting_intervention' ? 'warning' : (typeof currentStatus === 'string' && currentStatus.includes('Ready')) ? 'active' : (typeof currentStatus === 'string' && currentStatus.includes('Error')) ? 'error' : (typeof currentStatus === 'string' && currentStatus.includes('stopped')) ? 'stopped' : 'pending'}`}>
                        {record?.status === 'completed' ? 'Completed' : record?.status === 'awaiting_intervention' ? 'Awaiting Post-Season Intervention' : currentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {experiment?.phase === 'awaiting_season_execution' && (
          <div className="rl-decision-panel">
            <div className="rl-decision-title">Decision for {currentSeasonId}</div>
            <div className="rl-decision-body">
              Highest-ranked policy proposal: <strong className="rl-decision-highlight">{experiment.currentDecision?.rl_proposed_action}</strong>
            </div>
            {(() => {
              const proposal = feasibilityFor(experiment.currentDecision?.candidate_actions, experiment.currentDecision?.rl_proposed_action);
              return proposal && !proposal.is_feasible ? (
                <div role="status" className="rl-alert-warning" style={{ marginTop: 8 }}>
                  Policy proposal is infeasible under the current simulated constraints. Available water: {num(stateForNextAction.available_water_mm)} mm; estimated demand: {num(proposal.water_requirement_mm, 0)} mm. The experimental policy ranking is shown separately from candidate feasibility.
                </div>
              ) : null;
            })()}
            <label className="rl-override-select" style={{ display: 'block' }}>
              <span className="rl-field-label">Manual Crop Override for This Season</span>
              <select
                value={interventionDraft.applied_crop}
                onChange={event => {
                  const value = readInputValue(event);
                  if (value === '' || ACTIONS.includes(value)) {
                    setInterventionDraft(previous => ({ ...previous, applied_crop: value }));
                  }
                }}
                className="rl-field-select"
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="">Autonomous RL Action</option>
                {ACTIONS.map(crop => {
                  const candidate = feasibilityFor(experiment.currentDecision?.candidate_actions, crop);
                  return <option key={crop} value={crop}>Force {crop}{candidate && !candidate.is_feasible ? ' — infeasible (counterfactual)' : ''}</option>;
                })}
              </select>
            </label>
            {interventionDraft.applied_crop && (() => {
              const overrideCandidate = feasibilityFor(experiment.currentDecision?.candidate_actions, interventionDraft.applied_crop);
              return overrideCandidate && !overrideCandidate.is_feasible ? (
                <div role="status" className="rl-alert-warning" style={{ marginTop: 8 }}>
                  Override feasibility: Infeasible under current simulated water availability. Available water: {num(stateForNextAction.available_water_mm)} mm; estimated water demand: {num(overrideCandidate.water_requirement_mm, 0)} mm. It can still be executed as a counterfactual user override; feasibility will remain “No”.
                </div>
              ) : null;
            })()}
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
              A manual crop selection changes the applied action only. Overrides are allowed for counterfactual simulation even when the candidate is infeasible; this is not an agronomic recommendation.
            </div>
            <button type="button" className="btn-run-season" onClick={executeSeason} disabled={experiment.status === 'loading'}>
              {experiment.status === 'loading' ? 'Executing simulation…' : `Run ${currentSeasonId}`}
            </button>
          </div>
        )}

        {(experiment?.phase === 'awaiting_intervention' || experiment?.phase === 'awaiting_final_intervention') && (
          <div className="rl-intervention-panel">
            <div className="rl-intervention-title">State Change / Optional Intervention</div>
            <div className="rl-intervention-text">
              Season {experiment.seasons.length} outcome is recorded. This intervention modifies the simulated state after the completed season and before the next RL decision. For S1, the resulting state becomes S2's starting state. Continue without intervention to use the naturally updated post-season state.
            </div>
            <div className="rl-intervention-grid">
              <label className="rl-field-group">
                <span className="rl-field-label">Water Stress</span>
                <select
                  value={interventionDraft.water_reduction_pct}
                  onChange={event => {
                    const value = Number(readInputValue(event));
                    if ([0, 0.2, 0.4, 0.6].includes(value)) {
                      setInterventionDraft(previous => ({ ...previous, water_reduction_pct: value }));
                    }
                  }}
                  className="rl-field-select"
                >
                  <option value={0}>No Change</option><option value={0.2}>-20%</option><option value={0.4}>-40%</option><option value={0.6}>-60%</option>
                </select>
              </label>
              <label className="rl-field-group">
                <span className="rl-field-label">Temperature Change</span>
                <select
                  value={interventionDraft.temperature_delta_c}
                  onChange={event => {
                    const value = Number(readInputValue(event));
                    if ([0, 1, 3, 5].includes(value)) {
                      setInterventionDraft(previous => ({ ...previous, temperature_delta_c: value }));
                    }
                  }}
                  className="rl-field-select"
                >
                  <option value={0}>No Change</option><option value={1}>+1°C</option><option value={3}>+3°C</option><option value={5}>+5°C</option>
                </select>
              </label>
              <label className="rl-field-group">
                <span className="rl-field-label">Optional Water Budget Override (mm)</span>
                <input
                  type="number"
                  min="0"
                  value={interventionDraft.available_water_override_mm}
                  onChange={event => {
                    const value = normalizeNumberInput(readInputValue(event));
                    setInterventionDraft(previous => ({ ...previous, available_water_override_mm: value }));
                  }}
                  className="rl-field-input"
                />
              </label>
              <label className="rl-field-group">
                <span className="rl-field-label">Optional Temperature Override (°C)</span>
                <input
                  type="number"
                  min="-10"
                  max="60"
                  value={interventionDraft.temperature_override_c}
                  onChange={event => {
                    const value = normalizeNumberInput(readInputValue(event));
                    setInterventionDraft(previous => ({ ...previous, temperature_override_c: value }));
                  }}
                  className="rl-field-input"
                />
              </label>
            </div>
            <div className="rl-intervention-actions">
              <button type="button" className="btn-apply-intervention" onClick={() => applyIntervention()} disabled={experiment.status === 'loading'}>
                {experiment.status === 'loading' ? 'Applying state update…' : 'Apply Intervention & Continue'}
              </button>
              <button
                type="button"
                className="btn-continue-intervention"
                onClick={() => applyIntervention({
                  water_reduction_pct: 0,
                  temperature_delta_c: 0,
                  available_water_override_mm: '',
                  temperature_override_c: ''
                })}
                disabled={experiment.status === 'loading'}
              >
                Continue Without Intervention
              </button>
            </div>
          </div>
        )}

        {experiment?.phase === 'awaiting_baseline_execution' && (
          <div className="rl-baseline-panel">
            <strong>S1 · MILP Baseline: {fmtCrop(currentReference)}</strong>
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
              The selected MILP trajectory supplies the applied S1 crop. There is no RL proposal for this baseline season.
            </div>
            <button type="button" className="btn-primary-sm btn-run-baseline" onClick={executeBaselineSeason} disabled={experiment.status === 'loading'}>
              {experiment.status === 'loading' ? 'Running S1 baseline simulation…' : 'Run S1 MILP Baseline'}
            </button>
          </div>
        )}

        {experiment?.phase === 'awaiting_rl_action' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn-primary-sm" onClick={runAdaptation} disabled={experiment.status === 'loading'}>
              {experiment.status === 'loading' ? 'Evaluating current state…' : `Generate RL Adaptive Decision for Season ${selectedIndex + 1}`}
            </button>
            {completedSeasonCount > 0 && (
              <button type="button" className="btn-secondary-sm" onClick={stopExperiment}>
                Stop Experiment After Season {completedSeasonCount}
              </button>
            )}
          </div>
        )}
        {experiment?.phase === 'stopped' && (
          <div role="status" className="rl-stopped-panel">
            <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
              Experiment stopped by user · {completedSeasonCount} / {experiment.plannedSeasonCount} selected seasons completed. Remaining seasons are not generated.
            </div>
            <button type="button" className="btn-primary-sm" onClick={resumeExperiment}>Resume Experiment</button>
          </div>
        )}
        {experiment?.phase === 'horizon_reached' && (
          <div className="rl-horizon-panel">
            <div style={{ fontSize: 12, marginBottom: 8, color: '#334155' }}>
              {experiment.seasons.length} season{experiment.seasons.length === 1 ? '' : 's'} completed. Stop here or add consecutive seasons; each new RL decision from S2 onward will use the latest state and completed history.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                <span>Extend through</span>
                <select
                  value={Math.max(requestedSeasonCount, experiment.seasons.length + 1)}
                  onChange={event => {
                    const value = Number(readInputValue(event));
                    if (Number.isInteger(value) && value >= experiment.seasons.length + 1 && value <= SEASONS.length) {
                      setRequestedSeasonCount(value);
                    }
                  }}
                  className="rl-horizon-select"
                >
                  {SEASONS.slice(experiment.seasons.length).map((_, offset) => {
                    const count = experiment.seasons.length + offset + 1;
                    return <option key={count} value={count}>Season {count}</option>;
                  })}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary-sm btn-extend-horizon"
                onClick={extendSeasonHorizon}
                disabled={Number(requestedSeasonCount) <= experiment.seasons.length}
              >
                Add Seasons &amp; Continue
              </button>
            </div>
          </div>
        )}
      </section>

      {(experiment?.seasons.length > 0 || experiment?.currentDecision) && (
        <section className="dash-card rl-inspector-panel">
          <h4 className="rl-section-title">Selected Season Inspector</h4>
          {selectedRecord ? (
            <>
              {selectedRecord.decisionSource === 'user_override' && (
                <div role="status" className="rl-alert-warning" style={{ marginBottom: 12 }}>
                  Counterfactual / user override: the applied action was executed for simulation even if it fails the current candidate-feasibility check. This is not a recommended agronomic action.
                </div>
              )}
              <div className="rl-inspector-grid">
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">State Before</span>
                  <div className="rl-inspector-value">
                    Soil {num(selectedRecord.stateBefore.soil_health_score)} · Temp {num(selectedRecord.stateBefore.temperature_c)}°C · Water {num(selectedRecord.stateBefore.available_water_mm)} mm
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    Prior crop: {selectedRecord.stateBefore.previous_crop || 'Not Available'} · Moisture {num(selectedRecord.stateBefore.soil_moisture, 3)}
                  </div>
                  <span className="rl-inspector-meta">
                    Available-water source: {selectedRecord.stateBefore.available_water_source || 'unavailable'}; temperature source: {selectedRecord.stateBefore.temperature_source || 'unavailable'}
                  </span>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Season Type &amp; Reference</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.decisionSource === 'milp_baseline' ? 'MILP Baseline' : 'RL Adaptive'}
                  </div>
                  <span className="rl-inspector-meta">MILP Reference: {fmtCrop(selectedRecord.milpReferenceCrop)}</span>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">RL Proposal</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.decisionSource === 'milp_baseline' ? 'Not Applicable — baseline season' : `Proposed: ${selectedRecord.rlProposedAction}`}
                  </div>
                  <span className="rl-inspector-meta">
                    {selectedRecord.decisionSource === 'milp_baseline' ? 'S1 is the selected MILP action, not an RL decision.' : 'Highest-ranked action from the experimental policy; not necessarily feasible.'}
                  </span>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Applied Action &amp; Source</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.appliedAction || (interventionDraft.applied_crop ? `${interventionDraft.applied_crop} (pending user override)` : 'Awaiting season execution')}
                  </div>
                  <span className="rl-inspector-meta">
                    Decision Source: {selectedRecord.decisionSource === 'milp_baseline' ? 'MILP Baseline' : selectedRecord.decisionSource === 'user_override' ? 'User Override' : selectedRecord.decisionSource === 'rl_policy' ? 'RL Policy' : 'Decision source pending'}
                  </span>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Applied Action Feasibility</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.decisionSource === 'milp_baseline'
                      ? 'Not evaluated as an RL candidate; S1 applies the selected MILP baseline crop.'
                      : selectedAppliedCandidate
                      ? <>{selectedAppliedCandidate.is_feasible ? 'Feasible under current simulated constraints' : 'Infeasible under current simulated constraints'}<br /><span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>Available water: {num(selectedRecord.stateBefore.available_water_mm)} mm · Estimated demand: {num(selectedAppliedCandidate.water_requirement_mm, 0)} mm</span></>
                      : selectedRecord.appliedAction ? 'Candidate feasibility unavailable.' : 'Not applied yet.'}
                  </div>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Policy Proposal Feasibility</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.decisionSource === 'milp_baseline'
                      ? 'Not Applicable — S1 has no RL proposal.'
                      : selectedProposalCandidate
                      ? <>{selectedProposalCandidate.is_feasible ? 'Feasible under current simulated constraints' : 'Not feasible under current simulated constraints'}<br /><span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>Available water: {num(selectedRecord.stateBefore.available_water_mm)} mm · Estimated demand: {num(selectedProposalCandidate.water_requirement_mm, 0)} mm</span></>
                      : 'Candidate feasibility unavailable.'}
                  </div>
                </div>
                <div className="rl-inspector-tile" style={{ gridColumn: 'span 2' }}>
                  <span className="rl-inspector-label">Policy Ranking Rationale</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.decisionSource === 'milp_baseline'
                      ? 'S1 action is taken directly from the selected MILP reference trajectory.'
                      : selectedRecord.decisionReason
                      ? `The backend state-conditioned policy ranked this action first. Reward components: profit ${num(selectedRecord.decisionReason.reward_components?.profit_component, 2)}, water ${num(selectedRecord.decisionReason.reward_components?.water_component, 2)}, soil ${num(selectedRecord.decisionReason.reward_components?.soil_component, 2)}, penalties ${num(selectedRecord.decisionReason.reward_components?.penalty, 2)}.`
                      : 'Backend decision rationale unavailable.'}
                  </div>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Season Outcome</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.outcome
                      ? <>{num(selectedRecord.outcome.expected_yield_t_ha, 2)} t/ha · {num(selectedRecord.outcome.production_tons, 1)} tons<br /><span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>Water {num(selectedRecord.outcome.water_use_mm, 0)} mm · Soil {num(selectedRecord.outcome.soil_health_delta)} · Reward {num(selectedRecord.outcome.reward, 2)}</span></>
                      : 'Not executed yet.'}
                  </div>
                </div>
                <div className="rl-inspector-tile">
                  <span className="rl-inspector-label">Intervention</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.stressIntervention
                      ? selectedRecord.stressIntervention.water_reduction_pct === 0
                        && selectedRecord.stressIntervention.temperature_delta_c === 0
                        && selectedRecord.stressIntervention.available_water_override_mm == null
                        && selectedRecord.stressIntervention.temperature_override_c == null
                        ? 'None — normal conditions'
                        : <>Water -{Math.round((selectedRecord.stressIntervention.water_reduction_pct || 0) * 100)}% · Temperature +{selectedRecord.stressIntervention.temperature_delta_c || 0}°C<br /><span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>Water override: {num(selectedRecord.stressIntervention.available_water_override_mm)} · Temp override: {num(selectedRecord.stressIntervention.temperature_override_c)}</span></>
                      : selectedRecord.outcome ? 'Pending optional post-season intervention.' : 'Unavailable until season execution.'}
                  </div>
                  <span className="rl-inspector-meta">Crop override: {selectedRecord.decisionSource === 'user_override' ? selectedRecord.appliedAction : interventionDraft.applied_crop || 'None'}</span>
                </div>
                <div className="rl-inspector-tile" style={{ gridColumn: 'span 2' }}>
                  <span className="rl-inspector-label">{selectedRecord.stateAfter ? 'State After Intervention' : 'Post-Crop State (before intervention)'}</span>
                  <div className="rl-inspector-value">
                    {selectedRecord.stateAfter || selectedRecord.stateAfterCrop ? (
                      <>
                        <div>{selectedRecord.stateAfter ? 'Simulation-derived state transition' : 'Post-crop simulation state'}</div>
                        <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                          Water {num((selectedRecord.stateAfter || selectedRecord.stateAfterCrop).available_water_mm)} mm · Temp {num((selectedRecord.stateAfter || selectedRecord.stateAfterCrop).temperature_c)}°C · Soil {num((selectedRecord.stateAfter || selectedRecord.stateAfterCrop).soil_health_score)}
                        </div>
                        <div className="rl-inspector-meta" style={{ marginTop: 4 }}>
                          Provenance: Water {(selectedRecord.stateAfter || selectedRecord.stateAfterCrop).available_water_source || 'unavailable'}; Temp {(selectedRecord.stateAfter || selectedRecord.stateAfterCrop).temperature_source || 'unavailable'}; Soil {(selectedRecord.stateAfter || selectedRecord.stateAfterCrop).soil_health_score_source || 'unavailable'} · Prior crop: {(selectedRecord.stateAfter || selectedRecord.stateAfterCrop).previous_crop || 'Not Available'}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                          Soil-health transition: {num(selectedRecord.stateBefore.soil_health_score)} → {num((selectedRecord.stateAfter || selectedRecord.stateAfterCrop).soil_health_score)} (simulation value, not measured observation).
                        </div>
                      </>
                    ) : 'Unavailable until season execution.'}
                  </div>
                </div>
              </div>
              {selectedRecord.decisionSource !== 'milp_baseline' && (
                <button type="button" className="btn-secondary-sm rl-toggle-scores-btn" onClick={() => setScoresExpanded(value => !value)}>
                  {scoresExpanded ? 'Hide' : 'Inspect'} Candidate Action Scores
                </button>
              )}
              {scoresExpanded && selectedRecord.decisionSource !== 'milp_baseline' && (
                <div className="rl-scores-table-wrap">
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                    Policy score: <strong>{num(selectedRecord.rlPolicyScore, 2)}</strong> · Runner-up: <strong>{selectedRecord.decisionReason?.runner_up_action || 'Not Available'} ({num(selectedRecord.decisionReason?.runner_up_score, 2)})</strong> · Margin: <strong>{num(selectedRecord.decisionReason?.score_margin, 2)}</strong>
                  </div>
                  <table className="strategy-table-enhanced rl-scores-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Policy Score / Ranking</th>
                        <th>Feasible</th>
                        <th>Estimated Water Demand</th>
                        <th>Synthetic Yield Estimate</th>
                        <th>Simulated Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRecord.candidateActions || []).map(action => (
                        <tr key={action.crop} className={action.crop === selectedRecord.rlProposedAction ? 'rl-scores-policy-row' : ''}>
                          <td><strong>{action.crop}</strong>{action.crop === selectedRecord.rlProposedAction ? ' · Policy proposal' : ''}{action.crop === selectedRecord.appliedAction && selectedRecord.decisionSource === 'user_override' ? ' · Applied override' : ''}</td>
                          <td>{num(action.q_value, 2)}</td>
                          <td>
                            <span className={`feasible-badge ${action.is_feasible ? 'yes' : 'no'}`}>
                              {action.is_feasible ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>{num(action.water_requirement_mm, 0)} mm</td>
                          <td>{num(action.expected_yield_t_ha, 2)} t/ha</td>
                          <td>{num(action.immediate_reward, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 11 }}>
                Yield and margin are synthetic crop-knowledge estimates, not measured outcomes. Decision evidence: backend state-conditioned action ranking.
              </p>
            </>
          ) : <div style={{ fontSize: 12, color: '#64748b' }}>Select a completed season from the table above to inspect its state transition.</div>}
        </section>
      )}

      {experiment?.seasons.length > 0 && (
        <section className="dash-card rl-summary-card">
          <h4 className="rl-section-title">MILP Baseline &amp; Adaptive Policy Summary · Horizon: {experiment.plannedSeasonCount} {experiment.plannedSeasonCount === 1 ? 'season' : 'seasons'}</h4>
          <div className="rl-summary-flow">
            <div><strong>MILP baseline trajectory:</strong> {initialRotation.map((crop, index) => `S${index + 1} ${crop}`).join(' → ') || 'Not Available'}</div>
            <div><strong>RL adaptive proposals (S2–S6):</strong> {proposedRotation.join(' → ') || 'No RL decisions generated'}{experiment.currentDecision ? ' · current proposal not yet executed' : ''}</div>
            <div><strong>Applied trajectory (S1 MILP, S2 onward adaptive):</strong> {appliedRotation.join(' → ') || 'No season executed'}{completedSeasonCount < experiment.plannedSeasonCount ? ' · remaining seasons not generated' : ''}</div>
            <div><strong>User overrides:</strong> {overrideCount}</div>
          </div>
          {experiment.phase === 'horizon_reached' && (
            <div role="status" style={{ color: '#1e3a8a', fontSize: 11.5, marginTop: 5, fontWeight: 600 }}>
              Season {experiment.seasons.length} completed — experiment paused at the selected horizon. Extend to Season {experiment.seasons.length + 1}–6 to continue; remaining actions and outcomes have not been generated.
            </div>
          )}
          {experiment.phase === 'completed' && completedSeasonCount === 6 && (
            <div role="status" style={{ color: '#166534', fontSize: 11.5, marginTop: 5, fontWeight: 700 }}>Full six-season trajectory completed.</div>
          )}
          {experiment.seasons.some(season => season.status === 'awaiting_intervention') && (
            <div role="status" className="rl-alert-warning" style={{ marginTop: 8 }}>
              A season outcome is recorded, but its next state is not complete until you apply an intervention or continue without one.
            </div>
          )}
          <div className="rl-summary-grid">
            <div className="rl-summary-tile">
              <span className="rl-context-label">Seasons changed from MILP</span>
              <strong className="rl-context-value">{changedFromMilp}</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">User overrides</span>
              <strong className="rl-context-value">{overrideCount}</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">Stress / intervention events</span>
              <strong className="rl-context-value">{stressCount}</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">Completed production</span>
              <strong className="rl-context-value">{num(totalProduction)} tons</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">Total water demand</span>
              <strong className="rl-context-value">{num(totalWater, 0)} mm</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">Cumulative reward</span>
              <strong className="rl-context-value">{num(totalReward, 2)}</strong>
            </div>
            <div className="rl-summary-tile">
              <span className="rl-context-label">{experiment.phase === 'completed' ? 'Final' : 'Current'} soil-health proxy</span>
              <strong className="rl-context-value">{num(latestRlState?.soil_health_score)} / 100</strong>
            </div>
          </div>
        </section>
      )}

      <section className="dash-card rl-comparison-matrix-card">
        <h4 className="rl-section-title">Selected MILP Baseline vs RL Adaptive Policy</h4>
        <div className="rl-table-caption">
          The initial MILP reference uses only the currently selected strategy: <strong>{selectedStrategy.name}</strong>.
          {experiment?.phase === 'completed' && completedSeasonCount === 6
            ? ' The executed trajectory contains S1 MILP baseline followed by S2–S6 RL adaptive decisions.'
            : ' RL values summarize only outcomes actually executed so far; no future actions or outcomes are forecast here.'}
        </div>
        {!experiment?.seasons.length ? (
          <div role="status" style={{ marginBottom: 10, color: '#64748b', fontSize: 12 }}>
            RL adaptive comparison unavailable — no S2-onward decisions have been generated. S1 is the selected MILP baseline, not an RL decision.
          </div>
        ) : experiment.seasons.some(season => season.status === 'awaiting_intervention') ? (
          <div role="status" className="rl-alert-warning" style={{ marginBottom: 10 }}>
            The latest season outcome is recorded; finish its post-season state update before generating the next RL decision.
          </div>
        ) : (
          <div role="status" style={{ marginBottom: 10, color: '#475569', fontSize: 12, fontWeight: 600 }}>
            Mixed-trajectory progress: {completedSeasonCount} / {experiment.plannedSeasonCount} selected seasons completed (S1 MILP baseline; S2 onward RL adaptive)
            {completedSeasonCount < 6 && ' · partial experiment; this is not a completed six-season comparison.'}
          </div>
        )}
        <div className="table-scroll-container">
          <table className="strategy-table-enhanced rl-comparison-matrix">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="rl-matrix-col-milp">Selected MILP Baseline · {selectedStrategy.name}</th>
                <th className="rl-matrix-col-rl">Executed Trajectory · S1 MILP + S2 onward RL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Rotation / actions</strong></td>
                <td>{initialRotation.map((crop, index) => `S${index + 1} ${crop}`).join(' → ') || 'Not Available'}</td>
                <td>{appliedRotation.map((crop, index) => `S${index + 1} ${crop}`).join(' → ') || 'Not executed'}</td>
              </tr>
              <tr>
                <td><strong>MILP optimizer-side rotation yield</strong></td>
                <td><strong>{num(selectedBaselineProduction)} tons</strong></td>
                <td>{experiment?.seasons.length ? <strong>{num(totalProduction)} tons across executed seasons</strong> : 'Not executed'}</td>
              </tr>
              <tr>
                <td><strong>Synthetic ML estimate for this rotation</strong></td>
                <td>{matchingSyntheticMlProduction == null ? 'Not available for this exact rotation/context' : `${num(matchingSyntheticMlProduction, 1)} tons`}</td>
                <td>Separate crop- and season-conditioned ML estimate; not an MILP output</td>
              </tr>
              <tr>
                <td><strong>Water demand</strong></td>
                <td><strong>{num(selectedBaselineWater, 0)} mm</strong></td>
                <td>{experiment?.seasons.length ? <strong>{num(totalWater, 0)} mm across executed seasons</strong> : 'Not executed'}</td>
              </tr>
              <tr>
                <td><strong>Soil metric</strong></td>
                <td>{selectedBaselineSoilScore == null ? 'Not Available' : `${num(selectedBaselineSoilScore, 2)} / 6.0 comparative score`}</td>
                <td>{experiment?.seasons.length ? `${num(latestRlState?.soil_health_score)} / 100 simulation proxy` : 'Not executed'}</td>
              </tr>
              <tr>
                <td><strong>Objective / reward</strong></td>
                <td><strong>{num(activeMilpResult?.composite_score, 3)}</strong> comparative MILP score</td>
                <td>{experiment?.seasons.length ? <strong>{num(totalReward, 2)}</strong> : 'Not executed'}{experiment?.seasons.length ? ' cumulative simulated reward' : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, color: '#64748b', fontSize: 11, lineHeight: 1.45 }}>
          The MILP optimizer-side rotation yield is calculated from its dynamic agronomic crop-season inputs. Synthetic ML production is an independent sum of six crop- and season-conditioned model predictions; it is not the MILP total and may differ even for the same rotation. Both are estimates, not measured harvests. MILP reports a comparative optimization score on the displayed 0–6 scale. RL reports a separate 0–100 simulation proxy plus accumulated simulated reward. These metrics are not directly comparable; the MILP does not return a final physical soil-health state.
        </div>
      </section>

      <section className="dash-card rl-reopt-card">
        <h4 className="rl-reopt-header">Final PuLP/CBC Re-Optimization</h4>
        <p className="rl-reopt-text">
          The completed mixed trajectory (S1 MILP baseline, then S2–S6 RL adaptive) and supported final environmental inputs are passed to the constrained MILP solver. The current optimizer consumes temperature, available water, pH, and previous crop; the RL soil-health proxy is reported but is not an optimizer constraint.
        </p>
        {experiment?.phase === 'completed' && experiment.finalState ? (
          <>
            <div style={{ fontSize: 12, marginBottom: 8, color: 'var(--primary)', fontWeight: 600 }}>
              Six-season MILP-baseline / RL-adaptive trajectory complete. Final state is available for downstream PuLP/CBC re-optimization.
            </div>
            <button type="button" className="btn-reoptimize" onClick={reoptimize} disabled={reoptimization.status === 'loading' || integrityErrors.length > 0}>
              {reoptimization.status === 'loading' ? 'Re-optimizing…' : 'Re-Optimize with PuLP/CBC'}
            </button>
          </>
        ) : (
          <div role="status" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {experiment?.seasons.length
              ? `Partial experiment. Full-trajectory PuLP/CBC re-optimization is unavailable until the six-season trajectory is complete (${completedSeasonCount} / 6 seasons completed).`
              : 'Full-trajectory PuLP/CBC re-optimization is unavailable until all six seasons are completed and the final state is produced.'}
          </div>
        )}
        {reoptimization.error && <div role="alert" className="rl-alert-error" style={{ marginTop: 10 }}>Re-optimization failed: {reoptimization.error}</div>}
        {reoptimization.result && (() => {
          const summary = reoptimization.result.summary;
          const plan = summary.planning?.selected_strategy_result || {};
          const rotation = plan.selected_crop_by_period || plan.rotation || {};
          const rotated = Object.values(rotation);
          return (
            <div className="rl-reopt-results-grid">
              <div><strong>Solver status:</strong> {plan.solver_status || plan.status || 'Not Available'} · <strong>Weights:</strong> {selectedStrategy.name} ({Math.round(selectedStrategy.weights.profit * 100)}% Profit / {Math.round(selectedStrategy.weights.water * 100)}% Water / {Math.round(selectedStrategy.weights.soil * 100)}% Soil)</div>
              <div><strong>Initial MILP:</strong> {initialRotation.join(' → ') || 'Not Available'}</div>
              <div><strong>Completed applied trajectory:</strong> {appliedRotation.join(' → ')}</div>
              <div><strong>Final rotation:</strong> {rotated.join(' → ') || 'No feasible rotation returned'}</div>
              <div><strong>Constraint feasibility:</strong> {plan.constraint_summary ? JSON.stringify(plan.constraint_summary) : 'Not Available'}</div>
              <div><strong>Initial plan differences:</strong> {rotated.length ? rotated.filter((crop, index) => initialRotation[index] && crop !== initialRotation[index]).length : 'Not Available'} seasons changed</div>
            </div>
          );
        })()}
      </section>

      <section className="dash-card rl-provenance-card">
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>Provenance &amp; Scientific Safety</div>
        <div className="rl-provenance-text">
          Field source: {syntheticBenchmark ? 'synthetic benchmark scenario' : activeField?.id === 'demo' ? 'offline research demo' : activeField ? 'PostgreSQL registered field' : 'Not Available'} · Environmental source: {sourceText} · ML: synthetic crop-knowledge estimates · RL: simulation-trained · MILP: PuLP/CBC · Scenario: synthetic/hypothetical · Validation: not field validated.
        </div>
        <div className="rl-provenance-weights">
          <strong>RL strategy weights:</strong> {selectedStrategy.name} · {Math.round(selectedStrategy.weights.profit * 100)}% Profit / {Math.round(selectedStrategy.weights.water * 100)}% Water / {Math.round(selectedStrategy.weights.soil * 100)}% Soil.
        </div>
      </section>
    </div>
  );

}
