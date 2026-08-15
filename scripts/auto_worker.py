# ============================================================
# AI Exchange · AI Worker 自动履约引擎（真实运行版）
# 这不是模拟器——真的调用 DeepSeek API，真的算 token 成本，
# 真的记录收支到 SQLite 账本，真的输出交付物。
#
# 架构：
#   TaskQueue (SQLite)  ← 任务进来（API / CLI / 适配器）
#        ↓
#   AI Worker Daemon     ← 轮询队列，评估 ROI，执行，记账
#        ↓
#   Economic Ledger      ← 每笔收入/成本/利润真实记录
#        ↓
#   Delivery             ← 交付物写入文件，状态回写
#
# 用法：
#   python scripts/auto_worker.py serve     # 启动 HTTP API + Worker
#   python scripts/auto_worker.py worker    # 只启动 Worker
#   python scripts/auto_worker.py submit --type translation --source "你好世界"
#   python scripts/auto_worker.py stats     # 查看账本统计
# ============================================================

import json
import os
import sqlite3
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

# ---- 配置 ----
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
# DeepSeek 定价（人民币/百万 token）
PRICE_INPUT_PER_M = 0.5   # ¥0.5/M input
PRICE_OUTPUT_PER_M = 8.0  # ¥8/M output
# 汇率
USD_TO_CNY = 7.15

DB_PATH = os.path.join(os.path.dirname(__file__), "auto_worker.db")

# ---- 任务类型定义（真实市场定价）----
TASK_TYPES = {
    "translation": {
        "label": "中英翻译",
        "market_price_usd": 5.0,      # Fiverr 翻译均价
        "price_unit": "per_task",
        "desc": "中文→英文商业翻译",
    },
    "summarize": {
        "label": "文章摘要",
        "market_price_usd": 3.5,
        "price_unit": "per_task",
        "desc": "长文提取核心摘要",
    },
    "copywriting": {
        "label": "文案撰写",
        "market_price_usd": 8.0,
        "price_unit": "per_task",
        "desc": "营销文案 / 产品描述",
    },
    "code_review": {
        "label": "代码审查",
        "market_price_usd": 12.0,
        "price_unit": "per_task",
        "desc": "审查代码并输出改进建议",
    },
}

# ============================================================
# 数据库初始化
# ============================================================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',   -- pending / running / done / failed / rejected
            source TEXT NOT NULL,             -- 输入内容
            output TEXT,                      -- AI 产出
            market_price_usd REAL,            -- 预期收入
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            cost_cny REAL DEFAULT 0,          -- 算力成本
            revenue_cny REAL DEFAULT 0,       -- 收入（人民币折算）
            profit_cny REAL DEFAULT 0,        -- 利润
            roi REAL DEFAULT 0,               -- 投入产出比
            latency_ms INTEGER DEFAULT 0,     -- 执行耗时
            created_at TEXT,
            started_at TEXT,
            completed_at TEXT,
            error TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            type TEXT NOT NULL,               -- revenue / cost / profit
            amount_cny REAL NOT NULL,
            memo TEXT,
            ts TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


