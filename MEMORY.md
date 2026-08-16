# 项目记忆 · AI Exchange

## 项目定位
AI Exchange（exchange.we-aigo.cn）—— 全球 AI 经济模拟交易市场 + AI 任务市场引擎。
用户方向已从「模拟证券交易」扩展为「AI 经济世界 + B2B 任务撮合平台」。

## 技术栈
- 前端：React 19 + TypeScript + Vite + Zustand + Tailwind + ECharts
- 部署：GitHub Actions → Cloudflare Pages（push 到 master 自动部署）
- 仓库：https://github.com/yuwxing/exchange.git
- 本地 AI 脚本：Python + DeepSeek API（环境变量 DEEPSEEK_API_KEY）

## 已完成（2026-08-16）· V3 升级：AI 产业经济飞轮
1. **飞轮引擎（V6）**：src/ai/flywheel.ts（8 节点聚合视图层）
   - AI资本/AI企业/AI IPO/AI Workforce/Agent生产/AI收入/AI利润/企业估值
   - 只读底层三引擎 + Capital OS + 行情派生，不另造数据（守恒）
   - 利润 × PE 3x 计入企业估值（利润→估值传导）；飞轮转速 0-100 + 历史快照
   - 接入 store/market.ts tick 循环（不持久化，随底层重建）
2. **飞轮页面**：src/pages/Flywheel.tsx（路由 /flywheel + 导航「经济飞轮」）
   - 环形 8 节点 SVG 流程图 + 中心转速仪表盘（ECharts gauge）
   - 顶部 KPI（飞轮指数/转速/总估值/总资本/循环次数）
   - 历史曲线（转速/估值/资本）+ 节点下钻详情弹层（src/components/FlywheelNodeDetail.tsx）
3. **任务市场真实 API 接入（阶段 4）**
   - src/store/taskMarketRemote.ts（zustand + persist）：对接 scripts/task_market_api.py（FastAPI v2 :8000）
   - src/components/RemoteTaskMarket.tsx：连接配置/健康检查/真实任务发布/状态轮询（5s）/任务列表
   - TaskMarket.tsx 增加「模拟市场 / 真实 API 市场」模式切换
   - vite.config.ts 增加 /api → localhost:8000 开发代理（后端无 CORS，同源代理解决）
   - 生产部署需设 VITE_TASK_API_BASE（Cloudflare Pages 无 /api 反代）
4. **首页飞轮入口**：Market.tsx 增加「AI 产业经济飞轮」快捷条（指数/转速/总估值/总资本）

## 已完成（2026-08-15）
1. **三引擎接入前端**：Demand Engine / Production Engine / Economic Ledger
   - src/ai/demandEngine.ts、productionEngine.ts、economicLedger.ts、economy.ts
   - 接入 store/market.ts tick 循环 + Capital 页面三引擎面板
   - 已部署上线，用户已确认看到
2. **真实利润验证**：scripts/verify_profit.py（翻译任务，利润率≈100%）
3. **AI Worker 履约引擎**：scripts/auto_worker.py
   - 单任务：ROI 评估 → DeepSeek 执行 → 精确计费 → SQLite 账本 → 交付
   - 4 任务实测全通过，总收入 ¥203.78，总成本 ¥0.0096
4. **任务市场引擎**：scripts/task_market.py（用户最终选定的核心方向）
   - 企业发布 Task → 4 类能力方（Research/Data LLM Agent + Human Expert/Enterprise Agent 外部池）
   - 竞争报价匹配（能力匹配40% + 价格25% + 信誉25% + 时效10%）
   - 真实 LLM 执行 → AI 评委验收打分 → 复式结算（平台抽成15%）
   - 实测跑通：Research Agent 中标，验收82分，利润 ¥424.98

## 用户核心意图
用户想做「企业发任务 → AI 匹配能力 → 竞争报价 → 执行 → 验收 → 结算」的真实平台，
而非爬 Fiverr/闲鱼。关键词：B2B 任务市场、AI 能力撮合、Human-in-the-loop。

## 下一步方向（待用户确认）
- 把 task_market.py 做成 HTTP API（serve 模式），供前端/企业接入
- 企业端发布任务的前端页面
- Human Expert / Enterprise Agent 的真实接入（webhook 认领）
- 资金托管与合规路径（USDT 智能合约 / 支付宝担保交易）
