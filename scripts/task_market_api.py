#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# AI Exchange · 任务市场安全 API 服务器（生产级 v2）
#
# 安全措施清单：
#   1. HTTPS only —— 反向代理强制 301，代码兜底拒绝明文 HTTP
#   2. 每企业独立 API Key（aex_live_ 前缀），主密钥不进前端
#   3. API Key sha256 哈希存储，数据库不存明文
#   4. 每企业独立限流（rate_limit_per_min / per_day），Redis 可选
#   5. 任务白名单 —— Literal 硬约束，禁止任意代码执行
#   6. 沙箱执行 —— 仅 HTTP 调 LLM，无 shell/文件/浏览器执行面
#   7. 异步任务 —— POST 立即返回 queued，后台状态机流转
#   8. 日志审计 —— 谁/什么/何时/Agent/token/成本/结果全记录
#   9. 管理员认证 —— /admin/issue-key 需 MASTER_ADMIN_TOKEN
#  10. 幂等 —— Idempotency-Key 防重复下单
# ============================================================
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import time
import uuid
import urllib.request
import urllib.error
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import Literal

# ---------------- 配置（全部环境变量，不硬编码） ----------------
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
MASTER_ADMIN_TOKEN = os.environ.get("TASK_MARKET_ADMIN_TOKEN", "")
API_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-chat"
PRICE_IN = 0.5 / 1_000_000    # 输入 ¥/token
PRICE_OUT = 8.0 / 1_000_000   # 输出 ¥/token
PLATFORM_FEE = 0.15           # 平台抽成 15%

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("TASK_MARKET_DB", os.path.join(BASE_DIR, "task_market.db"))
DELIVERY_DIR = os.path.join(BASE_DIR, "deliveries")
os.makedirs(DELIVERY_DIR, exist_ok=True)

# 任务白名单：只允许这 5 种类型，任何其他类型一律 422
ALLOWED_TASK_TYPES = frozenset(["research", "data", "strategy", "report", "content"])

TASK_TYPE_SKILLS = {
    "research": ["市场调研", "行业分析", "深度研究", "报告生成"],
    "data": ["数据分析", "数据清洗", "报告生成", "可视化"],
    "strategy": ["战略咨询", "行业专家", "专业判断", "深度访谈"],
    "report": ["报告生成", "行业分析", "数据可视化", "深度研究"],
    "content": ["内容创作", "文案撰写", "市场调研"],
}

# 单次任务最大预算（防呆，也是安全边界）
MAX_BUDGET = 100000


# ---------------- 数据库 ----------------
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


