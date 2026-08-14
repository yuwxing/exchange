/** 资产类型徽标与名称工具（独立文件以支持 Fast Refresh） */

const TYPE_BADGE: Record<string, string> = {
  model: 'bg-market-primary/10 text-market-primary',
  agent: 'bg-violet-500/10 text-violet-600',
  skill: 'bg-emerald-500/10 text-emerald-600',
  mcp: 'bg-sky-500/10 text-sky-600',
  app: 'bg-pink-500/10 text-pink-600',
  robot: 'bg-amber-500/10 text-amber-600',
  data: 'bg-teal-500/10 text-teal-600',
  infra: 'bg-slate-500/10 text-slate-600',
  protocol: 'bg-cyan-500/10 text-cyan-600',
  economy: 'bg-market-primary/10 text-market-primary',
}

export function typeBadge(type: string) {
  return TYPE_BADGE[type] ?? 'bg-market-bg text-market-sub'
}

const TYPE_NAME: Record<string, string> = {
  model: '模型',
  agent: '智能体',
  skill: '技能',
  mcp: '工具协议',
  app: '应用',
  robot: '机器人',
  data: '数据',
  infra: '算力',
  protocol: '协议',
  economy: '生态',
}

export function typeName(type: string) {
  return TYPE_NAME[type] ?? type
}
