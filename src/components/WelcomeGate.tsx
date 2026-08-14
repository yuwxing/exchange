import { useMarket } from '../store/market'
import { fmtNumber } from '../utils/format'

/** 首次进入欢迎页：展示模拟账户结构，明确「这是模拟系统」 */
export default function WelcomeGate({ onStart }: { onStart: () => void }) {
  const account = useMarket((s) => s.account)

  const assets = [
    { label: 'USDT', value: fmtNumber(account?.cash ?? 100000, 0), icon: '💵', note: '模拟资金' },
    { label: 'WEG', value: fmtNumber(account?.wegBalance ?? 10000, 0), icon: '🌐', note: '生态积分' },
    { label: 'AI资产', value: String(account?.holdings?.length ?? 0), icon: '📊', note: '持仓数量' },
    { label: '等级', value: `Lv.${account?.level ?? 1}`, icon: '⭐', note: '贡献等级' },
    { label: 'AI信用', value: String(account?.aiCredit ?? 100), icon: '🛡️', note: '信用分' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-market-primary via-market-primary to-market-primary-hover px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-market-primary text-2xl font-black text-white shadow-lg">
            AX
          </div>
          <h1 className="mt-4 text-3xl font-black text-market-text">欢迎来到 AI Exchange</h1>
          <p className="mt-1.5 text-sm text-market-sub">你的模拟账户 · 全球 AI 经济模拟交易市场</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {assets.map((a) => (
            <div key={a.label} className="rounded-xl border border-market-border bg-market-bg/50 p-3.5 text-center">
              <div className="text-xl">{a.icon}</div>
              <div className="mt-1 text-xs font-medium text-market-sub">{a.label}</div>
              <div className="mt-0.5 text-lg font-bold text-market-text tnum">{a.value}</div>
              <div className="text-[10px] text-market-sub">{a.note}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-300">
          <span>⚠️</span>
          <p>
            本平台为<b> AI 产业经济模拟与教育研究平台</b>。账户中的 USDT、WEG 及所有资产均为<b> 模拟数据</b>，
            不代表真实证券、金融产品或数字资产，不涉及任何真实资金。
          </p>
        </div>

        <button
          onClick={onStart}
          className="mt-6 w-full rounded-xl bg-market-primary py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-market-primary-hover hover:shadow-xl active:scale-[0.99]"
        >
          开始 AI 投资模拟 →
        </button>
        <p className="mt-3 text-center text-[11px] text-market-sub">模拟交易 · 教育演示 · 无真实资金</p>
      </div>
    </div>
  )
}
