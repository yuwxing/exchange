# AI Exchange · 全球 AI 经济模拟交易市场（V2）

> 升级自 `exchange.we-aigo.cn`（AI Exchange 模拟证券市场）
> 定位：把全球 AI 模型、Agent、Skill、MCP、应用、机器人、数据、算力与 AI 基础设施**统一资产化、指数化、交易化**的 **AI 产业经济模拟与教育研究平台**（所有资产/行情/交易/指数/合约/收益均为模拟数据，不代表真实证券、金融产品或数字资产）。
> V2 为**前沿化升级**：参考专业交易平台交互模式（概念借鉴，代码与品牌完全原创，与任何真实交易所无关联）。

## V2 前沿功能

| 功能 | 说明 | 入口 |
|------|------|------|
| 🧭 AI 情绪指数 | 恐惧-贪婪仪表盘（0-100）+ 十大板块温度计（过热/偏热/中性/偏冷/冰冷），由涨跌家数/平均涨跌/成交活跃度/巨鲸流入加权 | 首页 · 指数中心 |
| 🐋 AI 巨鲸追踪 | 8 家模拟机构（OpenAI Capital / DeepMind 基金 / NVIDIA Ventures 等）持仓与实时大单流 | 首页 · 资产详情 |
| 📡 AI 机会雷达 | 扫描低估值 / 高增长 / 巨鲸流入 / 强势突破机会 | AI 智能页 |
| 📈 Pro Chart | K 线 + 日/周周期 + MA / BOLL / RSI / MACD 指标切换 | 资产详情 |
| ⚡ Pro Trade | 现货（市价/限价/止损/止盈挂单）+ 模拟杠杆合约（2x/5x/10x 做多/做空，强平机制） | 资产详情 · 我的资产 |
| 🏦 WEG 金库 | 质押 WEG 赚模拟收益（年化 8%，按真实时间累积） | WEG 生态页 |
| 💬 AI 顾问 | 对话式投顾：问市场情绪 / 具体资产 / 机会 / 持仓 / 风险 / WEG，规则引擎即时回答 | AI 智能页 |

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 本地开发预览 → http://localhost:5173
npm run build      # 生产构建（tsc 类型检查 + vite build）→ dist/
npm run preview    # 预览生产构建产物
```

**首次进入**：显示欢迎页「欢迎来到 AI Exchange」——模拟账户概览（USDT 100,000 · WEG 10,000 · AI 资产 · 等级 Lv.1 · AI 信用 100），点击「开始 AI 投资模拟」进入主界面（本地标记，清除浏览器数据后再次显示）。

**模拟账户体系**（全新用户默认值）：
- `USDT 100,000`：模拟资金（全站以 USDT 计价，`$` 符号）
- `WEG 10,000`：生态积分余额（贡献任务奖励直接入账；可质押到 WEG 金库赚模拟年化 8%）
- `AI 资产`：持仓标的数量
- `等级 Lv.1` + `AI 信用 100`：贡献经验升级，完成任务增加信用分
- 全部为模拟数据，不代表真实资产；账户数据存 localStorage

技术栈：React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · ECharts 6 · Zustand 5 · React Router 7（纯前端，无后端，数据存 localStorage）。

## 平台定义

```
                 AI EXCHANGE
        ┌────────────┼────────────┐
     MODEL市场     AGENT市场    SKILL市场   ……
     (27个资产)   (25个资产)   (15个资产)
        └────────────┼────────────┘
              MCP / APP / ROBOT / DATA / INFRA / PROTOCOL
                          │
                    AI 指数体系（AI10/AI50/MODEL100/…）
                          │
                    AI Intelligence（六大智能体）
                          │
                        AI 经济
```

### 十大市场（固定）
| # | 板块 | 前缀 | 权重 | 说明 |
|---|------|------|------|------|
| 01 | AI 模型 🧠 | `AI-` | 25% | 全球大模型上市公司模拟行情 |
| 02 | 智能体 🤖 | `AG-` | 20% | Coding/Business/Education/Research/Personal Agent |
| 03 | 技能 🧩 | `SK-` | 10% | Agent Skill 市场 |
| 04 | 工具协议 🔌 | `MCP-` | 8% | MCP Server 市场 |
| 05 | AI 应用 📱 | `APP-` | 12% | Coding/Search/Design/Video/Audio/Productivity |
| 06 | 机器人 🦾 | `ROB-` | 8% | 人形机器人 / 具身智能 |
| 07 | AI 数据 🗂️ | `DAT-` | 5% | 数据即生产资料 |
| 08 | 算力基础设施 🖥️ | `INF-` | 7% | GPU/TPU/云/推理芯片 |
| 09 | AI 协议 🌐 | `PRT-` | 3% | MCP/A2A/ACP/UCP/ALP |
| 10 | 指数 🧮 | `IDX-` | 2% | 指数基金 + WEG 生态积分资产 |

### 指数体系（9 个 + 10 大板块指数）
`AI100` `AI10` `AI50` `MODEL100` `AGENT100` `SKILL100` `APP100` `ROBOT50` `INFRA50` + 10 大板块指数。

**指数编制（价格比法，数学上有界）**：`指数 = 基期 × Σ(市值×现价/发行价) / Σ市值`。价格被 ±3% 单 tick 限幅约束且带温和均值回归（回归系数 0.001，行情长期围绕发行价 ±30% 波动），因此指数与行情**长期稳定、永不发散**；每日 23:00 收盘结算更新昨收基准，涨幅显示当日涨跌。

### AI 市值公式（AI Value）
每个资产 11 维指标 → 加权得分：

```
AI Value = 模型能力×0.20 + 使用量×0.15 + 开发者×0.12 + 收入×0.12 + Agent活跃×0.10
         + 用户规模×0.10 + API调用×0.06 + Skills生态×0.05 + 增长×0.05 + 生态×0.03 + 可靠性×0.02
