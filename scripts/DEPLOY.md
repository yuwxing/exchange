# AI Exchange 任务市场 API · 生产部署指南

## 架构

```
客户端（企业）
    │  HTTPS 443
    ▼
Nginx（TLS 终结 + 反向代理，强制 HTTP→HTTPS）
    │  X-Forwarded-Proto: https
    ▼
task_market_api.py（FastAPI :8000）
    │
    ├─ Redis（多实例共享限流，可选）
    ├─ SQLite（单机；生产迁 PostgreSQL）
    └─ DeepSeek API（沙箱内 LLM 调用）
```

公网只暴露 Nginx 的 80/443，`8000` 仅容器内部访问，不对外。

## 一键部署（VPS）

```bash
# 1. 进入 scripts 目录
cd scripts

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填 DEEPSEEK_API_KEY 和 TASK_MARKET_ADMIN_TOKEN
# 生成强管理员令牌：openssl rand -hex 32

# 3. 放置 TLS 证书到 certs/ 目录
mkdir -p certs
# fullchain.pem + privkey.pem（用 Let's Encrypt 签发）

# 4. 启动
docker compose up -d --build
```

## 端点（v2，版本化）

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/api/v1/health` | 无 | 健康检查 |
| POST | `/api/v1/admin/issue-key` | 管理员 Bearer token | 签发企业 Key |
| POST | `/api/v1/tasks/submit` | 企业 `aex_live_` Key | 提交任务（支持 Idempotency-Key），202 返回 queued |
| GET | `/api/v1/tasks/{id}` | 企业 Key | 查询单个任务 |
| GET | `/api/v1/tasks` | 企业 Key | 任务列表 |
| GET | `/api/v1/audit` | 企业 Key | 审计日志 |

## 签发企业 Key

```bash
curl -X POST https://api.exchange.we-aigo.cn/api/v1/admin/issue-key \
  -H "Authorization: Bearer $TASK_MARKET_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "企业A",
    "rate_limit_per_min": 60,
    "rate_limit_per_day": 1000,
    "expires_at": "2027-01-01T00:00:00Z"
  }'
```

返回的 `api_key` 只显示一次，数据库只存 sha256 哈希。

## 企业提交任务（幂等）

```bash
curl -X POST https://api.exchange.we-aigo.cn/api/v1/tasks/submit \
  -H "Authorization: Bearer aex_live_xxx" \
  -H "Idempotency-Key: order-20260815-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "2026 AI 芯片市场调研",
    "task_type": "research",
    "description": "调研市场规模、玩家、技术路线与趋势",
    "budget": 800
  }'
```

状态机：`queued → analyzing → matching → running → completed / failed`

## 安全措施对照

| # | 措施 | 实现位置 |
|---|---|---|
| 1 | HTTPS only | nginx.conf 301 + 中间件拒绝明文 |
| 2 | 每企业独立 Key | `aex_live_` 前缀，主密钥仅环境变量 |
| 3 | Key 哈希存储 | `hash_key()` sha256 |
| 4 | 每企业独立限流 | enterprises.rate_limit_per_min/day + Redis |
| 5 | 任务白名单 | Pydantic Literal 5 类型 |
| 6 | 沙箱执行 | 仅 HTTP 调 LLM |
| 7 | 异步任务 | 后台线程 + 状态机 |
| 8 | 日志审计 | audit_log 表 |
| 9 | 管理员认证 | MASTER_ADMIN_TOKEN + hmac 比较 |
| 10 | 幂等 | Idempotency-Key + idempotency 表 |

## 生产加固 TODO

- [ ] SQLite → PostgreSQL（多实例 + 高并发）
- [ ] uvicorn 多 worker（当前 1 worker，因 SQLite 写锁）
- [ ] Key 轮换 / 吊销管理端点
- [ ] 验收改独立 AI 评委（当前固定 82）
- [ ] 监控告警（Sentry / Prometheus）
