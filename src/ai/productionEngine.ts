// ============================================================
// AI Exchange · ② Production Engine（生产引擎）
// AI Worker + Skill + Compute + Time → Production
// 每个 tick 让资本雇佣的 AI Worker（按持仓企业派生）调用 Skill、
// 消耗 Compute、随时间累积产出，并产生「算力成本 + 工资」两类支出。
// 产出总量决定需求订单的履约能力，成本/工资流入经济账本。
// 纯前端模拟：生产速率与「AI 劳动力产出」同源，保证账本能对齐审计。
// ============================================================
import type {
  Asset,
  CapitalOsState,
  ProductionEngineState,
  AiWorkerUnit,
} from '../types'
import { clamp, mulberry32, round2, timeStr } from '../utils/format'

/** 板块 → Worker 技能与算力配置 */
const SECTOR_WORKER: Record<string, { skill: string; compute: string; role: string }> = {
  model: { skill: '模型推理', compute: 'H100 · 80GB', role: '模型 Agent' },
  agent: { skill: '自主任务执行', compute: '8 vCPU · 16GB', role: '执行 Agent' },
  skill: { skill: '技能调用', compute: '4 vCPU · 8GB', role: '技能 Agent' },
  mcp: { skill: '工具编排', compute: '8 vCPU · 16GB', role: '工具 Agent' },
  app: { skill: '应用交付', compute: '16 vCPU · 32GB', role: '应用 Agent' },
  robot: { skill: '物理执行', compute: 'Edge GPU', role: '机器人 Agent' },
  data: { skill: '数据管道', compute: '32 vCPU · 64GB', role: '数据 Agent' },
  infra: { skill: '算力调度', compute: 'A100 集群', role: '算力 Agent' },
  protocol: { skill: '协议交互', compute: '8 vCPU · 16GB', role: '协议 Agent' },
}

/** 初始化生产引擎（为空，闭环启动时按持仓企业派生 Worker） */
export function initProductionEngine(): ProductionEngineState {
  return {
    active: false,
    workers: [],
    totalOutput: 0,
    totalComputeCost: 0,
    totalWage: 0,
    runs: [],
  }
}

/** 从资本持仓的 AI 企业派生 Worker 池（每家企业 1 个 Worker，按配置占比可扩展） */
export function buildWorkers(cap: CapitalOsState, assets: Asset[]): AiWorkerUnit[] {
  const rand = mulberry32(cap.planId.length * 7919 + cap.targets.length * 104729)
  const bySymbol = new Map(assets.map((a) => [a.symbol, a]))
  const workers: AiWorkerUnit[] = []
  for (const t of cap.targets) {
    const asset = bySymbol.get(t.symbol)
    if (!asset) continue
    const cfg = SECTOR_WORKER[asset.sectorId] ?? { skill: '通用任务执行', compute: '8 vCPU · 16GB', role: '通用 Agent' }
    const efficiency = round2(0.6 + rand() * 0.9) // 0.6 - 1.5
    // 工资率与「已部署资本 × 配置占比」成正比，量级与收入对齐
    const wageRate = round2((cap.invested * (t.pct / 100) * 1.8e-9) / Math.max(1, cap.targets.length))
    workers.push({
      id: `wk-${t.symbol}`,
      symbol: t.symbol,
      name: `${cfg.role} · ${asset.name}`,
      skill: cfg.skill,
      compute: cfg.compute,
      efficiency,
      wageRate,
      output: 0,
      cost: 0,
      status: 'working',
    })
  }
  return workers
}

export type ProductionTickCtx = {
  cap: CapitalOsState
  assets: Asset[]
  revenueTick: number // 本 tick 收入（用于对齐成本/工资比例）
  laborOutputTick: number // 本 tick 产出增量（任务量）
  dt: number // 秒
}

export type ProductionTickResult = {
  production: ProductionEngineState
  computeCost: number // 本 tick 算力成本
  wageCost: number // 本 tick 工资
}

/** 每 tick 运行一步生产引擎 */
export function runProductionTick(prod: ProductionEngineState, ctx: ProductionTickCtx): ProductionTickResult {
  const { cap, assets } = ctx
  const rand = mulberry32(Math.floor(Date.now() / 1000) % 1000000)

  // Worker 池随持仓企业变化同步（无则重建，有则保留累计值）
  let workers = prod.workers
  if (!cap.active) {
    workers = workers.map((w) => ({ ...w, status: 'idle' as const }))
    return { production: { ...prod, active: false, workers }, computeCost: 0, wageCost: 0 }
  }
  if (workers.length === 0 || workers.some((w) => !cap.targets.some((t) => t.symbol === w.symbol))) {
    const fresh = buildWorkers(cap, assets)
    // 保留已存在 Worker 的累计产出/成本，只新增缺失的
    const existing = new Map(workers.map((w) => [w.symbol, w]))
    workers = fresh.map((w) => existing.get(w.symbol) ?? w)
  }

  // ---- 生产：Worker × Skill × Compute × Time ----
  const revenue = Math.max(0, ctx.revenueTick)
  const outputPerWorker = ctx.laborOutputTick / Math.max(1, workers.length)
  const computeCost = round2(revenue * 0.4) // 算力成本 = 收入 40%
  const wageCost = round2(revenue * 0.3) // 工资 = 收入 30%
  const computePerWorker = computeCost / Math.max(1, workers.length)

  const nextWorkers = workers.map((w) => {
    const efficiency = w.efficiency * (0.98 + rand() * 0.04) // 效率缓慢漂移
    const out = outputPerWorker * efficiency
    return {
      ...w,
      efficiency: round2(clamp(efficiency, 0.5, 1.6)),
      output: round2(w.output + out),
      cost: round2(w.cost + computePerWorker),
      status: 'working' as const,
    }
  })

  // 生产完成记录（约每 3 tick 记录一条，控制列表长度）
  let runs = prod.runs
  if (Math.random() < 0.33 && workers.length > 0) {
    const w = nextWorkers[Math.floor(rand() * nextWorkers.length)]
    runs = [
      {
        id: `run-${Date.now()}-${Math.floor(rand() * 1e4)}`,
        workerId: w.id,
        orderId: '—',
        output: round2(Math.max(0.01, outputPerWorker * w.efficiency)),
        time: timeStr(),
      },
      ...runs,
    ].slice(0, 20)
  }

  const totalOutput = round2(prod.totalOutput + ctx.laborOutputTick)
  return {
    production: {
      ...prod,
      active: true,
      workers: nextWorkers,
      totalOutput,
      totalComputeCost: round2(prod.totalComputeCost + computeCost),
      totalWage: round2(prod.totalWage + wageCost),
      runs,
    },
    computeCost,
    wageCost,
  }
}
