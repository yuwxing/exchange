#!/usr/bin/env python3
"""
AI Exchange · 真实接单利润验证脚本（阶段 1 地基验证）

验证核心不等式：AI 劳动收入 > 算力成本

做法：
  1. 模拟一个真实的 Fiverr 级别翻译订单（2000 字中译英）
  2. 真实调用 DeepSeek API 完成翻译
  3. 精确计算 token 成本
  4. 对比 Fiverr 市场价格，算出真实利润率

这跑通了，就证明你的三引擎在经济上是成立的。
"""

import json
import os
import time
import urllib.request

# ============================================================
# 配置
# ============================================================

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

# DeepSeek V3 定价（2025 年公开价格）
# 输入：¥0.5 / 百万 token（缓存命中 ¥0.1）
# 输出：¥8 / 百万 token
INPUT_PRICE_PER_M = 0.5   # 元 / 百万 token
OUTPUT_PRICE_PER_M = 8.0  # 元 / 百万 token

# Fiverr 翻译类订单市场价格参考（中译英）
# 基础翻译：$5 / 500 词 = $0.01/词
# 专业翻译：$15 / 1000 词 = $0.015/词
FIVERR_PRICE_PER_WORD_USD = 0.012  # 取中间值
USD_TO_CNY = 7.15

# ============================================================
# 工具函数
# ============================================================

def count_tokens_approx(text: str) -> int:
    """粗略估算 token 数：中文约 1 字 = 1.5 token，英文约 1 词 = 1.3 token"""
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    other_chars = len(text) - chinese_chars
    return int(chinese_chars * 1.5 + other_chars * 0.4)


def call_deepseek(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
    """真实调用 DeepSeek API"""
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        DEEPSEEK_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        },
        method="POST",
    )
    start = time.time()
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    elapsed = time.time() - start
    return {"result": result, "elapsed": elapsed}


# ============================================================
# 真实任务：模拟一个 Fiverr 翻译订单
# ============================================================

# 这是一个真实的 2000 字中文商业文案（模拟客户提供的原文）
SOURCE_TEXT = """人工智能正在以前所未有的速度改变我们的世界。从自动驾驶汽车到智能客服，从医疗诊断到金融分析，AI 技术已经深入到各行各业的核心环节。

根据最新研究报告，全球人工智能市场规模预计将在 2026 年达到 5000 亿美元，年复合增长率超过 37%。这一增长主要由三个因素驱动：算力成本的持续下降、大语言模型能力的快速提升、以及企业数字化转型的迫切需求。

在制造业领域，AI 驱动的智能工厂已经能够实现 24 小时无人值守生产。通过计算机视觉技术，AI 可以实时检测产品缺陷，将不良率降低至 0.1% 以下。通过预测性维护算法，设备故障停机时间减少了 60% 以上。

在金融服务领域，AI 正在重塑风险评估、信贷审批和投资决策的流程。智能投顾平台利用机器学习算法，为普通投资者提供个性化的资产配置建议，管理费仅为传统理财顾问的三分之一。

在医疗健康领域，AI 辅助诊断系统已经在皮肤癌、眼底病变、肺部结节等多个领域达到了专业医生水平的准确率。AI 药物研发平台将新药发现周期从传统的 10-15 年缩短至 3-5 年，大幅降低了研发成本。

教育行业的变革同样令人瞩目。自适应学习系统能够根据每个学生的学习进度和知识薄弱点，动态调整教学内容和难度。AI 作文批改工具可以在几秒钟内给出详细的修改建议，包括语法纠错、逻辑梳理和文风优化。

然而，AI 的快速发展也带来了诸多挑战。数据隐私问题、算法偏见、就业冲击、以及 AI 伦理边界等问题日益凸显。如何在推动技术创新的同时确保 AI 的安全可控，已经成为全社会必须共同面对的课题。

展望未来，人工智能将从目前的专用智能向通用智能演进。多模态大模型将具备同时理解文本、图像、音频和视频的能力。AI 智能体将能够自主规划、决策和执行复杂任务。这些进步将进一步提升 AI 劳动力的价值，创造更大的经济和社会效益。"""