```

评分 ≥90 → S 级（行业龙头）/ ≥85 → A / ≥80 → B / ≥75 → C / 其余 D。

### AI Intelligence（六大智能体）
| 智能体 | 职责 |
|--------|------|
| 🔭 AI Research Agent | 扫描候选池、自动发现新资产、一键模拟上市 |
| 📐 AI Valuation Agent | 公允价值 / 目标价 / 评级 |
| 📊 AI Market Agent | 市场情绪 / 板块轮动 / 资金活跃度 |
| 🛡️ AI Risk Agent | 波动率风险评级 / 持仓预警 |
| 📰 AI News Agent | 自动生成新闻事件并发布影响指数 |
| 💼 AI Portfolio Agent | 组合盈亏诊断 / 分散度检查 |

V1 为纯前端模拟（种子随机 + 市场状态推导）；V2 可替换为真实 LLM 调用（`src/ai/intelligence.ts` 是唯一接入点）。

## 目录结构

```
src/
├── types.ts               # 数据模型（Asset/Sector/IndexDef/AgentReport/合约/挂单/质押…）
├── data/assets.ts         # ★ 核心数据集：板块 / 136 资产 / 指数 / 新闻池 / 候选池 / 贡献规则
├── data/whales.ts         # AI 巨鲸（8 家模拟机构）
├── ai/intelligence.ts     # ★ AI Intelligence 层（六大智能体 + 机会雷达 + 日报）
├── store/market.ts        # 市场引擎：报价 / K线 / 板块指数 / 综合指数 / 情绪指数 / 巨鲸 / 挂单撮合 / 合约 / 质押 / 交易 / 上市
├── store/dataSource.ts    # 持久化抽象（localStorage，预留 Supabase）
├── engine/candles.ts      # K 线生成（种子随机）
├── utils/format.ts        # 数字格式化 / 随机数工具
├── components/            # Layout / IndexPanel / SentimentGauge / WhaleFeed / AssetTable / AssetCard / TradePanel(现货+合约) / KLine(Pro Chart) / …
└── pages/                 # Market 大厅 / Assets 列表 / AssetDetail / AIIndex / Intelligence / Portfolio(含合约+挂单) / News / WegEconomy(含金库)
```

## 数据维护指南（日常改数据只需动 `src/data/assets.ts`）

### 1. 新增资产
在对应板块数组中追加一行（`Row` 格式）：
```ts
['AI-XYZ', '名称', 'NameEn', '一句话简介', 发行价, 波动率, 市值(亿), 评分, ['标签1','标签2'], '发行方']
```
- 发行价：S 级模型 100-300，应用 20-120，Skill/MCP 2-10
- 波动率：0.008（稳）~ 0.028（波动大）
- 市值单位是「亿元」，内部自动 ×1e8
- 评分 → 自动派生 11 维指标、AI Value、评级

### 2. 调整板块权重
改 `SECTORS` 中对应 `weight`（总和不必为 100，展示用）。

### 3. 新增指数
在 `INDEXES` 追加：
```ts
{ id: 'data50', code: 'DATA50', name: 'AI 数据 50', scope: 'sector', sectorId: 'data', base: 10000, desc: '…' }
```

### 4. 候选资产池（Research Agent 发现）
改 `CANDIDATES` 数组。已上市的候选会从池中移除并持久化，不会重复上市。

### 5. 新闻事件
改 `NEWS_POOL`，`effect` 支持板块 id（model/agent/skill/mcp/app/robot/data/infra/protocol）与生态指数（users/agent/calls/revenue/developers/ecosystem/market）。

## 合规说明

- 本平台为**教育模拟产品**：所有行情与价格均由 AI Engine 模拟生成，不构成任何投资建议。
- 全部 AI 资产为**模拟上市**，不构成任何货币或证券发行；WEG 为生态贡献积分（非证券）。
- 数据保存在浏览器本地（localStorage），可随时「重置账户」。

## 部署（Cloudflare）

项目根已含 `.wrangler` 配置。本项目为纯静态 SPA（HashRouter，无路由回退问题），可部署到：
- Cloudflare Pages：`npm run build` 后上传 `dist/`
- Cloudflare Workers Static Assets / 任意静态托管

部署后如需保留用户旧账户数据，注意旧标的代码（DSK/QWN/…）已迁移为新代码（AI-DEEPSEEK/…），旧持仓会显示为未找到（模拟盘数据无影响，可在「我的资产 → 重置账户」清空）。
