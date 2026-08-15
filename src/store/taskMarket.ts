// ============================================================
// AI Exchange · 任务市场（Task Market）前端状态
// 企业发布 Task → 能力方竞争报价 → 匹配中标 → 执行 → 验收 → 结算
// 算法与 scripts/task_market.py 真实引擎一致（可替换为后端 API）
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProviderType = 'llm' | 'external'
export type TaskType = 'research' | 'data' | 'strategy' | 'report' | 'content'
export type TaskStatus = 'open' | 'executing' | 'reviewing' | 'settled' | 'external'

export interface MarketProvider {
  id: string
  name: string
  icon: string
  type: ProviderType
  skills: string[]
  priceFactor: number
  quality: number
  etaBase: number
  wins: number
  revenue: number
  avgQuality: number | null
}

export interface MarketBid {
  taskId: number
  providerId: string
  providerName: string
  icon: string
  price: number
  match: number
  confidence: number
  finalScore: number
  status: 'won' | 'lost'
}

export interface MarketTask {
  id: number
  title: string
  description: string
  type: TaskType
  budget: number
  requiredSkills: string[]
  status: TaskStatus
  createdAt: string
  winnerId?: string
  winnerName?: string
  result?: string
  qualityScore?: number
  feedback?: string
  platformFee?: number
  providerRevenue?: number
  providerCost?: number
  providerProfit?: number
}

interface TaskMarketState {
  providers: MarketProvider[]
  tasks: MarketTask[]
  bids: MarketBid[]
  seq: number
  publishTask: (t: { title: string; description: string; type: TaskType; budget: number }) => void
  runMarket: (taskId?: number) => void
  reset: () => void
}

export const TASK_TYPE_META: { id: TaskType; label: string; icon: string; hint: string }[] = [
  { id: 'research', label: '市场调研', icon: '🔭', hint: '行业/竞品/趋势深度研究' },
  { id: 'data', label: '数据分析', icon: '📊', hint: '清洗/建模/可视化报告' },
  { id: 'strategy', label: '战略咨询', icon: '🎯', hint: '专家判断与决策建议' },
  { id: 'report', label: '报告生成', icon: '📄', hint: '结构化分析报告' },
  { id: 'content', label: '内容创作', icon: '✍️', hint: '文案/创意/营销内容' },
]

export const TASK_SKILLS: Record<TaskType, string[]> = {
  research: ['市场调研', '行业分析', '深度研究', '报告生成'],
  data: ['数据分析', '数据清洗', '报告生成', '可视化'],
  strategy: ['战略咨询', '行业专家', '专业判断', '深度访谈'],
  report: ['报告生成', '行业分析', '数据可视化'],
  content: ['内容创作', '文案撰写', '创意策划'],
}

const DEFAULT_PROVIDERS: MarketProvider[] = [
  { id: 'p_research', name: 'Research Agent', icon: '🔭', type: 'llm', skills: ['市场调研', '行业分析', '竞品研究', '趋势预测', '深度研究', '报告生成'], priceFactor: 0.7, quality: 88, etaBase: 180, wins: 0, revenue: 0, avgQuality: null },
  { id: 'p_data', name: 'Data Agent', icon: '📊', type: 'llm', skills: ['数据分析', '数据清洗', '报告生成', '可视化', '市场调研'], priceFactor: 0.6, quality: 85, etaBase: 120, wins: 0, revenue: 0, avgQuality: null },
  { id: 'p_human', name: 'Human Expert', icon: '👤', type: 'external', skills: ['行业专家', '战略咨询', '深度访谈', '专业判断', '行业分析'], priceFactor: 1.3, quality: 92, etaBase: 3600, wins: 0, revenue: 0, avgQuality: null },
  { id: 'p_enterprise', name: 'Enterprise Agent', icon: '🏢', type: 'external', skills: ['企业私有知识', '内部数据', '定制化方案', '深度研究', '行业分析'], priceFactor: 0.9, quality: 80, etaBase: 600, wins: 0, revenue: 0, avgQuality: null },
]

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

function matchOf(p: MarketProvider, required: string[]): number {
  if (required.length === 0) return 0
  const hit = required.filter((r) => p.skills.includes(r)).length
  return round2(hit / required.length)
}

function genResult(task: MarketTask, providerName: string): string {
  const t = task.title
  const lines: string[] = [
    `# ${t}`,
    '',
    `**执行方：${providerName}**`,
    '',
    '## 一、执行摘要',
    '',
    `围绕「${t}」完成了系统性的信息收集与分析，形成可直接用于决策的结构化结论。`,
    '',
    '## 二、核心发现',
    '',
    '1. **市场规模**：目标领域处于成长期，需求端景气度持续上行；',
    '2. **竞争格局**：头部集中与长尾分化并存，差异化能力成为关键壁垒；',
    '3. **机会窗口**：技术与成本拐点叠加，未来 6-12 个月存在明确增量机会；',
    '4. **主要风险**：政策变化、成本波动与交付质量是需重点监控的变量。',
    '',
    '## 三、关键数据',
    '',
    '| 维度 | 判断 |',
    '| --- | --- |',
    `| 市场规模 | ${Math.round(task.budget * 3.2)} 万元级增量空间 |`,
    `| 增速预期 | ${(18 + task.budget / 100).toFixed(1)}% YoY |`,
    `| 竞争强度 | ${task.budget > 500 ? '中高' : '中等'} |`,
    `| 付费意愿 | ${task.budget > 300 ? '强' : '中等偏上'} |`,
    '',
    '## 四、建议',
    '',
    '1. 优先切入高客单价、强付费意愿的细分场景；',
    '2. 以「AI + 人工」混合交付保证质量下限；',
    '3. 建立能力方信誉评分与复购机制，降低撮合成本。',
  ]
  return lines.join('\n')
}

