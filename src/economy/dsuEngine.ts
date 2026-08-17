// ============================================================
// DSU Engine — AI 生产力计价单位
// 1 DSU = 1000 AI Compute Units
// AIProductionIndex = DeepSeek*0.5 + GPU*0.2 + Agent*0.2 + API*0.1
// ============================================================
import type { DSUState } from './types'
import { clamp, round2, mulberry32 } from '../utils/format'

export function initDSU(): DSUState {
  return {
    price: 1.0,
    aiProductionIndex: 128.42,
    prevIndex: 128.42,
    components: {
      deepSeek: 50,
      gpuCompute: 20,
      agentWork: 20,
      apiService: 10,
    },
    circulation: 8_420_000,
    reserve: 12_580_000,
    dailyConsumption: 284_000,
    dailyMint: 312_000,
    dailyBurn: 268_000,
    history: Array.from({ length: 40 }, (_, i) => 100 + i * 0.8 + Math.sin(i * 0.3) * 5),
  }
}

let dsuRng = mulberry32(424242)

export function tickDSU(state: DSUState, events: { impactTarget: string; magnitude: number }[]): DSUState {
  const r = dsuRng()
  // 基础漂移：均值回归到 128
  const drift = (128.42 - state.aiProductionIndex) * 0.02
  const noise = (r - 0.5) * 1.5
  let delta = drift + noise

  // 事件影响
  for (const e of events) {
    if (e.impactTarget === 'dsu') delta += e.magnitude
  }

  const newIndex = clamp(state.aiProductionIndex + delta, 80, 200)
  // 组件微调
  const compDrift = (delta / state.aiProductionIndex) * 100
  const components = {
    deepSeek: clamp(state.components.deepSeek + compDrift * 0.3 + (dsuRng() - 0.5) * 0.5, 30, 70),
    gpuCompute: clamp(state.components.gpuCompute + compDrift * 0.2 + (dsuRng() - 0.5) * 0.3, 10, 35),
    agentWork: clamp(state.components.agentWork + compDrift * 0.2 + (dsuRng() - 0.5) * 0.3, 10, 35),
    apiService: clamp(state.components.apiService + compDrift * 0.1 + (dsuRng() - 0.5) * 0.2, 5, 20),
  }

  const consumptionDelta = (r - 0.5) * 8000
  const mintDelta = consumptionDelta * 1.1
  const burnDelta = consumptionDelta * 0.94

  const history = [...state.history.slice(-39), newIndex]

  return {
    ...state,
    prevIndex: state.aiProductionIndex,
    aiProductionIndex: round2(newIndex),
    components,
    circulation: Math.round(state.circulation + mintDelta - burnDelta),
    dailyConsumption: Math.round(clamp(state.dailyConsumption + consumptionDelta, 100_000, 500_000)),
    dailyMint: Math.round(clamp(state.dailyMint + mintDelta, 120_000, 500_000)),
    dailyBurn: Math.round(clamp(state.dailyBurn + burnDelta, 100_000, 400_000)),
    history,
  }
}

export function mintDSU(state: DSUState, amount: number): DSUState {
  return {
    ...state,
    circulation: state.circulation + amount,
    reserve: state.reserve - amount,
    dailyMint: state.dailyMint + amount,
  }
}

export function burnDSU(state: DSUState, amount: number): DSUState {
  return {
    ...state,
    circulation: Math.max(0, state.circulation - amount),
    dailyBurn: state.dailyBurn + amount,
  }
}
