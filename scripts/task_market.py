#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# AI Exchange · 任务市场引擎（Task Market）
# 企业发布 Task → 能力寻找 → 竞争/报价/匹配 → 执行 → 验收 → 结算
# 纯本地可运行：真实调用 DeepSeek API 执行任务、AI 评委验收、
# SQLite 复式记账。Human Expert / Enterprise Agent 作为外部能力池接入。
# ============================================================
import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

# ---------------- 配置 ----------------
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
API_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-chat"
PRICE_IN = 0.5 / 1_000_000    # 输入 ¥/token
PRICE_OUT = 8.0 / 1_000_000   # 输出 ¥/token
PLATFORM_FEE = 0.15           # 平台抽成 15%

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "task_market.db")
DELIVERY_DIR = os.path.join(BASE_DIR, "deliveries")

# 任务类型 → 所需能力标签（用于能力匹配）
TASK_TYPE_SKILLS = {
    "research": ["市场调研", "行业分析", "深度研究", "报告生成"],
    "data": ["数据分析", "数据清洗", "报告生成", "可视化"],
    "strategy": ["战略咨询", "行业专家", "专业判断", "深度访谈"],
    "report": ["报告生成", "行业分析", "数据可视化", "深度研究"],
    "content": ["内容创作", "文案撰写", "市场调研"],
}

# 默认能力提供方（4 种）
DEFAULT_PROVIDERS = [
    {
        "id": "p_research", "name": "Research Agent", "type": "llm",
        "skills": ["市场调研", "行业分析", "竞品研究", "趋势预测", "深度研究", "报告生成"],
        "price_factor": 0.7, "quality": 88, "eta_base": 180,
    },
    {
        "id": "p_data", "name": "Data Agent", "type": "llm",
        "skills": ["数据分析", "数据清洗", "报告生成", "可视化", "市场调研"],
        "price_factor": 0.6, "quality": 85, "eta_base": 120,
    },
    {
        "id": "p_human", "name": "Human Expert", "type": "external",
        "skills": ["行业专家", "战略咨询", "深度访谈", "专业判断", "行业分析"],
        "price_factor": 1.3, "quality": 92, "eta_base": 3600,
    },
    {
        "id": "p_enterprise", "name": "Enterprise Agent", "type": "external",
        "skills": ["企业私有知识", "内部数据", "定制化方案", "深度研究", "行业分析"],
        "price_factor": 0.9, "quality": 80, "eta_base": 600,
    },
]


# ---------------- LLM 调用 ----------------
def call_llm(system, user, max_tokens=2500, temperature=0.4):
    """调用 DeepSeek API，返回 (content, usage_dict)"""
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY 环境变量")
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
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
        raise RuntimeError(f"API 错误 {e.code}: {e.read().decode('utf-8')[:300]}")
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return content, usage


def tokens_cost(usage):
    return usage.get("prompt_tokens", 0) * PRICE_IN + usage.get("completion_tokens", 0) * PRICE_OUT


