# AI Exchange · V3 升级路线图：AI 产业经济飞轮

> ✅ 阶段 1-6 已实施（2026-08-16），阶段 7（部署）待用户确认。

> 目标：把现有「模拟证券交易 + AI Capital OS + B2B 任务市场」升级为一个
> **可运行的 AI 产业经济飞轮闭环**，对应下图：

```
AI资本 → AI企业 → AI IPO → AI Workforce → Agent生产
   ↑                                      ↓
更多资本进入 ← AI资本增长 ← 企业估值 ← AI利润 ← AI收入
```

所有数值仍为**模拟数据**（教育/研究用途），任务市场部分可接真实 LLM 执行。

---

## 阶段 1 · 飞轮数据模型 + 引擎核心（纯前端） ✅

**目标**：定义飞轮 8 节点状态，写一个纯函数引擎，每 tick 依据市场状态推演节点间流量。

- 新增类型：`FlywheelNode` / `FlywheelMetrics` / `FlywheelState`（`src/types.ts`）
- 新增引擎：`src/ai/flywheel.ts`
  - 节点：`capital`(AI资本) / `company`(AI企业) / `ipo`(AI IPO) / `workforce`(AI Workforce) /
    `production`(Agent生产) / `revenue`(AI收入) / `profit`(AI利润) / `valuation`(企业估值)
  - 每 tick：资本 → 企业投资 → IPO 融资 → 雇佣 Workforce → 生产 → 收入 → 利润 → 估值 → 资本增长（回流）
  - 输出飞轮转速（经济活跃度 0-100）与 8 节点实时指标
- 接入 `src/store/market.ts` 的 tick 循环（与 Capital OS 引擎并列）

**验收**：控制台/页面能读到飞轮状态，节点数值随 tick 增长且守恒。

---

## 阶段 2 · 飞轮可视化页面 ✅

**目标**：新增「AI Economy Flywheel」环形飞轮页，可看全貌。

- 新增 `src/pages/Flywheel.tsx`
  - 环形 8 节点流程图（SVG/ECharts 关系图）
  - 每个节点显示实时指标（资本规模/企业数/IPO数/Agent数/收入/利润/估值）
  - 飞轮转速仪表 + 中心总估值
- 路由注册（`src/App.tsx`）+ 导航入口（`src/components/Layout.tsx`）

**验收**：导航可进入飞轮页，节点随 tick 跳动，飞轮转速实时变化。

---

## 阶段 3 · 飞轮节点详情 ✅

**目标**：8 节点可点击下钻，每个节点一个详情视图。

| 节点 | 详情内容 |
|------|---------|
| AI 资本 | 投资机构列表、基金规模、投资流向 |
| AI 企业 | 企业列表、融资轮次、估值、上市进度 |
| AI IPO | 招股书摘要、发行价、认购倍数、挂牌 |
| AI Workforce | Agent 数量、能力分布、工时、雇佣关系 |
| Agent 生产 | 生产任务、完成率、质量评分、产出 |
| AI 收入 | 服务收入/订阅收入/佣金构成、增速 |
| AI 利润 | 利润率、成本结构、留存 vs 分红 |
| 企业估值 | DCF / PE / PS 三模型估值曲线 |

**验收**：飞轮页点击任意节点可进入对应详情，数据与引擎一致。

---

## 阶段 4 · 任务市场真实 API 接入 ✅

**目标**：把本地 `scripts/task_market_api.py`（FastAPI v2）接到前端，形成「企业发任务 → AI 竞标 → 真实执行 → 验收 → 结算」闭环，结算利润回流飞轮。

- 前端新增 `src/store/taskMarketRemote.ts`（fetch 封装，走 `/api/v1/*`）
- 企业端发布任务表单（复用/增强 `TaskMarket.tsx`）
- 能力方竞标 + 状态轮询（queued → executing → reviewing → settled）
- 真实 LLM 执行（后端 DeepSeek，已有 `task_market_api.py`）
- 结算利润写入飞轮 `revenue`/`profit` 节点
- 开发环境代理：`vite.config.ts` 加 `/api` 代理到后端；生产用 `nginx.conf` 反代

