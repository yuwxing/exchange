// ============================================================
// AI Exchange · AI 顾问（对话式投顾）
// V2.1：自然语言 → 意图识别 → 调用智能体报告 / 市场数据生成回答
// 纯规则引擎（可扩展为 LLM 接入）
// ============================================================
import type { Account, AgentReport, Asset, Opportunity, Quote, SentimentState, WhaleFlow } from '../types'
import type { PriceAttribution } from '../engine/pricing'

export type AdvisorReply = {
  reply: string
  points?: string[]
  linkedSymbol?: string
  suggestion?: string
}

export type AdvisorContext = {
  assets: Asset[]
  quotes: Record<string, Quote>
  sentiment: SentimentState
  radar: Opportunity[]
  whaleFlows: WhaleFlow[]
  whaleTrades: { whaleName: string; whaleIcon: string; symbol: string; direction: 'long' | 'short'; amount: number; time: string }[]
  account: Account
  reports: Partial<Record<string, AgentReport>>
  wegPrice: number
  lastAttribution: Record<string, PriceAttribution>
}

/** 意图识别与回答生成 */
export function analyzeAdvisor(input: string, ctx: AdvisorContext): AdvisorReply {
  const q = input.trim().toLowerCase()

  // 0. 金库 / 质押 / 劳动力（优先于资产代码匹配）
  if (/金库|质押|劳动力|任务市场|接单|Agent 简历|工资|贡献积分/.test(q)) {
    return {
      reply: `AI 劳动力市场：Agent 承接任务（修复 Bug / 数据分析 / 内容生成…），调用 Skill 与 Model、消耗 Compute，完成后获得 AI Value 与 WEG 贡献积分。WEG 是 AI 经济贡献积分，非货币、非证券。`,
      points: ['任务按层级定价：L1 简单 1-10 · L2 专业 10-100 · L3 复杂 100-1000 · L4 Agent Team 按项目计费。', '每个 Agent 都有简历：信誉（S/A/B/C）、成功率、生产率与工资；AI LABOR 100 指数追踪劳动价格。'],
      suggestion: '在「AI 劳动力」页可模拟接单、查看 Agent 简历、工资指数与贡献积分任务。',
    }
  }

  // 1. 资产代码查询
  const symMatch = q.match(/(?:ai-|ag-|sk-|mcp-|app-|rob-|dat-|inf-|prt-|idx-)[a-z0-9]{2,12}/)
  const isWegQuery = /(?:^|\s)weg(?:\s|$|[?？]|怎么样|行情|价格|现价|是什么)/.test(q)
  if (symMatch || isWegQuery) {
    const symbol = (symMatch ? symMatch[0] : 'WEG').toUpperCase()
    const asset = ctx.assets.find((a) => a.symbol === symbol)
    if (asset) {
      const quote = ctx.quotes[symbol]
      const up = (quote?.changePct ?? 0) >= 0
      return {
        reply: `${asset.symbol} ${asset.name}（${asset.description}）当前模拟价 $${quote?.price.toFixed(2) ?? asset.basePrice}，${up ? '上涨' : '下跌'} ${Math.abs((quote?.changePct ?? 0) * 100).toFixed(2)}%，AI 评分 ${asset.score}，AI 价值 ${asset.aiValue}，评级 ${asset.rating} 级。`,
        points: [
          `市值 $${(asset.marketCap / 1e8).toFixed(1)} 亿 · 波动率 ${(asset.volatility * 100).toFixed(1)}%`,
          `关键指标：${asset.metrics.slice(0, 4).map((m) => `${m.label} ${m.value}`).join(' · ')}`,
        ],
        linkedSymbol: symbol,
        suggestion: '可在详情页查看 Pro Chart、运行 AI 估值与风险智能体。',
      }
    }
  }

  // 2. 价格归因（为什么涨/跌）
  if (/为什么|原因|涨了|跌了|上涨|下跌|波动/.test(q)) {
    const target = (symMatch ? symMatch[0].toUpperCase() : '') || Object.keys(ctx.quotes)[0]
    const att = target ? ctx.lastAttribution[target] : undefined
    if (att && att.factors.length > 0) {
      const top = att.factors.slice(0, 4)
      return {
        reply: `${target} 最近一次价格变动归因（AI 定价引擎 · 非随机数）：总变动 ${att.total >= 0 ? '+' : ''}${(att.total * 100).toFixed(3)}%。`,
        points: top.map((f) => `${f.label} ${f.value >= 0 ? '+' : ''}${(f.value * 100).toFixed(3)}%`),
        linkedSymbol: target,
        suggestion: '定价引擎 = 基础价值 + 情绪 + 使用量 + 增长 + 新闻 + 巨鲸 + 板块热度 + AI Value + 周期 + 扰动。',
      }
    }
    return {
      reply: '我可以告诉你价格变动归因（AI 定价引擎驱动）。试试「AI-DEEPSEEK 为什么涨」或「市场波动原因」。',
      suggestion: '定价引擎会让新闻、巨鲸、情绪、板块热度真实地影响价格与指数。',
    }
  }

  // 3. 情绪 / 市场
  if (/情绪|市场|大盘|恐慌|贪婪|涨跌|行情/.test(q)) {
    const s = ctx.sentiment
    return {
      reply: `当前 AI 市场情绪为「${s.level}」（指数 ${s.score}/100）${s.score >= 75 ? '，警惕过热回调' : s.score <= 25 ? '，关注超跌机会' : '，多空相对均衡'}。`,
      points: s.drivers.map((d) => `${d.label} ${d.value}（权重 ${d.weight}%）`),
      suggestion: '可在首页查看恐惧-贪婪仪表盘与十大板块温度计。',
    }
  }

  // 3. 持仓 / 组合
  if (/持仓|我的|组合|仓位|盈亏|买了|资产页/.test(q)) {
    const h = ctx.account.holdings
    if (h.length === 0) {
      return {
        reply: '当前模拟账户为空仓状态，可用资金 $' + ctx.account.cash.toLocaleString('zh-CN') + '。',
        points: ['建议：配置 3-5 个跨板块龙头资产分散风险。', `可通过「AI 劳动力」页模拟接单完成任务，赚取 WEG 贡献积分。`],
        suggestion: '试试问我「有什么机会」获取 AI 机会雷达推荐。',
      }
    }
    const total = h.reduce((a, b) => a + (ctx.quotes[b.symbol]?.price ?? b.avgCost) * b.quantity, 0) + ctx.account.cash
    const pl = h.reduce((a, b) => a + ((ctx.quotes[b.symbol]?.price ?? b.avgCost) - b.avgCost) * b.quantity, 0)
    return {
      reply: `模拟账户总资产 $${total.toLocaleString('zh-CN')}，持仓 ${h.length} 个标的，浮动盈亏 ${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}。`,
      points: h.slice(0, 3).map((x) => `${x.symbol} ${x.quantity} 股 · 成本 $${x.avgCost.toFixed(2)}`),
      suggestion: '运行「AI Portfolio Agent」获取完整组合诊断。',
    }
  }

  // 4. 机会 / 推荐
  if (/机会|推荐|买什么|看好|抄底|潜力|雷达/.test(q)) {
    if (ctx.radar.length === 0) {
      return { reply: '机会雷达尚未扫描。请先在「AI 智能」页点击「📡 运行机会雷达」，我就能给出低估值/高增长/巨鲸流入的机会榜。' }
    }
    const top = ctx.radar[0]
    return {
      reply: `AI 机会雷达发现 ${ctx.radar.length} 个机会，优先级最高的是「${top.tag}」：${top.symbol} ${top.name}（${top.reason}）。`,
      points: ctx.radar.slice(0, 4).map((o) => `【${o.tag}】${o.symbol} ${o.name} · 现价 $${o.price.toFixed(2)}（${o.changePct >= 0 ? '+' : ''}${(o.changePct * 100).toFixed(2)}%）`),
      linkedSymbol: top.symbol,
      suggestion: '注意：机会为模拟信号，请结合 AI 估值与风险智能体自行判断。',
    }
  }

  // 5. 风险
  if (/风险|危险|亏|爆仓|强平|波动/.test(q)) {
    return {
      reply: '模拟市场风险提示：合约杠杆（5x/10x）亏损达到保证金即触发强平；高波动板块（机器人/协议）日内振幅更大。',
      points: ['建议单笔合约保证金不超过可用资金 20%。', '可在资产详情页运行「AI Risk Agent」查看单资产风险等级。'],
      suggestion: '教育模拟演示，不构成任何投资建议。',
    }
  }

  // 6. WEG 解释（不含金库/质押上下文）
  if (/weg|积分|贡献/.test(q)) {
    return {
      reply: `WEG 是 AI 经济贡献积分（AI Economy Contribution Point），非货币、非证券。通过研究、交易模拟、创建 Agent、创建 Skill、测试 MCP、完成任务、发布数据、贡献评价获得，衡量你对 AI 生态的每一份贡献。`,
      points: ['WEG 不发行、不募资、不承诺升值回报。', '贡献奖励直接入账 WEG 余额，并提升 AI Credit 信用分。'],
      suggestion: '前往「AI 劳动力」页模拟接单、领取贡献积分任务、查看 Agent 简历与工资指数。',
    }
  }

  // 7. 平台说明
  if (/平台|是什么|模拟|怎么玩|教程|帮助/.test(q)) {
    return {
      reply: '这里是 AI Exchange · 全球人工智能资产交易与经济系统（教育模拟）。模型、Agent、Skill、MCP、应用、机器人、数据、算力、协议 9 类 AI 资产统一模拟上市交易；AI 劳动力市场让 Agent 承接任务创造劳动价值。',
      points: ['10 大板块 · 136 个模拟标的 · 9 大指数 · 六大 AI 智能体。', '现货（市价/限价/止损/止盈）+ 模拟杠杆合约 + AI 劳动力市场 + WEG 贡献积分。'],
      suggestion: '试试问我「市场情绪怎么样」「AI-DEEPSEEK 怎么样」「有什么机会」。',
    }
  }

  // 默认
  return {
    reply: '我可以帮你分析：市场情绪、具体资产（如 AI-DEEPSEEK / AG-CODEX / WEG）、投资机会、持仓诊断、风险提示、AI 劳动力市场与 WEG 贡献积分体系。',
    points: ['试试说：「市场情绪怎么样」', '试试说：「AI-DEEPSEEK 怎么样」', '试试说：「有什么机会」'],
  }
}
