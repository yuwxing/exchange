// ============================================================
// AI Capital Flow Engine
// 可视化：资本 → DSU → AI Company / AI Worker → AI Service →
//        Revenue → Profit → 资本回流
// ============================================================
import type { CapitalFlowState, CapitalFlowNode, CapitalFlowLink } from './types'

export function buildCapitalFlow(
  capital: number,
  dsuValue: number,
  companyCap: number,
  workerOutput: number,
  serviceRevenue: number,
  profit: number,
): CapitalFlowState {
  const nodes: CapitalFlowNode[] = [
    { id: 'capital', label: '资本', value: capital, icon: '💰' },
    { id: 'dsu', label: 'DSU', value: dsuValue, icon: '⚖️' },
    { id: 'company', label: 'AI 企业', value: companyCap, icon: '🏢' },
    { id: 'worker', label: 'AI Worker', value: workerOutput, icon: '🤖' },
    { id: 'service', label: 'AI Service', value: serviceRevenue, icon: '🧩' },
    { id: 'revenue', label: 'Revenue', value: serviceRevenue, icon: '📈' },
    { id: 'profit', label: 'Profit', value: profit, icon: '💎' },
  ]

  const links: CapitalFlowLink[] = [
    { from: 'capital', to: 'dsu', value: capital * 0.25, label: '配置 DSU' },
    { from: 'dsu', to: 'company', value: companyCap * 0.08, label: '投资企业' },
    { from: 'dsu', to: 'worker', value: workerOutput * 8, label: '雇佣 Agent' },
    { from: 'company', to: 'worker', value: workerOutput * 4, label: '部署劳动力' },
    { from: 'worker', to: 'service', value: serviceRevenue * 0.7, label: '生产服务' },
    { from: 'service', to: 'revenue', value: serviceRevenue, label: '服务收入' },
    { from: 'revenue', to: 'profit', value: profit, label: '利润形成' },
    { from: 'profit', to: 'capital', value: profit * 0.6, label: '回流资本' },
  ]

  const totalFlow = links.reduce((a, l) => a + l.value, 0)
  return { nodes, links, totalFlow }
}

export function initCapitalFlow(): CapitalFlowState {
  return buildCapitalFlow(1_000_000_000, 8_420_000, 12_840_000_000, 1_000_000, 84_000_000, 25_000_000)
}