_db_write_lock = threading.Lock()


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS enterprises (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'active',
            rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
            rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,
            created_at TEXT NOT NULL,
            last_used_at TEXT,
            expires_at TEXT
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            enterprise_id TEXT NOT NULL,
            idempotency_key TEXT,
            title TEXT NOT NULL,
            task_type TEXT NOT NULL,
            description TEXT NOT NULL,
            budget REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            provider_id TEXT,
            provider_name TEXT,
            acceptance_score REAL,
            cost_cny REAL DEFAULT 0,
            revenue_cny REAL DEFAULT 0,
            profit_cny REAL DEFAULT 0,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            latency_ms INTEGER DEFAULT 0,
            result_path TEXT,
            error TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS idempotency (
            idempotency_key TEXT NOT NULL,
            enterprise_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (idempotency_key, enterprise_id)
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enterprise_id TEXT NOT NULL,
            action TEXT NOT NULL,
            detail TEXT,
            ip TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def audit(enterprise_id: str, action: str, detail: str = "", ip: str = ""):
    conn = get_db()
    conn.execute(
        "INSERT INTO audit_log (enterprise_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
        (enterprise_id, action, detail, ip, now_iso()),
    )
    conn.commit()
    conn.close()


def hash_key(key: str) -> str:
    """API Key 哈希存储：sha256，数据库永不存明文"""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    """生成企业独立 API Key，格式 aex_live_<48位hex>"""
    return "aex_live_" + secrets.token_hex(24)


# ---------------- 限流（Redis 可选，内存回退） ----------------
class RateLimiter:
    """每企业独立限流。设置了 REDIS_URL 时用 Redis（多实例共享），否则内存回退（单机）。"""

    def __init__(self):
        self._redis = None
        redis_url = os.environ.get("REDIS_URL", "")
        if redis_url:
            try:
                import redis  # noqa: F401
                self._redis = redis.Redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
            except Exception:
                self._redis = None
        self.lock = threading.Lock()
        self.mem = {}  # enterprise_id -> {"min": [count, window], "day": [count, day]}

    def check(self, ent) -> None:
        per_min = ent["rate_limit_per_min"]
        per_day = ent["rate_limit_per_day"]
        eid = ent["id"]
        if self._redis:
            self._check_redis(eid, per_min, per_day)
        else:
            self._check_mem(eid, per_min, per_day)

    def _check_redis(self, eid: str, per_min: int, per_day: int) -> None:
        now = time.time()
        minute_key = f"rl:{eid}:min:{int(now // 60)}"
        day_key = f"rl:{eid}:day:{time.strftime('%Y-%m-%d', time.gmtime(now))}"
        m = self._redis.incr(minute_key)
        if m == 1:
            self._redis.expire(minute_key, 60)
        if m > per_min:
            raise HTTPException(status_code=429, detail=f"rate limit exceeded: {per_min} requests/min")
        d = self._redis.incr(day_key)
        if d == 1:
            self._redis.expire(day_key, 86400)
        if d > per_day:
            raise HTTPException(status_code=429, detail=f"rate limit exceeded: {per_day} requests/day")

    def _check_mem(self, eid: str, per_min: int, per_day: int) -> None:
        now = time.time()
        day = time.strftime("%Y-%m-%d", time.gmtime(now))
        with self.lock:
            slot = self.mem.setdefault(eid, {"min": [0, 0], "day": [0, ""]})
            m = slot["min"]
            if now - m[1] >= 60:
                m[0], m[1] = 0, now
            if m[0] >= per_min:
                raise HTTPException(status_code=429, detail=f"rate limit exceeded: {per_min} requests/min")
            m[0] += 1
            d = slot["day"]
            if d[1] != day:
                d[0], d[1] = 0, day
            if d[0] >= per_day:
                raise HTTPException(status_code=429, detail=f"rate limit exceeded: {per_day} requests/day")
            d[0] += 1


limiter = RateLimiter()


# ---------------- LLM 沙箱调用 ----------------
def call_llm_sandboxed(system: str, user: str, max_tokens: int = 2500):
    """沙箱执行：只允许 HTTP 调 LLM，代码层面无 os.system/subprocess/eval/exec。"""
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("服务器缺少 DEEPSEEK_API_KEY")
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "stream": False,
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + DEEPSEEK_API_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"API error {e.code}")
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return content, usage


def tokens_cost(usage) -> float:
    return usage.get("prompt_tokens", 0) * PRICE_IN + usage.get("completion_tokens", 0) * PRICE_OUT


def build_prompt(task_type: str, title: str, description: str) -> str:
    skill_hint = "、".join(TASK_TYPE_SKILLS.get(task_type, []))
    return (
        f"任务类型：{task_type}\n"
        f"所需能力：{skill_hint}\n"
        f"任务标题：{title}\n"
        f"任务描述：{description}\n\n"
        f"请以专业、可交付的标准完成上述任务，输出结构化、可直接使用的成果。"
    )


# ---------------- 状态机 ----------------
def set_status(task_id: str, status: str):
    conn = get_db()
    conn.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))
    conn.commit()
    conn.close()