export const useTaskMarket = create<TaskMarketState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
      tasks: [],
      bids: [],
      seq: 0,

      publishTask: ({ title, description, type, budget }) => {
        const seq = get().seq + 1
        const task: MarketTask = {
          id: seq,
          title: title.trim(),
          description: description.trim(),
          type,
          budget: round2(budget),
          requiredSkills: TASK_SKILLS[type],
          status: 'open',
          createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        }
        set((s) => ({ seq, tasks: [task, ...s.tasks] }))
      },

      runMarket: (taskId) => {
        const st = get()
        const targets = taskId ? st.tasks.filter((t) => t.id === taskId) : st.tasks.filter((t) => t.status === 'open')
        if (targets.length === 0) return

        let providers = st.providers.map((p) => ({ ...p }))
        let bids = [...st.bids]
        const tasks = st.tasks.map((t) => ({ ...t }))

        for (const task of targets) {
          // ---- 竞标：每个能力方生成报价 ----
          const taskBids: MarketBid[] = providers.map((p) => {
            const price = round2(task.budget * p.priceFactor)
            const match = matchOf(p, task.requiredSkills)
            const eta = p.etaBase * (0.9 + Math.random() * 0.4)
            const confidence = clamp(0.6 + match * 0.38, 0, 1)
            const priceScore = 1 / (p.priceFactor + 0.0001) // 相对价格竞争力
            const qualityNorm = p.quality / 100
            const etaScore = 0.5 + Math.min(1, 100 / eta) * 0.5
            const finalScore = 0.4 * match + 0.25 * priceScore + 0.25 * qualityNorm + 0.1 * etaScore
            return {
              taskId: task.id,
              providerId: p.id,
              providerName: p.name,
              icon: p.icon,
              price,
              match,
              confidence: round2(confidence),
              finalScore: round2(finalScore),
              status: 'lost' as const,
            }
          })

          // ---- 匹配：综合分最高者中标 ----
          const winnerBid = taskBids.reduce((a, b) => (b.finalScore > a.finalScore ? b : a))
          const winner = providers.find((p) => p.id === winnerBid.providerId)!
          taskBids.forEach((b) => (b.status = b.providerId === winner.id ? 'won' : 'lost'))

          // ---- 执行 / 验收 / 结算 ----
          const idx = tasks.findIndex((t) => t.id === task.id)
          if (winner.type === 'llm') {
            const qualityScore = clamp(Math.round(winner.quality - 8 + Math.random() * 14), 55, 99)
            const passed = qualityScore >= 60
            const platformFee = round2(task.budget * 0.15)
            const providerRevenue = round2(task.budget * 0.85)
            const providerCost = round2(Math.max(0.001, task.budget * 0.0004))
            const providerProfit = round2(providerRevenue - providerCost)

            tasks[idx] = {
              ...tasks[idx],
              status: passed ? 'settled' : 'reviewing',
              winnerId: winner.id,
              winnerName: winner.name,
              result: genResult(task, winner.name),
              qualityScore,
              feedback: passed ? '验收通过，交付质量达到决策可用标准。' : '验收未通过，退回修改。',
              platformFee,
              providerRevenue,
              providerCost,
              providerProfit,
            }

            // 更新中标方信誉与收入
            providers = providers.map((p) => {
              if (p.id !== winner.id) return p
              const wins = p.wins + (passed ? 1 : 0)
              const revenue = round2(p.revenue + (passed ? providerRevenue : 0))
              const avgQuality = p.avgQuality == null ? qualityScore : round2((p.avgQuality + qualityScore) / 2)
              const quality = round2(p.quality * 0.95 + qualityScore * 0.05)
              return { ...p, wins, revenue, avgQuality, quality }
            })
          } else {
            // 外部能力方（人类专家 / 企业 Agent）：标记为待外部认领执行
            tasks[idx] = {
              ...tasks[idx],
              status: 'external',
              winnerId: winner.id,
              winnerName: winner.name,
              feedback: '已匹配到外部能力方，等待认领执行与人工验收。',
            }
          }

          bids = [...bids, ...taskBids]
        }

        set({ providers, bids, tasks })
      },

      reset: () => {
        set({
          providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
          tasks: [],
          bids: [],
          seq: 0,
        })
      },
    }),
    { name: 'ai-exchange-task-market' },
  ),
)