# ============================================================
# TaskQueue：任务队列
# ============================================================
class TaskQueue:
    def __init__(self):
        init_db()

    def submit(self, task_type: str, source: str) -> dict:
        if task_type not in TASK_TYPES:
            return {"ok": False, "error": f"未知任务类型: {task_type}"}
        price = TASK_TYPES[task_type]["market_price_usd"]
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "INSERT INTO tasks (type, status, source, market_price_usd, created_at) VALUES (?,?,?,?,?)",
            (task_type, "pending", source, price, now_str()),
        )
        task_id = c.lastrowid
        conn.commit()
        conn.close()
        return {"ok": True, "task_id": task_id, "type": task_type, "price_usd": price}

    def fetch_pending(self) -> dict | None:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute(
            "SELECT * FROM tasks WHERE status='pending' ORDER BY created_at LIMIT 1"
        )
        row = c.fetchone()
        if row:
            c.execute(
                "UPDATE tasks SET status='running', started_at=? WHERE id=?",
                (now_str(), row["id"]),
            )
            conn.commit()
        conn.close()
        return dict(row) if row else None

    def complete(self, task_id: int, output: str, input_tokens: int, output_tokens: int,
                 cost_cny: float, revenue_cny: float, profit_cny: float, roi: float, latency_ms: int):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            """UPDATE tasks SET status='done', output=?, input_tokens=?, output_tokens=?,
               cost_cny=?, revenue_cny=?, profit_cny=?, roi=?, latency_ms=?, completed_at=?
               WHERE id=?""",
            (output, input_tokens, output_tokens, cost_cny, revenue_cny, profit_cny, roi, latency_ms, now_str(), task_id),
        )
        # 记三笔账
        for t, amt, memo in [
            ("revenue", revenue_cny, f"任务#{task_id} 收入"),
            ("cost", -cost_cny, f"任务#{task_id} 算力成本"),
            ("profit", profit_cny, f"任务#{task_id} 利润"),
        ]:
            c.execute(
                "INSERT INTO ledger (task_id, type, amount_cny, memo, ts) VALUES (?,?,?,?,?)",
                (task_id, t, amt, memo, now_str()),
            )
        conn.commit()
        conn.close()

    def fail(self, task_id: int, error: str):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "UPDATE tasks SET status='failed', error=?, completed_at=? WHERE id=?",
            (error, now_str(), task_id),
        )
        conn.commit()
        conn.close()

    def reject(self, task_id: int, reason: str):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "UPDATE tasks SET status='rejected', error=?, completed_at=? WHERE id=?",
            (reason, now_str(), task_id),
        )
        conn.commit()
        conn.close()

    def stats(self) -> dict:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as n FROM tasks")
        total = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM tasks WHERE status='done'")
        done = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM tasks WHERE status='pending'")
        pending = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM tasks WHERE status='running'")
        running = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM tasks WHERE status='failed'")
        failed = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM tasks WHERE status='rejected'")
        rejected = c.fetchone()["n"]
        c.execute("SELECT COALESCE(SUM(revenue_cny),0) as s FROM tasks WHERE status='done'")
        revenue = c.fetchone()["s"]
        c.execute("SELECT COALESCE(SUM(cost_cny),0) as s FROM tasks WHERE status='done'")
        cost = c.fetchone()["s"]
        c.execute("SELECT COALESCE(SUM(profit_cny),0) as s FROM tasks WHERE status='done'")
        profit = c.fetchone()["s"]
        c.execute("SELECT COALESCE(SUM(latency_ms),0)/MAX(1,COUNT(*)) as avg FROM tasks WHERE status='done'")
        avg_ms = c.fetchone()["avg"]
        conn.close()
        return {
            "total": total, "done": done, "pending": pending,
            "running": running, "failed": failed, "rejected": rejected,
            "revenue_cny": round(revenue, 4),
            "cost_cny": round(cost, 6),
            "profit_cny": round(profit, 4),
            "margin_pct": round((profit / revenue * 100), 2) if revenue > 0 else 0,
            "avg_latency_ms": avg_ms,
        }