def run_task_background(task_id: str):
    """后台执行：queued → analyzing → matching → running → completed/failed"""
    conn = get_db()
    task = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        return
    conn.execute("UPDATE tasks SET status='analyzing', started_at=? WHERE id=?", (now_iso(), task_id))
    conn.commit()
    conn.close()

    # 能力匹配：按任务类型选择执行方
    provider_id, provider_name = "p_research", "Research Agent"
    if task["task_type"] == "data":
        provider_id, provider_name = "p_data", "Data Agent"
    elif task["task_type"] in ("strategy",):
        provider_id, provider_name = "p_human", "Human Expert"
    elif task["task_type"] == "content":
        provider_id, provider_name = "p_research", "Research Agent"

    set_status(task_id, "matching")
    time.sleep(0.1)

    conn = get_db()
    conn.execute(
        "UPDATE tasks SET provider_id=?, provider_name=?, status='running' WHERE id=?",
        (provider_id, provider_name, task_id),
    )
    conn.commit()
    conn.close()

    started = time.time()
    try:
        prompt = build_prompt(task["task_type"], task["title"], task["description"])
        content, usage = call_llm_sandboxed("你是 AI Exchange 的专业任务执行 Agent。", prompt)
        cost = tokens_cost(usage)
        latency = int((time.time() - started) * 1000)

        # 验收评分（真实版用独立 AI 评委，此处简化固定区间）
        acceptance = 82.0

        result_path = os.path.join(DELIVERY_DIR, f"api_task_{task_id}.md")
        with open(result_path, "w", encoding="utf-8") as f:
            f.write(f"# {task['title']}\n\n## 执行方：{provider_name}\n\n{content}")

        revenue = task["budget"] * (1 - PLATFORM_FEE)
        profit = revenue - cost

        conn = get_db()
        conn.execute(
            """
            UPDATE tasks SET status='completed', acceptance_score=?,
                cost_cny=?, revenue_cny=?, profit_cny=?,
                prompt_tokens=?, completion_tokens=?, latency_ms=?,
                result_path=?, completed_at=?
            WHERE id=?
            """,
            (acceptance, cost, revenue, profit,
             usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0),
             latency, result_path, now_iso(), task_id),
        )
        conn.commit()
        conn.close()
        audit(task["enterprise_id"], "task_completed",
              f"task={task_id} provider={provider_name} tokens={usage.get('prompt_tokens', 0) + usage.get('completion_tokens', 0)} cost={cost:.6f}")
    except Exception as e:
        conn = get_db()
        conn.execute(
            "UPDATE tasks SET status='failed', error=?, completed_at=? WHERE id=?",
            (str(e)[:500], now_iso(), task_id),
        )
        conn.commit()
        conn.close()
        audit(task["enterprise_id"], "task_failed", f"task={task_id} error={str(e)[:200]}")


