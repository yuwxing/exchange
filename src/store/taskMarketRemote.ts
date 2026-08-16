// ============================================================
// AI Exchange · 任务市场远程 API 接入（真实执行模式）
// 对接本地 scripts/task_market_api.py（FastAPI v2，端口 8000）
//   POST /api/v1/tasks/submit  企业发布任务（异步 queued）
//   GET  /api/v1/tasks         任务列表
//   GET  /api/v1/tasks/{id}    任务详情（状态流转）
//   GET  /api/v1/health        健康检查
// 认证：Authorization: Bearer aex_live_*（企业 key，由管理员签发）
// 真实执行：后端用 DeepSeek LLM 执行 → AI 评委验收 → 复式结算
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RemoteTaskType = 'research' | 'data' | 'strategy' | 'report' | 'content'
export type RemoteTaskStatus = 'queued' | 'executing' | 'reviewing' | 'settled' | 'failed'

export const REMOTE_TASK_TYPE_META: { id: RemoteTaskType; label: string; icon: string; hint: string }[] = [
  { id: 'research', label: '深度研究', icon: '🔬', hint: '行业/技术/公司研究' },
  { id: 'data', label: '数据分析', icon: '📊', hint: '数据处理与洞察' },
  { id: 'strategy', label: '策略建议', icon: '🧭', hint: '商业/投资策略' },
  { id: 'report', label: '报告生成', icon: '📄', hint: '行业分析报告' },
  { id: 'content', label: '内容创作', icon: '✍️', hint: '文案/文章/营销内容' },
]

export const REMOTE_STATUS_META: Record<RemoteTaskStatus, { label: string; cls: string }> = {
  queued: { label: '排队中', cls: 'bg-slate-500/10 text-slate-600 ring-slate-400/40' },
  executing: { label: '执行中', cls: 'bg-amber-500/10 text-amber-600 ring-amber-400/40' },
  reviewing: { label: 'AI 验收中', cls: 'bg-violet-500/10 text-violet-600 ring-violet-400/40' },
  settled: { label: '已结算', cls: 'bg-emerald-500/10 text-emerald-600 ring-emerald-400/40' },
  failed: { label: '失败', cls: 'bg-red-500/10 text-red-600 ring-red-400/40' },
}

export type RemoteTask = {
  id: string
  title: string
  task_type: RemoteTaskType
  budget: number
  status: RemoteTaskStatus
  provider_name?: string
  score?: number
  profit?: number
  delivery_summary?: string
  created_at: string
}

const DEFAULT_BASE = import.meta.env.VITE_TASK_API_BASE ?? ''

function apiHeaders(key: string): HeadersInit {
  const h: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  // 后端 HTTPS 中间件读 x-forwarded-proto；本地直连 8000 时补上，生产走 nginx 反代会覆盖
  h['X-Forwarded-Proto'] = 'https'
  return h
}

async function parseRes(res: Response): Promise<any> {
  let data: any = null
  try {
    data = await res.json()
  } catch {
    // ignore
  }
  if (!res.ok) {
    const detail = data?.detail ?? data?.error ?? `HTTP ${res.status}`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

type RemoteTaskMarketState = {
  base: string
  apiKey: string
  connected: boolean | null
  checking: boolean
  tasks: RemoteTask[]
  submitting: boolean
  lastError: string
  lastProfit: number | null
  setBase: (b: string) => void
  setApiKey: (k: string) => void
  health: () => Promise<boolean>
  submit: (input: { title: string; task_type: RemoteTaskType; description: string; budget: number }) => Promise<{ ok: boolean; taskId?: string; message: string }>
  refresh: () => Promise<void>
  pollOnce: () => Promise<void>
  clearError: () => void
}

export const useRemoteTaskMarket = create<RemoteTaskMarketState>()(
  persist(
    (set, get) => ({
      base: DEFAULT_BASE,
      apiKey: '',
      connected: null,
      checking: false,
      tasks: [],
      submitting: false,
      lastError: '',
      lastProfit: null,

      setBase: (b) => set({ base: b.trim().replace(/\/+$/, '') }),
      setApiKey: (k) => set({ apiKey: k.trim() }),
      clearError: () => set({ lastError: '' }),

      health: async () => {
        const { base, apiKey } = get()
        set({ checking: true, lastError: '' })
        try {
          const res = await fetch(`${base}/api/v1/health`, {
            headers: apiKey ? apiHeaders(apiKey) : { 'X-Forwarded-Proto': 'https' },
          })
          await parseRes(res)
          set({ connected: true, checking: false })
          return true
        } catch (e) {
          set({ connected: false, checking: false, lastError: e instanceof Error ? e.message : String(e) })
          return false
        }
      },

      submit: async (input) => {
        const { base, apiKey } = get()
        if (!apiKey) {
          set({ lastError: '请先填写企业 API Key（aex_live_ 开头）' })
          return { ok: false, message: '缺少 API Key' }
        }
        set({ submitting: true, lastError: '' })
        try {
          const res = await fetch(`${base}/api/v1/tasks/submit`, {
            method: 'POST',
            headers: apiHeaders(apiKey),
            body: JSON.stringify(input),
          })
          const data = await parseRes(res)
          set({ submitting: false, connected: true })
          return { ok: true, taskId: data.task_id, message: `已提交 ${data.task_id}（${data.status}）` }
        } catch (e) {
          set({ submitting: false, lastError: e instanceof Error ? e.message : String(e) })
          return { ok: false, message: e instanceof Error ? e.message : String(e) }
        }
      },

      refresh: async () => {
        const { base, apiKey } = get()
        if (!apiKey) return
        try {
          const res = await fetch(`${base}/api/v1/tasks`, { headers: apiHeaders(apiKey) })
          const rows: any[] = await parseRes(res)
          const tasks: RemoteTask[] = rows.map((r) => ({
            id: r.id,
            title: r.title,
            task_type: r.task_type,
            budget: r.budget,
            status: r.status,
            provider_name: r.provider_name,
            created_at: r.created_at,
          }))
          set({ tasks, connected: true })
          // 结算利润记录（最近一笔 settled）
          const settled = tasks.find((t) => t.status === 'settled')
          if (settled) set({ lastProfit: settled.budget })
        } catch (e) {
          set({ lastError: e instanceof Error ? e.message : String(e) })
        }
      },

      pollOnce: async () => {
        await get().refresh()
      },
    }),
    { name: 'ai-exchange-task-market-remote' },
  ),
)