# ============================================================
# AI Worker：调用 DeepSeek API 执行任务
# ============================================================
def call_deepseek(prompt: str, system: str = "") -> dict:
    """真实调用 DeepSeek API，返回 {text, input_tokens, output_tokens, cost_cny}"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    }
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = json.dumps({
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": 0.3,
    }).encode()

    req = urllib.request.Request(DEEPSEEK_URL, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())

    text = data["choices"][0]["message"]["content"]
    usage = data["usage"]
    in_tok = usage["prompt_tokens"]
    out_tok = usage["completion_tokens"]
    cost = (in_tok / 1_000_000 * PRICE_INPUT_PER_M) + (out_tok / 1_000_000 * PRICE_OUTPUT_PER_M)
    return {
        "text": text,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "cost_cny": round(cost, 6),
    }


# ---- 任务执行模板 ----
def build_prompt(task_type: str, source: str) -> tuple[str, str]:
    """返回 (system_prompt, user_prompt)"""
    templates = {
        "translation": (
            "你是专业商业翻译。将以下中文翻译成地道、流畅的英文。保持原文的商业语气和格式。只输出译文，不要加注释。",
            source,
        ),
        "summarize": (
            "你是专业内容分析师。阅读以下文本，提取 3-5 条核心要点，每条不超过 50 字。格式：\n• 要点1\n• 要点2\n...",
            f"请总结以下内容：\n\n{source}",
        ),
        "copywriting": (
            "你是资深营销文案专家。根据以下需求撰写一段有吸引力的产品文案，150-300字，包含标题和正文。",
            source,
        ),
        "code_review": (
            "你是高级代码审查工程师。审查以下代码，指出：1) 潜在 Bug 2) 性能问题 3) 改进建议。用中文输出，结构化格式。",
            f"请审查以下代码：\n\n```\n{source}\n```",
        ),
    }
    return templates.get(task_type, ("完成以下任务。", source))


def estimate_cost(task_type: str, source: str) -> float:
    """预估算力成本（人民币）——粗略估算：输入 token × 输入价 + 预估输出 × 输出价"""
    est_input = len(source) * 1.3  # 中文约 1.3 token/字
    est_output = {
        "translation": len(source) * 0.6,
        "summarize": 200,
        "copywriting": 400,
        "code_review": 600,
    }.get(task_type, 300)
    cost = (est_input / 1_000_000 * PRICE_INPUT_PER_M) + (est_output / 1_000_000 * PRICE_OUTPUT_PER_M)
    return round(cost, 6)


def evaluate_roi(task_type: str, source: str) -> dict:
    """ROI 评估：预期收入 vs 预估算力成本"""
    price_usd = TASK_TYPES[task_type]["market_price_usd"]
    revenue_cny = price_usd * USD_TO_CNY
    est_cost = estimate_cost(task_type, source)
    profit = revenue_cny - est_cost
    roi = revenue_cny / est_cost if est_cost > 0 else 999
    return {
        "accept": profit > 0,
        "revenue_cny": round(revenue_cny, 2),
        "est_cost_cny": est_cost,
        "est_profit_cny": round(profit, 2),
        "roi": round(roi, 1),
    }


# ============================================================
# Worker Daemon：轮询 → 评估 → 执行 → 记账
# ============================================================
def run_worker_loop(poll_interval: float = 3.0):
    queue = TaskQueue()
    print("🤖 AI Worker Daemon 已启动")
    print(f"   轮询间隔: {poll_interval}s")
    print(f"   数据库: {DB_PATH}")
    print(f"   API: DeepSeek ({DEEPSEEK_MODEL})")
    print(f"   定价: 输入 ¥{PRICE_INPUT_PER_M}/M · 输出 ¥{PRICE_OUTPUT_PER_M}/M")
    print(f"   支持任务: {', '.join(TASK_TYPES.keys())}")
    print("-" * 60)

    while True:
        try:
            task = queue.fetch_pending()
            if not task:
                time.sleep(poll_interval)
                continue

            tid = task["id"]
            ttype = task["type"]
            source = task["source"]
            print(f"\n📥 取到任务 #{tid} [{TASK_TYPES[ttype]['label']}]")

            # ① ROI 评估
            roi = evaluate_roi(ttype, source)
            if not roi["accept"]:
                print(f"   ❌ ROI 不达标，拒绝 (预期收入 ¥{roi['revenue_cny']} < 成本 ¥{roi['est_cost_cny']})")
                queue.reject(tid, f"ROI不达标: 预期利润 ¥{roi['est_profit_cny']}")
                continue
            print(f"   ✅ ROI 通过: 预期收入 ¥{roi['revenue_cny']} · 预估成本 ¥{roi['est_cost_cny']} · ROI {roi['roi']}x")

            # ② 真实执行
            system_prompt, user_prompt = build_prompt(ttype, source)
            print(f"   ⏳ 调用 DeepSeek API 执行中...")
            t0 = time.time()
            try:
                result = call_deepseek(user_prompt, system_prompt)
            except Exception as e:
                print(f"   💥 API 调用失败: {e}")
                queue.fail(tid, str(e))
                continue
            latency = int((time.time() - t0) * 1000)

            # ③ 真实记账
            actual_cost = result["cost_cny"]
            revenue_cny = roi["revenue_cny"]
            profit_cny = round(revenue_cny - actual_cost, 4)
            actual_roi = round(revenue_cny / actual_cost, 1) if actual_cost > 0 else 999

            queue.complete(
                tid, result["text"],
                result["input_tokens"], result["output_tokens"],
                actual_cost, revenue_cny, profit_cny, actual_roi, latency,
            )

            print(f"   ✅ 完成! 耗时 {latency}ms")
            print(f"   📊 tokens: 输入{result['input_tokens']} + 输出{result['output_tokens']}")
            print(f"   💰 收入 ¥{revenue_cny} - 成本 ¥{actual_cost} = 利润 ¥{profit_cny} (ROI {actual_roi}x)")
            print(f"   📄 交付: {result['text'][:80]}...")

            # 保存交付物
            delivery_dir = os.path.join(os.path.dirname(__file__), "deliveries")
            os.makedirs(delivery_dir, exist_ok=True)
            with open(os.path.join(delivery_dir, f"task_{tid}.txt"), "w", encoding="utf-8") as f:
                f.write(result["text"])

        except KeyboardInterrupt:
            print("\n🛑 Worker 已停止")
            break
        except Exception as e:
            print(f"⚠️ Worker 异常: {e}")
            time.sleep(poll_interval)


# ============================================================
# HTTP API：接收任务提交
# ============================================================
class APIHandler(BaseHTTPRequestHandler):
    queue = TaskQueue()

    def do_POST(self):
        if self.path == "/submit":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._json(400, {"ok": False, "error": "Invalid JSON"})
                return
            ttype = data.get("type", "")
            source = data.get("source", "")
            if not source:
                self._json(400, {"ok": False, "error": "source is required"})
                return
            result = self.queue.submit(ttype, source)
            self._json(200, result)
        else:
            self._json(404, {"ok": False, "error": "Not found"})

    def do_GET(self):
        if self.path == "/stats":
            self._json(200, self.queue.stats())
        else:
            self._json(404, {"ok": False, "error": "Not found"})

    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # 静默日志


def run_server(port: int = 8788):
    server = HTTPServer(("0.0.0.0", port), APIHandler)
    print(f"🌐 HTTP API 已启动: http://localhost:{port}")
    print(f"   POST /submit  {{\"type\": \"translation\", \"source\": \"要翻译的文本\"}}")
    print(f"   GET  /stats   查看账本统计")
    server.serve_forever()


# ============================================================
# CLI 入口
# ============================================================
def cli_submit(args):
    """提交任务"""
    # 解析 --type 和 --source
    ttype = "translation"
    source = ""
    i = 0
    while i < len(args):
        if args[i] == "--type" and i + 1 < len(args):
            ttype = args[i + 1]
            i += 2
        elif args[i] == "--source" and i + 1 < len(args):
            source = args[i + 1]
            i += 2
        else:
            i += 1
    if not source and not sys.stdin.isatty():
        source = sys.stdin.read()
    if not source:
        print('用法: python auto_worker.py submit --type translation --source "要翻译的文本"')
        return
    if not source:
        print("❌ source 不能为空")
        return
    queue = TaskQueue()
    r = queue.submit(ttype, source)
    if r["ok"]:
        print(f"✅ 任务已提交 #{r['task_id']} [{ttype}] 预期收入 ${r['price_usd']}")
        print(f"   等待 Worker 处理...")
    else:
        print(f"❌ 提交失败: {r['error']}")


def cli_stats():
    """查看统计"""
    s = TaskQueue().stats()
    print("=" * 50)
    print("AI Worker · 经济账本统计")
    print("=" * 50)
    print(f"  总任务:   {s['total']}")
    print(f"  ✅ 完成:  {s['done']}")
    print(f"  ⏳ 待处理: {s['pending']}")
    print(f"  🔄 进行中: {s['running']}")
    print(f"  ❌ 失败:  {s['failed']}")
    print(f"  🚫 拒绝:  {s['rejected']}")
    print(f"  ─────────────────────")
    print(f"  总收入:   ¥{s['revenue_cny']}")
    print(f"  总成本:   ¥{s['cost_cny']}")
    print(f"  总利润:   ¥{s['profit_cny']}")
    print(f"  利润率:   {s['margin_pct']}%")
    print(f"  平均耗时: {s['avg_latency_ms']}ms")
    print("=" * 50)


def cli_serve(port=8788):
    """启动 HTTP API + Worker（双线程）"""
    import threading
    # Worker 在后台线程跑
    wt = threading.Thread(target=run_worker_loop, daemon=True)
    wt.start()
    # 主线程跑 HTTP
    run_server(port)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "serve":
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 8788
        cli_serve(port)
    elif cmd == "worker":
        run_worker_loop()
    elif cmd == "submit":
        cli_submit(sys.argv[2:])
    elif cmd == "stats":
        cli_stats()
    else:
        print("""
AI Exchange · AI Worker 自动履约引擎

用法:
  python scripts/auto_worker.py serve              启动 HTTP API + Worker
  python scripts/auto_worker.py worker             只启动 Worker 守护进程
  python scripts/auto_worker.py submit --type translation --source "要翻译的文本"
  python scripts/auto_worker.py stats              查看账本统计

支持的任务类型:
  translation  中英翻译      市场价 $5.0/单
  summarize    文章摘要      市场价 $3.5/单
  copywriting  文案撰写      市场价 $8.0/单
  code_review  代码审查      市场价 $12.0/单
""")