**验收**：发布一个真实任务 → 竞标 → 执行 → 结算，前端能看到利润回流飞轮。

---

## 阶段 5 · AI Capital OS 闭环升级（打通全链路） ✅

> 已完成：飞轮「利润 → 估值」传导（利润 × PE 3x 计入企业估值），资本 → 企业 → 劳动力 → 收入 → 利润 → 估值 联动已由飞轮视图层统一呈现。

**目标**：现有 Capital OS（买股票+分红）升级为「资本投资企业 → 企业雇佣 Worker → Worker 生产 → 收入 → 利润 → 估值 → 资本退出/增长」完整飞轮。

- 扩展 `src/ai/capitalOs.ts`：
  - 资本按板块配置**投资 AI 企业**（而非仅持仓股票）
  - 企业用资本雇佣 `workforce` Agent（数量由 `baseLaborUnits` 映射）
  - Agent 承接任务生产 → 产生收入（30% 利润率）
  - 利润 60% 回流资本 / 40% 留存再投资
  - 收入/利润反哺企业估值 → 估值提升 → 资本增值 → 触发更多投资
- 驾驶舱页（`Capital.tsx`）展示「资本 → 企业 → 劳动力 → 收入 → 利润 → 估值」链路状态
- 与阶段 1 飞轮引擎共享同一份状态，避免两套数据

**验收**：启动 Capital OS 后，飞轮 8 节点联动增长，形成可见的正反馈循环。

---

## 阶段 6 · 飞轮仪表盘 + 经济指标聚合 ✅

**目标**：把飞轮指标汇总成「AI 经济总览」，做首页/仪表盘聚合。

- 新增 `src/ai/flywheelDashboard.ts`（聚合：资本总量/总估值/GDP/生产力/飞轮指数）
- 首页 `Market.tsx` 顶部嵌入飞轮指数卡片
- ECharts 多曲线：资本总量、企业总估值、Agent 生产力、飞轮转速
- 与已有 AI GDP（`src/ai/gdp.ts`）打通

**验收**：首页能看到飞轮指数与四条核心曲线。

---

## 阶段 7 · 构建 + 测试 + 部署

- ✅ `npm run build` 通过（tsc 类型检查 + vite build）
- ⬜ `npm run lint` 通过（待跑）
- ⬜ 后端 `pytest`/`test_e2e.py` 通过
- ⬜ 更新 `README.md` 与 `MEMORY.md`（MEMORY 已更新）
- ⬜ 部署到 Cloudflare Pages（前端）+ 后端容器（已有 Dockerfile / docker-compose / nginx）

---

## 建议执行顺序与里程碑

```
阶段1(引擎) → 阶段2(飞轮页) → 阶段3(节点详情)     ← 前端闭环，可先上线
   ↓
阶段4(任务市场 API) → 阶段5(Capital OS 打通)        ← 真实执行 + 全链路
   ↓
阶段6(仪表盘) → 阶段7(构建测试部署)                ← 收口
```

- **里程碑 A**（阶段 1-3）：可视化飞轮可看、可点、可跑。
- **里程碑 B**（阶段 4-5）：真实任务利润回流飞轮，全链路闭环。
- **里程碑 C**（阶段 6-7）：仪表盘聚合 + 上线。

---

## 风险与边界

- **数据守恒**：飞轮节点数值必须由引擎统一驱动，禁止 UI 局部伪造，避免「估值凭空增长」。
- **真实 vs 模拟**：任务市场真实 LLM 执行有成本（DeepSeek token 费），默认模拟模式、可选真实模式。
- **合规**：涉及资金托管/结算时走模拟 USDT + 支付宝担保交易，不碰真实证券/代币合规红线。