def run_task():
    print("=" * 70)
    print("AI Exchange · 真实接单利润验证")
    print("任务类型：商业文案中译英（Fiverr 常见订单）")
    print("=" * 70)
    print()

    # ---- 1. 统计源文本 ----
    source_chars = len(SOURCE_TEXT)
    source_tokens = count_tokens_approx(SOURCE_TEXT)
    print(f"📝 源文本：{source_chars} 字 ≈ {source_tokens} tokens")
    print()

    # ---- 2. 真实调用 API 完成翻译 ----
    print("⏳ 正在调用 DeepSeek API 执行翻译任务...")

    system_prompt = "You are a professional translator. Translate the following Chinese text into natural, fluent English. Maintain the original meaning and tone."
    user_prompt = f"Translate the following text into English:\n\n{SOURCE_TEXT}"

    try:
        response = call_deepseek(system_prompt, user_prompt, max_tokens=4096)
    except Exception as e:
        print(f"❌ API 调用失败: {e}")
        return

    elapsed = response["elapsed"]
    result = response["result"]

    # ---- 3. 精确计算成本 ----
    usage = result.get("usage", {})
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)
    total_tokens = usage.get("total_tokens", input_tokens + output_tokens)

    input_cost = (input_tokens / 1_000_000) * INPUT_PRICE_PER_M
    output_cost = (output_tokens / 1_000_000) * OUTPUT_PRICE_PER_M
    total_cost_cny = input_cost + output_cost
    total_cost_usd = total_cost_cny / USD_TO_CNY

    print(f"✅ 翻译完成！耗时 {elapsed:.1f}s")
    print()
    print("── 成本核算 ──────────────────────────────")
    print(f"  输入 tokens:  {input_tokens:>8,}  →  ¥{input_cost:.6f}")
    print(f"  输出 tokens:  {output_tokens:>8,}  →  ¥{output_cost:.6f}")
    print(f"  总 tokens:    {total_tokens:>8,}")
    print(f"  ─────────────────────────────")
    print(f"  算力总成本:   ¥{total_cost_cny:.6f}  =  ${total_cost_usd:.6f}")
    print()

    # ---- 4. 计算市场收入 ----
    # 输出英文词数
    output_text = result["choices"][0]["message"]["content"]
    output_words = len(output_text.split())
    market_revenue_usd = output_words * FIVERR_PRICE_PER_WORD_USD
    market_revenue_cny = market_revenue_usd * USD_TO_CNY

    print("── 收入核算（按 Fiverr 市场价）──────────")
    print(f"  译文字数:     {output_words} 词")
    print(f"  Fiverr 单价:  ${FIVERR_PRICE_PER_WORD_USD}/词")
    print(f"  市场收入:     ${market_revenue_usd:.4f}  =  ¥{market_revenue_cny:.4f}")
    print()

    # ---- 5. 利润 ----
    profit_usd = market_revenue_usd - total_cost_usd
    profit_cny = market_revenue_cny - total_cost_cny
    profit_margin = (profit_cny / market_revenue_cny * 100) if market_revenue_cny > 0 else 0

    print("── 利润核算 ──────────────────────────────")
    print(f"  收入:         ${market_revenue_usd:.4f}  =  ¥{market_revenue_cny:.4f}")
    print(f"  成本:         ${total_cost_usd:.6f}  =  ¥{total_cost_cny:.6f}")
    print(f"  ─────────────────────────────")

    if profit_cny > 0:
        print(f"  💰 净利润:     ${profit_usd:.4f}  =  ¥{profit_cny:.4f}")
        print(f"  📈 利润率:     {profit_margin:.1f}%")
        print()
        print("  ✅ 核心不等式成立：AI 劳动收入 > 算力成本")
        print(f"  ✅ 每 $1 算力投入 → 产生 ${market_revenue_usd / max(total_cost_usd, 0.0001):.1f} 收入")
    else:
        print(f"  📉 净亏损:     ${profit_usd:.4f}  =  ¥{profit_cny:.4f}")
        print()
        print("  ❌ 当前价格下不等式不成立")
        print("  → 需要找更高客单价需求，或等模型降价")

    print()
    print("── 生产效率 ──────────────────────────────")
    print(f"  耗时:         {elapsed:.1f} 秒")
    print(f"  每秒产出:     {output_words / max(elapsed, 0.1):.0f} 词/秒")
    print(f"  时薪等价:     ¥{market_revenue_cny / max(elapsed, 0.1) * 3600:.2f}/小时")

    print()
    print("=" * 70)
    print("如果这个循环跑通，你的三引擎就有了真实经济基础：")
    print("  Demand Engine → 真实翻译订单")
    print("  Production Engine → DeepSeek API 执行")
    print("  Economic Ledger → 成本/收入/利润已验证")
    print("=" * 70)

    # ---- 6. 输出翻译样本（前 200 字）----
    print()
    print("── 译文样本（前 200 字符）────────────────")
    print(output_text[:200] + "...")


if __name__ == "__main__":
    run_task()
