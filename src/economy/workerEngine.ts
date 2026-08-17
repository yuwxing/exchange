// ============================================================
// AI Worker Engine — AI 劳动力市场
// dailyOutput = productivity * demandIndex
// ============================================================
import type { AIWorker } from './types'
import { clamp, round2, mulberry32 } from '../utils/format'

const WORKERS = [
  { id: 'w_code', name: 'Coding Agent', skill: '编程', level: 5, productivity: 95, salary: 2.0, hireCost: 20 },
  { id: 'w_research', name: 'Research Agent', skill: '研究', level: 4, productivity: 88, salary: 1.8, hireCost: 18 },
  { id: 'w_teacher', name: 'Teacher Agent', skill: '教育', level: 4, productivity: 80, salary: 1.5, hireCost: 15 },
  { id: 'w_designer', name: 'Designer Agent', skill: '设计', level: 4, productivity: 82, salary: 1.6, hireCost: 16 },
  { id: 'w_marketing', name: 'Marketing Agent', skill: '营销', level: 3, productivity: 75, salary: 1.3, hireCost: 13 },
  { id: 'w_finance', name: 'Finance Agent', skill: '金融', level: 5, productivity: 90, salary: 2.2, hireCost: 22 },
  { id: 'w_data', name: 'Data Agent', skill: '数据分析', level: 4, productivity: 85, salary: 1.7, hireCost: 17 },
  { id: 'w_support', name: 'Support Agent', skill: '客服', level: 3, productivity: 70, salary: 1.0, hireCost: 10 },
  { id: 'w_translate', name: 'Translate Agent', skill: '翻译', level: 4, productivity: 78, salary: 1.2, hireCost: 12 },
  { id: 'w_write', name: 'Writer Agent', skill: '写作', level: 4, productivity: 84, salary: 1.4, hireCost: 14 },
]

export function initWorkers(): AIWorker[] {
  const demandIndex = 1.0
  return WORKERS.map((w) => {
    const dailyOutput = round2((w.productivity * demandIndex) / 10)
    const roi = round2(((dailyOutput - w.salary) / w.hireCost) * 100)
    return {
      ...w,
      dailyOutput,
      salary: w.salary,
      owner: 'free',
      status: 'idle' as const,
      demandIndex,
      hireCost: w.hireCost,
      roi,
      history: Array.from({ length: 20 }, (_, i) => dailyOutput * (0.9 + Math.sin(i * 0.5) * 0.1)),
    }
  })
}

let wRng = mulberry32(987654)

export function tickWorkers(
  workers: AIWorker[],
  demandIndex: number,
  events: { impactTarget: string; magnitude: number }[],
): AIWorker[] {
  return workers.map((w) => {
    const r = wRng()
    let demand = clamp(demandIndex + (r - 0.5) * 0.1, 0.5, 2.0)

    for (const e of events) {
      if (e.impactTarget === 'worker') demand *= 1 + e.magnitude / 100
    }

    const prod = clamp(w.productivity + (r - 0.48) * 0.5, 50, 100)
    const dailyOutput = round2((prod * demand) / 10)
    const salary = round2(w.salary * (1 + (r - 0.5) * 0.02))
    const roi = round2(((dailyOutput - salary) / w.hireCost) * 100)

    return {
      ...w,
      productivity: round2(prod),
      demandIndex: round2(demand),
      dailyOutput,
      salary,
      roi,
      history: [...w.history.slice(-19), dailyOutput],
    }
  })
}

export function hireWorker(worker: AIWorker): AIWorker {
  return { ...worker, owner: 'user', status: 'working' }
}

export function fireWorker(worker: AIWorker): AIWorker {
  return { ...worker, owner: 'free', status: 'idle' }
}

export function trainWorker(worker: AIWorker): AIWorker {
  const newLevel = Math.min(10, worker.level + 1)
  const newProd = Math.min(100, worker.productivity + 5)
  const newSalary = round2(worker.salary * 1.1)
  return {
    ...worker,
    level: newLevel,
    productivity: newProd,
    salary: newSalary,
    dailyOutput: round2((newProd * worker.demandIndex) / 10),
    roi: round2(((newProd * worker.demandIndex) / 10 - newSalary) / worker.hireCost * 100),
    status: 'training',
  }
}