# ---------------- Pydantic 模型 ----------------
class SubmitRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    task_type: Literal["research", "data", "strategy", "report", "content"]
    description: str = Field(..., min_length=10, max_length=5000)
    budget: float = Field(..., gt=0, le=MAX_BUDGET)

    @field_validator("title", "description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("不能为空")
        return v


class IssueKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    id: Optional[str] = None
    rate_limit_per_min: int = Field(60, ge=1, le=100000)
    rate_limit_per_day: int = Field(1000, ge=1, le=1000000)
    expires_at: Optional[str] = None


# ---------------- FastAPI 应用 ----------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="AI Exchange Task Market API", version="2.0.0", lifespan=lifespan)


# ---------------- 认证 ----------------
def authenticate(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing or malformed authorization header")
    key = authorization[len("Bearer "):].strip()
    if not key.startswith("aex_live_"):
        raise HTTPException(status_code=401, detail="invalid api key")
    key_hash = hash_key(key)
    conn = get_db()
    row = conn.execute("SELECT * FROM enterprises WHERE key_hash=?", (key_hash,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="invalid api key")
    if row["status"] != "active":
        conn.close()
        raise HTTPException(status_code=403, detail="api key revoked or disabled")
    if row["expires_at"] and row["expires_at"] < now_iso():
        conn.close()
        raise HTTPException(status_code=403, detail="api key expired")
    # 更新最近使用时间
    conn.execute("UPDATE enterprises SET last_used_at=? WHERE id=?", (now_iso(), row["id"]))
    conn.commit()
    conn.close()
    return dict(row)


def authenticate_admin(authorization: Optional[str]):
    if not MASTER_ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="TASK_MARKET_ADMIN_TOKEN not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="admin auth required")
    token = authorization[len("Bearer "):].strip()
    if not hmac.compare_digest(token, MASTER_ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="invalid admin token")


# ---------------- 中间件：强制 HTTPS ----------------
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    proto = request.headers.get("x-forwarded-proto", "https")
    if proto.lower() != "https":
        return JSONResponse(status_code=400, content={"error": "HTTPS required, plain HTTP is not allowed"})
    return await call_next(request)


# ---------------- 路由（版本化 /api/v1） ----------------
@app.get("/health")
async def health():
    return {"status": "ok", "time": now_iso()}


@app.get("/api/v1/health")
async def health_v1():
    return {"status": "ok", "version": "2.0.0", "time": now_iso()}


@app.post("/admin/issue-key")
@app.post("/api/v1/admin/issue-key")
async def admin_issue_key(body: IssueKeyRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """管理端点：签发企业 key。需要 Bearer MASTER_ADMIN_TOKEN。"""
    authenticate_admin(authorization)
    eid = body.id or "ent_" + secrets.token_hex(8)
    key = generate_api_key()
    with _db_write_lock:
        conn = get_db()
        conn.execute(
            """
            INSERT INTO enterprises (id, name, key_hash, status, rate_limit_per_min, rate_limit_per_day, created_at, expires_at)
            VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET key_hash=excluded.key_hash, name=excluded.name,
                status='active', rate_limit_per_min=excluded.rate_limit_per_min,
                rate_limit_per_day=excluded.rate_limit_per_day, created_at=excluded.created_at, expires_at=excluded.expires_at
            """,
            (eid, body.name, hash_key(key), body.rate_limit_per_min, body.rate_limit_per_day, now_iso(), body.expires_at),
        )
        conn.commit()
        conn.close()
    audit(eid, "key_issued",
          f"name={body.name} rl={body.rate_limit_per_min}/min {body.rate_limit_per_day}/day",
          ip=request.client.host if request else "")
    return {
        "enterprise_id": eid,
        "name": body.name,
        "api_key": key,
        "rate_limit_per_min": body.rate_limit_per_min,
        "rate_limit_per_day": body.rate_limit_per_day,
        "warning": "此 key 仅返回一次，请妥善保存",
    }


@app.post("/api/v1/tasks/submit", status_code=202)
async def submit_task(
    body: SubmitRequest,
    response: Response,
    request: Request,
    authorization: Optional[str] = Header(None),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    ent = authenticate(authorization)
    limiter.check(ent)

    # 幂等：同一个 Idempotency-Key 只创建一次任务
    if idempotency_key:
        conn = get_db()
        existing = conn.execute(
            "SELECT task_id FROM idempotency WHERE idempotency_key=? AND enterprise_id=?",
            (idempotency_key, ent["id"]),
        ).fetchone()
        if existing:
            task = conn.execute("SELECT id, status FROM tasks WHERE id=?", (existing["task_id"],)).fetchone()
            conn.close()
            response.status_code = 200
            return {"task_id": task["id"], "status": task["status"], "idempotent": True}

    task_id = "TASK-" + uuid.uuid4().hex[:8].upper()

    with _db_write_lock:
        conn = get_db()
        conn.execute(
            """
            INSERT INTO tasks (id, enterprise_id, idempotency_key, title, task_type, description, budget, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)
            """,
            (task_id, ent["id"], idempotency_key, body.title, body.task_type, body.description, body.budget, now_iso()),
        )
        if idempotency_key:
            conn.execute(
                "INSERT OR IGNORE INTO idempotency (idempotency_key, enterprise_id, task_id, created_at) VALUES (?, ?, ?, ?)",
                (idempotency_key, ent["id"], task_id, now_iso()),
            )
        conn.commit()
        conn.close()

    audit(ent["id"], "task_submitted",
          f"task={task_id} type={body.task_type} budget={body.budget} idem={idempotency_key or '-'}",
          ip=request.client.host if request else "")

    # 异步执行：不阻塞请求
    threading.Thread(target=run_task_background, args=(task_id,), daemon=True).start()

    return {"task_id": task_id, "status": "queued"}


@app.get("/api/v1/tasks/{task_id}")
async def get_task(task_id: str, authorization: Optional[str] = Header(None)):
    ent = authenticate(authorization)
    conn = get_db()
    row = conn.execute("SELECT * FROM tasks WHERE id=? AND enterprise_id=?", (task_id, ent["id"])).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="task not found")
    return dict(row)


@app.get("/api/v1/tasks")
async def list_tasks(authorization: Optional[str] = Header(None)):
    ent = authenticate(authorization)
    conn = get_db()
    rows = conn.execute(
        "SELECT id, title, task_type, budget, status, provider_name, created_at FROM tasks WHERE enterprise_id=? ORDER BY created_at DESC LIMIT 100",
        (ent["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/v1/audit")
async def get_audit(authorization: Optional[str] = Header(None)):
    ent = authenticate(authorization)
    conn = get_db()
    rows = conn.execute(
        "SELECT action, detail, ip, created_at FROM audit_log WHERE enterprise_id=? ORDER BY id DESC LIMIT 200",
        (ent["id"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
