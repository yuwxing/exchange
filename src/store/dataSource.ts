import { createJSONStorage } from 'zustand/middleware'

/**
 * 数据源抽象层（V3 预留）
 *
 * 作用：把「持久化数据往哪存」从业务代码中解耦。
 * 业务代码（src/store/market.ts）只依赖本文件导出的 marketStorage，
 * 接入 Supabase 时无需改动任何业务代码。
 *
 * 接口协议对齐 zustand persist 的 StateStorage：
 *   getItem / setItem / removeItem —— 三者均允许返回 Promise（支持异步数据源）。
 *   createJSONStorage 负责 JSON 序列化，本层只处理原始字符串。
 *
 * 当前数据源：本地浏览器存储（localStorage）—— 单机单用户。
 * V3 数据源：Supabase —— 云端共享同一套模拟行情，所有用户看到一致。
 *
 * 切换方式（二选一）：
 *   1. 构建时：在 .env 中设置 VITE_DATA_SOURCE=supabase
 *   2. 接入后：将下方 dataSourceMode 的默认值改为 'supabase'
 *
 * 注意：Supabase 适配器是异步的，初次打开会先渲染默认状态再水合（可能有短暂闪烁）。
 *       如需加载态，可在入口处用 onRehydrateStorage 或 useMarket.persist.onFinishHydration 加一层 gate。
 */

export type DataSourceAdapter = {
  getItem: (name: string) => string | null | Promise<string | null>
  setItem: (name: string, value: string) => void | Promise<void>
  removeItem: (name: string) => void | Promise<void>
}

/** 持久化键命名空间：localStorage 前缀；Supabase 端对应表/行键 */
export const STORE_NAMESPACE = 'ai-exchange'

/** 账户与交易记录使用的持久化键（V3：USDT 计价 + WEG 余额 + AI 信用 的账户体系） */
export const ACCOUNT_STORAGE_KEY = 'ai-exchange-account-v3'

const localAdapter: DataSourceAdapter = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // 存储配额满或隐私模式：静默失败，模拟盘可继续运行
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // ignore
    }
  },
}

/**
 * V3 占位：Supabase 异步适配器骨架。
 * 接口已对齐，接入时补齐实现即可，无需改动市场业务代码。
 *
 * 建议表结构：
 *   create table ai_exchange_state (
 *     key text primary key,
 *     value jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 * 同一 key 即代表「全市场共享的同一套模拟状态」。
 */
const supabaseAdapter: DataSourceAdapter = {
  async getItem(_name) {
    // const { data } = await supabase
    //   .from('ai_exchange_state')
    //   .select('value')
    //   .eq('key', _name)
    //   .maybeSingle()
    // return data?.value ?? null
    return null
  },
  async setItem(_name, _value) {
    // await supabase
    //   .from('ai_exchange_state')
    //   .upsert({ key: _name, value: JSON.parse(_value), updated_at: new Date().toISOString() })
  },
  async removeItem(_name) {
    // await supabase
    //   .from('ai_exchange_state')
    //   .delete()
    //   .eq('key', _name)
  },
}

/** 数据源模式：.env 中 VITE_DATA_SOURCE=supabase 时切换为云端 */
export const dataSourceMode: 'local' | 'supabase' =
  (import.meta.env.VITE_DATA_SOURCE as 'local' | 'supabase' | undefined) ?? 'local'

const adapter: DataSourceAdapter = dataSourceMode === 'supabase' ? supabaseAdapter : localAdapter

/** 供 persist 中间件使用的存储（工厂形式，惰性创建，兼容 SSR/测试环境无 window） */
export const marketStorage = createJSONStorage(() => adapter)
