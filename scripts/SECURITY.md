# AI Exchange 任务市场 API · 部署与安全说明

## 8 项安全措施清单

| # | 措施 | 实现 | 验证结果 |
|---|---|---|---|
| 1 | HTTPS only | 中间件检查 `X-Forwarded-Proto`，非 https 返回 400；生产由 Cloudflare/Nginx 强制 301 | ✅ 明文 HTTP → 400 |
| 2 | 每企业独立 API Key | `/admin/issue-key` 签发 `ax_<48hex>`，主密钥 `DEEPSEEK_API_KEY` 只存服务端环境变量 | ✅ 独立 Key 生效 |
| 3 | Key 哈希存储 | 数据库存 `sha256(key)`，明文只返回一次 | ✅ 库内是哈希 |
| 4 | 限流 | 进程内固定窗口：60 req/min + 1000 tasks/day（生产换 Redis） | ✅ 代码已实现 |
| 5 | 任务白名单 | Pydantic `Literal` 限制 5 种类型，非法类型 422 | ✅ `exec` → 422 |
| 6 | 沙箱执行 | 只允许 HTTP 调 LLM，无 `os.system`/`subprocess`/`eval` 调用 | ✅ 无执行面 |
| 7 | 异步任务 | `POST /submit` 立即返回 `{task_id, status:queued}`，后台线程处理 | ✅ 立即返回 |
| 8 | 日志审计 | `audit_log` 表记录谁/什么/何时/Agent/token/成本/结果 | ✅ 3 类日志齐全 |

## 本地启动

```bash
cd scripts
# 需要环境变量 DEEPSEEK_API_KEY
python task_market_api.py
# 监听 http://0.0.0.0:8000
```

## 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/admin/issue-key` | 签发企业 Key（生产需加管理员认证） |
| POST | `/submit` | 提交任务（需 Bearer Key），202 返回 queued |
| GET | `/tasks/{id}` | 查询任务状态 |
| GET | `/tasks` | 任务列表 |
| GET | `/audit` | 审计日志 |

## 生产部署建议

1. **HTTPS 终结**：Cloudflare / Nginx 前面强制 301 https，并传 `X-Forwarded-Proto: https`
2. **限流换 Redis**：多实例部署时进程内限流会失效
3. **Key 签发加管理员认证**：`/admin/issue-key` 需加 master admin token
4. **LLM 沙箱加固**：如需执行代码类任务，用独立 Docker 容器（gVisor/Firecracker），本服务只做纯文本 LLM 调用
5. **数据库**：生产换 PostgreSQL，SQLite 仅单机
6. **密钥管理**：`DEEPSEEK_API_KEY` 放 secrets manager，不写代码/不进镜像
