import { useMemo, useState } from 'react'
import { useEconomy } from '../store/economy'
import { fmtNumber } from '../utils/format'

export default function WorkersPage() {
  const { workers, portfolio, hireWorker, fireWorker, trainWorker, deployWorker } = useEconomy()
  const [filter, setFilter] = useState<'all' | 'owned' | 'free'>('all')

  const filtered = useMemo(() => {
    if (filter === 'owned') return workers.filter((w) => w.owner === 'user')
    if (filter === 'free') return workers.filter((w) => w.owner !== 'user')
    return workers
  }, [workers, filter])

  function action(w: (typeof workers)[0], type: 'hire' | 'fire' | 'train' | 'deploy') {
    let res: { ok: boolean; message: string }
    if (type === 'hire') res = hireWorker(w.id)
    else if (type === 'fire') res = fireWorker(w.id)
    else if (type === 'train') res = trainWorker(w.id)
    else res = deployWorker(w.id)
    if (!res.ok) alert(res.message)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h1 className="text-xl font-black text-market-text">AI Worker Market</h1>
        <p className="mt-1 text-sm text-market-sub">AI 劳动力市场：雇佣、训练、部署 Agent，获取模拟 DSU 产出。</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(['all', 'owned', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === f
                  ? 'bg-market-primary text-white'
                  : 'bg-white text-market-sub ring-1 ring-market-border hover:text-market-text'
              }`}
            >
              {f === 'all' ? '全部' : f === 'owned' ? '我的 Agent' : '待雇佣'}
            </button>
          ))}
        </div>
        <div className="text-xs text-market-sub">
          我的 DSU {fmtNumber(portfolio.dsuBalance, 2)} · 已雇佣 {portfolio.workerRoster.length} 个 Agent
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
        <table className="w-full text-sm">
          <thead className="bg-market-bg text-xs uppercase text-market-sub">
            <tr>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Skill</th>
              <th className="px-4 py-3 text-right">生产力</th>
              <th className="px-4 py-3 text-right">日产出</th>
              <th className="px-4 py-3 text-right">工资</th>
              <th className="px-4 py-3 text-right">需求</th>
              <th className="px-4 py-3 text-right">ROI</th>
              <th className="px-4 py-3 text-center">状态</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const owned = w.owner === 'user'
              return (
                <tr key={w.id} className="border-t border-market-border/60 transition-colors hover:bg-market-bg">
                  <td className="px-4 py-3 font-medium text-market-text">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded bg-market-bg text-xs">🤖</span>
                      {w.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-market-sub">{w.skill}</td>
                  <td className="px-4 py-3 text-right tnum">{w.productivity}</td>
                  <td className="px-4 py-3 text-right font-semibold tnum text-market-up">{fmtNumber(w.dailyOutput, 2)} DSU</td>
                  <td className="px-4 py-3 text-right tnum">{fmtNumber(w.salary, 2)} DSU</td>
                  <td className="px-4 py-3 text-right tnum">{fmtNumber(w.demandIndex, 2)}</td>
                  <td className="px-4 py-3 text-right tnum">{fmtNumber(w.roi, 1)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        owned
                          ? w.status === 'working'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                          : 'bg-market-bg text-market-sub'
                      }`}
                    >
                      {owned ? (w.status === 'working' ? '工作中' : w.status === 'training' ? '训练中' : '待命') : '待雇佣'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {!owned ? (
                        <button
                          onClick={() => action(w, 'hire')}
                          className="rounded bg-market-primary px-2 py-1 text-xs font-semibold text-white hover:bg-market-primary-hover"
                        >
                          Hire
                        </button>
                      ) : (
                        <>
                          {w.status !== 'working' && (
                            <button
                              onClick={() => action(w, 'deploy')}
                              className="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Deploy
                            </button>
                          )}
                          <button
                            onClick={() => action(w, 'train')}
                            className="rounded bg-market-bg px-2 py-1 text-xs font-semibold text-market-text ring-1 ring-market-border hover:bg-white"
                          >
                            Train
                          </button>
                          <button
                            onClick={() => action(w, 'fire')}
                            className="rounded bg-market-down px-2 py-1 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Fire
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-market-border/60">
          <div className="text-xs text-market-sub">Worker 总收入</div>
          <div className="mt-1 text-xl font-bold tnum text-market-up">+{fmtNumber(portfolio.workerIncome, 2)} DSU</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-market-border/60">
          <div className="text-xs text-market-sub">今日总产出</div>
          <div className="mt-1 text-xl font-bold tnum text-market-text">
            {fmtNumber(
              workers
                .filter((w) => portfolio.workerRoster.includes(w.id))
                .reduce((a, w) => a + w.dailyOutput, 0),
              2,
            )}{' '}
            DSU
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-market-border/60">
          <div className="text-xs text-market-sub">已投资 Agent</div>
          <div className="mt-1 text-xl font-bold tnum text-market-text">{portfolio.workerRoster.length}</div>
        </div>
      </div>
    </div>
  )
}