# ---------------- 数据库 ----------------
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS providers(
      id TEXT PRIMARY KEY, name TEXT, type TEXT, skills TEXT,
      price_factor REAL, quality REAL, eta_base INTEGER,
      wins INTEGER DEFAULT 0, revenue REAL DEFAULT 0, reviews REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT,
      type TEXT, budget REAL, required_skills TEXT,
      status TEXT DEFAULT 'open', winner_id TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS bids(
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, provider_id TEXT,
      price REAL, eta INTEGER, confidence REAL, match_score REAL,
      final_score REAL, status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS executions(
      task_id INTEGER PRIMARY KEY, provider_id TEXT, output TEXT,
      quality_score REAL, feedback TEXT, latency_ms INTEGER,
      cost_cny REAL, status TEXT
    );
    CREATE TABLE IF NOT EXISTS ledger(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, task_id INTEGER,
      provider_id TEXT, kind TEXT, amount_cny REAL, note TEXT
    );
    """)
    conn.commit()
    conn.close()


def seed_providers():
    conn = db()
    for p in DEFAULT_PROVIDERS:
        conn.execute(
            "INSERT OR IGNORE INTO providers(id,name,type,skills,price_factor,quality,eta_base) VALUES(?,?,?,?,?,?,?)",
            (p["id"], p["name"], p["type"], json.dumps(p["skills"], ensure_ascii=False),
             p["price_factor"], p["quality"], p["eta_base"]),
        )
    conn.commit()
    conn.close()


# ---------------- 任务发布 ----------------
def create_task(title, description, ttype, budget):
    skills = TASK_TYPE_SKILLS.get(ttype, ["通用能力"])
    conn = db()
    cur = conn.execute(
        "INSERT INTO tasks(title,description,type,budget,required_skills,created_at) VALUES(?,?,?,?,?,?)",
        (title, description, ttype, budget, json.dumps(skills, ensure_ascii=False),
         datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
    )
    conn.commit()
    tid = cur.lastrowid
    conn.close()
    return tid


# ---------------- 竞争 / 报价 / 匹配 ----------------
def open_bids(task_id):
    """为所有 provider 生成报价（能力匹配度 × 价格 × 信誉）"""
    conn = db()
    task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not task:
        conn.close()
        return []
    required = json.loads(task["required_skills"])
    providers = conn.execute("SELECT * FROM providers").fetchall()

    bids = []
    for p in providers:
        pskills = json.loads(p["skills"])
        overlap = len(set(required) & set(pskills))
        match = overlap / len(required) if required else 0
        price = round(task["budget"] * p["price_factor"], 2)
        eta = p["eta_base"]
        confidence = round(0.6 + 0.35 * match, 3)
        bids.append((p, price, eta, confidence, match))

    # 归一化计算综合得分
    if bids:
        min_price = min(b[1] for b in bids)
        min_eta = min(b[2] for b in bids)
        scored = []
        for p, price, eta, conf, match in bids:
            price_score = min_price / max(price, 1e-6)
            eta_score = min_eta / max(eta, 1e-6)
            quality_score = p["quality"] / 100.0
            final = round(0.40 * match + 0.25 * price_score + 0.25 * quality_score + 0.10 * eta_score, 4)
            scored.append((p["id"], p["name"], p["type"], price, eta, conf, round(match, 3), final))

        # 写 bids 表
        for s in scored:
            conn.execute(
                "INSERT INTO bids(task_id,provider_id,price,eta,confidence,match_score,final_score) VALUES(?,?,?,?,?,?,?)",
                (task_id, s[0], s[3], s[4], s[5], s[6], s[7]),
            )
        conn.commit()
    conn.close()
    return bids


def pick_winner(task_id, strategy="auto"):
    """按策略选出中标 provider"""
    conn = db()
    bids = conn.execute("SELECT * FROM bids WHERE task_id=? AND status='pending'", (task_id,)).fetchall()
    if not bids:
        conn.close()
        return None
    if strategy == "cheapest":
        best = min(bids, key=lambda b: b["price"])
    elif strategy == "quality":
        best = max(bids, key=lambda b: b["match_score"] * 100 + b["confidence"] * 20)
    else:  # auto：综合得分
        best = max(bids, key=lambda b: b["final_score"])
    conn.execute("UPDATE bids SET status='lost' WHERE task_id=? AND id<>?", (task_id, best["id"]))
    conn.execute("UPDATE bids SET status='won' WHERE id=?", (best["id"],))
    conn.execute("UPDATE tasks SET status='assigned', winner_id=? WHERE id=?", (best["provider_id"], task_id))
    conn.commit()
    conn.close()
    return best


# ---------------- 执行 ----------------
def execute_task(task_id):
    conn = db()
    task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not task or not task["winner_id"]:
        conn.close()
        return
    provider = conn.execute("SELECT * FROM providers WHERE id=?", (task["winner_id"],)).fetchone()
    conn.close()

    t0 = time.time()
    if provider["type"] == "llm":
        # 真实调用 LLM 执行
        system = {
            "research": "你是资深市场研究分析师，输出结构化的市场调研报告（含市场规模、趋势、竞争格局、结论）。",
            "data": "你是资深数据分析专家，输出结构化的数据分析报告（含数据解读、关键指标、结论建议）。",
            "report": "你是专业报告撰写专家，输出结构清晰、可交付的正式报告。",
            "content": "你是资深内容策划，输出可直接使用的文案内容。",
            "strategy": "你是战略咨询顾问，输出结构化的战略建议。",
        }.get(task["type"], "你是专业 AI 顾问，输出高质量、结构化的交付成果。")
        user = f"任务标题：{task['title']}\n任务描述：{task['description']}\n\n请输出可直接交付的成果。"
        output, usage = call_llm(system, user)
        cost = tokens_cost(usage)
        status = "executed"
    else:
        output = f"[外部能力池] 已指派 {provider['name']}（{provider['type']}），等待外部交付。"
        cost = 0.0
        status = "assigned_external"

    latency = int((time.time() - t0) * 1000)

    # 保存交付物
    os.makedirs(DELIVERY_DIR, exist_ok=True)
    fname = os.path.join(DELIVERY_DIR, f"market_task_{task_id}.md")
    with open(fname, "w", encoding="utf-8") as f:
        f.write(f"# Task #{task_id} · {task['title']}\n\n## 执行方：{provider['name']}\n\n{output}\n")

    conn = db()
    conn.execute(
        "INSERT OR REPLACE INTO executions(task_id,provider_id,output,latency_ms,cost_cny,status) VALUES(?,?,?,?,?,?)",
        (task_id, provider["id"], output, latency, round(cost, 6), status),
    )
    conn.execute("UPDATE tasks SET status=? WHERE id=?", (status if status == "assigned_external" else "reviewing", task_id))
    conn.commit()
    conn.close()


# ---------------- 验收（AI 评委） ----------------
def review_task(task_id):
    conn = db()
    task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    ex = conn.execute("SELECT * FROM executions WHERE task_id=?", (task_id,)).fetchone()
    if not task or not ex:
        conn.close()
        return
    if ex["status"] == "assigned_external":
        # 外部交付需人工验收
        conn.execute(
            "UPDATE executions SET quality_score=NULL, feedback='待人工验收', status='pending_human' WHERE task_id=?",
            (task_id,),
        )
        conn.execute("UPDATE tasks SET status='pending_review' WHERE id=?", (task_id,))
        conn.commit()
        conn.close()
        return

    # AI 评委打分（真实调用 LLM）
    system = (
        "你是严格的质检评委。根据任务需求和交付物质量，给出 0-100 的整数分数。"
        "评分标准：完整性30分、准确性30分、可交付性20分、结构清晰20分。"
        "严格打分，不要放水。"
    )
    user = (
        f"任务需求：{task['title']}\n{task['description']}\n\n"
        f"交付物：\n{ex['output'][:4000]}\n\n"
        "请只输出一行：先一个 0-100 的整数分数，然后一个空格，再写一句简短评语。"
    )
    try:
        verdict, usage = call_llm(system, user, max_tokens=200, temperature=0.1)
    except Exception as e:
        verdict = f"50 验收失败：{e}"
    m = re.search(r"\b(\d{1,3})\b", verdict)
    score = int(m.group(1)) if m else 0
    score = max(0, min(100, score))
    passed = score >= 60

    conn.execute(
        "UPDATE executions SET quality_score=?, feedback=?, status=? WHERE task_id=?",
        (score, verdict.strip(), "passed" if passed else "failed", task_id),
    )
    conn.execute("UPDATE tasks SET status=? WHERE id=?", ("settled" if passed else "failed", task_id))
    conn.commit()
    conn.close()


# ---------------- 结算 ----------------
def settle_task(task_id):
    conn = db()
    task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    ex = conn.execute("SELECT * FROM executions WHERE task_id=?", (task_id,)).fetchone()
    if not task or not ex:
        conn.close()
        return
    provider = conn.execute("SELECT * FROM providers WHERE id=?", (task["winner_id"],)).fetchone()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if ex["status"] == "pending_human":
        # 外部交付未验收，暂不结算
        conn.close()
        return

    budget = task["budget"]
    platform_fee = round(budget * PLATFORM_FEE, 2)
    provider_revenue = round(budget - platform_fee, 2)
    provider_cost = round(ex["cost_cny"] or 0, 6)
    provider_profit = round(provider_revenue - provider_cost, 2)
    platform_profit = platform_fee

    entries = [
        (task_id, provider["id"], "task_income", budget, "企业支付预算"),
        (task_id, provider["id"], "platform_fee", platform_fee, "平台抽成 15%"),
        (task_id, provider["id"], "provider_revenue", provider_revenue, "执行方收入"),
        (task_id, provider["id"], "provider_cost", provider_cost, "算力成本"),
        (task_id, provider["id"], "provider_profit", provider_profit, "执行方利润"),
        (task_id, provider["id"], "platform_profit", platform_profit, "平台利润"),
    ]
    for e in entries:
        conn.execute(
            "INSERT INTO ledger(ts,task_id,provider_id,kind,amount_cny,note) VALUES(?,?,?,?,?,?)",
            (ts, e[0], e[1], e[2], e[3], e[4]),
        )

    # 更新 provider 信誉（滑动平均）
    if ex["quality_score"] is not None:
        new_q = round(provider["quality"] * 0.9 + ex["quality_score"] * 0.1, 1)
        conn.execute(
            "UPDATE providers SET quality=?, wins=wins+1, revenue=revenue+?, reviews=reviews+? WHERE id=?",
            (new_q, provider_revenue, ex["quality_score"], provider["id"]),
        )
    conn.commit()
    conn.close()


# ---------------- 市场一轮 ----------------
def run_market_cycle(strategy="auto"):
    conn = db()
    open_tasks = [r["id"] for r in conn.execute("SELECT id FROM tasks WHERE status='open'").fetchall()]
    conn.close()
    results = []
    for tid in open_tasks:
        open_bids(tid)
        winner = pick_winner(tid, strategy)
        if not winner:
            continue
        execute_task(tid)
        review_task(tid)
        settle_task(tid)
        results.append(tid)
    return results


# ---------------- 统计看板 ----------------
def market_stats():
    conn = db()
    providers = conn.execute("SELECT * FROM providers").fetchall()
    print("=" * 62)
    print("AI Exchange · 任务市场 · 能力提供方看板")
    print("=" * 62)
    print(f"{'能力方':<18}{'类型':<10}{'中标':<6}{'累计收入':<12}{'信誉分':<8}{'均验收':<8}")
    print("-" * 62)
    for p in providers:
        avg_review = round(p["reviews"] / p["wins"], 1) if p["wins"] else "-"
        print(f"{p['name']:<18}{p['type']:<10}{p['wins']:<6}¥{p['revenue']:<11.2f}{p['quality']:<8}{avg_review!s:<8}")

    print()
    tasks = conn.execute("SELECT * FROM tasks ORDER BY id").fetchall()
    print(f"{'任务':<6}{'标题':<24}{'预算':<10}{'状态':<18}{'中标方'}")
    print("-" * 62)
    for t in tasks:
        winner = conn.execute("SELECT name FROM providers WHERE id=?", (t["winner_id"],)).fetchone()
        print(f"#{t['id']:<5}{t['title'][:22]:<24}¥{t['budget']:<9.2f}{t['status']:<18}{(winner['name'] if winner else '-')}")

    # 账本汇总
    print()
    print("── 经济账本汇总（全市场）──")
    rows = conn.execute("SELECT kind, SUM(amount_cny) s FROM ledger GROUP BY kind").fetchall()
    total_income = total_cost = total_profit = 0
    kind_label = {
        "task_income": "企业支付（收入）", "platform_fee": "平台抽成", "provider_revenue": "执行方收入",
        "provider_cost": "算力成本", "provider_profit": "执行方利润", "platform_profit": "平台利润",
    }
    for r in rows:
        label = kind_label.get(r["kind"], r["kind"])
        print(f"  {label:<16} ¥{r['s']:.2f}")
    conn.close()


def list_bids(task_id=None):
    conn = db()
    if task_id:
        bids = conn.execute(
            "SELECT b.*, p.name FROM bids b JOIN providers p ON p.id=b.provider_id WHERE b.task_id=? ORDER BY b.final_score DESC",
            (task_id,),
        ).fetchall()
        print(f"任务 #{task_id} 竞标结果：")
        print(f"{'能力方':<18}{'报价':<10}{'匹配度':<8}{'信誉':<6}{'综合分':<8}{'结果'}")
        for b in bids:
            prov = conn.execute("SELECT quality FROM providers WHERE id=?", (b["provider_id"],)).fetchone()
            print(f"{b['name']:<18}¥{b['price']:<9.2f}{b['match_score']:<8}{prov['quality']:<6}{b['final_score']:<8}{b['status']}")
    else:
        print("用法: task_market.py bids --task <id>")
    conn.close()


# ---------------- CLI ----------------
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    args = sys.argv[2:]

    def get(k, default=None):
        if k in args:
            i = args.index(k)
            if i + 1 < len(args):
                return args[i + 1]
        return default

    if cmd == "init":
        ensure_schema()
        seed_providers()
        print("✅ 任务市场已初始化：4 个能力提供方已注册")

    elif cmd == "providers":
        ensure_schema()
        conn = db()
        for p in conn.execute("SELECT * FROM providers").fetchall():
            skills = json.loads(p["skills"])
            print(f"{p['name']} [{p['type']}] 信誉{p['quality']} 报价系数{p['price_factor']}")
            print(f"   能力：{', '.join(skills)}")
        conn.close()

    elif cmd == "task":
        action = get("--action")
        if action == "create":
            ttype = get("--type", "research")
            title = get("--title", "未命名任务")
            desc = get("--desc", "")
            budget = float(get("--budget", 500))
            tid = create_task(title, desc, ttype, budget)
            print(f"✅ 任务已发布 #{tid} [{ttype}] 预算 ¥{budget}")
            print(f"   标题：{title}")
        elif action == "list":
            conn = db()
            for t in conn.execute("SELECT * FROM tasks ORDER BY id").fetchall():
                print(f"#{t['id']} [{t['type']}] {t['title']} 预算¥{t['budget']} 状态:{t['status']} 中标:{t['winner_id'] or '-'}")
            conn.close()
        else:
            print('用法: task_market.py task --action create --type research --title "标题" --desc "描述" --budget 500')

    elif cmd == "market":
        mode = get("--mode", "run")
        if mode == "run":
            ensure_schema()
            ids = run_market_cycle()
            print(f"✅ 市场运行一轮，处理任务：{ids if ids else '无待处理任务'}")
        elif mode == "watch":
            ensure_schema()
            print("🔄 市场持续运行中（Ctrl+C 停止）...")
            while True:
                ids = run_market_cycle()
                if ids:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] 处理任务 {ids}")
                time.sleep(5)
        else:
            print("用法: task_market.py market --mode run|watch")

    elif cmd == "bids":
        list_bids(int(get("--task", 0)) if get("--task") else None)

    elif cmd == "stats":
        ensure_schema()
        market_stats()

    else:
        print(__doc__)


if __name__ == "__main__":
    main()
