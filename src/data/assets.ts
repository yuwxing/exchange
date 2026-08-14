// ============================================================
// AI Exchange · 全球人工智能资产交易与经济系统
// V1 资产数据集：10 大板块 × 136 个模拟上市资产
// 含：板块定义 / 资产清单（上市代码体系）/ 指数定义 / 新闻池 / 贡献规则 / 候选资产池
// ============================================================
import type { Asset, CandidateAsset, IndexDef, Metric, NewsEvent, Sector } from '../types'

// ---------- 工具 ----------
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scoreLevel(score: number) {
  if (score >= 90) return 'S'
  if (score >= 85) return 'A'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C'
  return 'D'
}

// ---------- 板块（10 大市场） ----------
export const SECTORS: Sector[] = [
  { id: 'model', code: '01', name: 'AI 模型', symbol: '🧠', type: 'model', prefix: 'AI-', desc: '全球大模型上市公司模拟行情', weight: 25 },
  { id: 'agent', code: '02', name: '智能体', symbol: '🤖', type: 'agent', prefix: 'AG-', desc: 'Coding / Business / Education / Research / Personal Agent', weight: 20 },
  { id: 'skill', code: '03', name: '技能', symbol: '🧩', type: 'skill', prefix: 'SK-', desc: 'Agent Skill 市场，可复用能力资产', weight: 10 },
  { id: 'mcp', code: '04', name: '工具协议', symbol: '🔌', type: 'mcp', prefix: 'MCP-', desc: 'MCP Server 市场，Agent → 外部世界连接层', weight: 8 },
  { id: 'app', code: '05', name: 'AI 应用', symbol: '📱', type: 'app', prefix: 'APP-', desc: 'Coding / Search / Design / Video / Audio / Productivity 应用', weight: 12 },
  { id: 'robot', code: '06', name: '机器人', symbol: '🦾', type: 'robot', prefix: 'ROB-', desc: '人形机器人与具身智能公司', weight: 8 },
  { id: 'data', code: '07', name: 'AI 数据', symbol: '🗂️', type: 'data', prefix: 'DAT-', desc: '数据即生产资料，训练/专业/合成数据', weight: 5 },
  { id: 'infra', code: '08', name: '算力基础设施', symbol: '🖥️', type: 'infra', prefix: 'INF-', desc: 'GPU / TPU / 云 / 推理芯片', weight: 7 },
  { id: 'protocol', code: '09', name: 'AI 协议', symbol: '🌐', type: 'protocol', prefix: 'PRT-', desc: 'MCP / A2A / ACP / UCP / ALP', weight: 3 },
  { id: 'index', code: '10', name: '指数', symbol: '🧮', type: 'economy', prefix: 'IDX-', desc: 'AI 指数基金与生态积分资产', weight: 2 },
]

export const sectorOf = (id: string) => SECTORS.find((s) => s.id === id)

// ---------- 资产工厂 ----------
type Row = [symbol: string, name: string, nameEn: string, description: string, basePrice: number, volatility: number, capYi: number, score: number, tags: string[], issuer?: string]

/** AI Value 公式的 11 个维度（加权几何平均 → 0-100 分） */
export const AI_VALUE_DIMS: { key: string; label: string; w: number }[] = [
  { key: 'capability', label: '模型能力', w: 0.2 },
  { key: 'usage', label: '使用量', w: 0.15 },
  { key: 'developers', label: '开发者', w: 0.12 },
  { key: 'revenue', label: '收入', w: 0.12 },
  { key: 'agents', label: 'Agent 活跃', w: 0.1 },
  { key: 'users', label: '用户规模', w: 0.1 },
  { key: 'apiCalls', label: 'API 调用', w: 0.06 },
  { key: 'skills', label: 'Skills 生态', w: 0.05 },
  { key: 'growth', label: '增长', w: 0.05 },
  { key: 'ecosystem', label: '生态', w: 0.03 },
  { key: 'reliability', label: '可靠性', w: 0.02 },
]

export function computeAiValue(score: number, symbol: string): number {
  const rand = mulberry32(hash(symbol + 'av'))
  let v = 0
  for (const d of AI_VALUE_DIMS) {
    const dim = Math.round(Math.min(100, Math.max(42, score + (rand() - 0.5) * 14)))
    v += dim * d.w
  }
  return Math.round(v)
}

function buildAssets(rows: Row[], sectorId: string): Asset[] {
  return rows.map(([symbol, name, nameEn, description, basePrice, volatility, capYi, score, tags, issuer]) => {
    const rand = mulberry32(hash(symbol + 'm'))
    const metrics: Metric[] = AI_VALUE_DIMS.map((d) => {
      const offset = Math.round((rand() - 0.5) * 16)
      return { label: d.label, value: Math.min(100, Math.max(45, score + offset)) }
    })
    const aiValue = computeAiValue(score, symbol)
    return {
      symbol,
      name,
      nameEn,
      sectorId,
      type: sectorOf(sectorId)?.type ?? 'model',
      description,
      basePrice,
      volatility,
      marketCap: capYi * 1e8,
      score,
      aiValue,
      rating: scoreLevel(aiValue),
      metrics,
      tags,
      issuer,
    }
  })
}

// ---------- 01 MODEL 模型市场 ----------
const MODEL_ROWS: Row[] = [
  ['AI-OPENAI', 'OpenAI', 'OpenAI', '全球前沿大模型领导者，GPT 系列 + Codex + Sora + Operator 全栈生态。', 268.5, 0.022, 42000, 96, ['Frontier', '多模态', 'Agent'], 'OpenAI'],
  ['AI-ANTHROPIC', 'Anthropic', 'Anthropic', 'Claude 系列 + Claude Code + MCP 协议推动者，企业级 Agent 首选。', 214.8, 0.021, 26000, 95, ['Frontier', 'MCP', '企业级'], 'Anthropic'],
  ['AI-GEMINI', 'Gemini', 'Google DeepMind', 'Gemini 3.7 Flash 主打编码与工作流自动化，DeepMind 研究驱动。', 198.6, 0.018, 38000, 94, ['Frontier', '多模态', 'DeepMind'], 'Google'],
  ['AI-DEEPSEEK', 'DeepSeek', 'DeepSeek', '2026-08-13 发布 V4 Pro，推理成本行业最低，Agent 能力跃升。', 132.4, 0.024, 15000, 95, ['开源', '性价比', 'V4 Pro'], 'DeepSeek'],
  ['AI-QWEN', '通义千问', 'Qwen', '阿里巴巴开源大模型系列，覆盖多模态与全场景部署。', 86.5, 0.016, 12000, 91, ['开源', '多模态'], 'Alibaba'],
  ['AI-GROK', 'Grok', 'xAI', 'xAI 第一梯队模型，X 生态深度集成，Grok API 快速扩张。', 118.2, 0.023, 9000, 92, ['Frontier', 'X 生态'], 'xAI'],
  ['AI-LLAMA', 'Llama', 'Meta AI', '开源权重模型主力，Muse 多模态上线，开发者生态庞大。', 64.8, 0.015, 11000, 90, ['开源', 'open-weight'], 'Meta'],
  ['AI-KIMI', '月之暗面 Kimi', 'Kimi', '超长上下文 + 深度推理，K3 开放权重模型备受关注。', 58.6, 0.019, 6000, 88, ['长上下文', 'C 端'], 'Moonshot AI'],
  ['AI-GLM', '智谱 GLM', 'GLM', '国产千亿参数第一梯队，GLM Coding / Vision 全系布局。', 52.3, 0.017, 5200, 87, ['国产', '千亿参数'], 'Zhipu AI'],
  ['AI-DOUBAO', '豆包', 'Doubao', '字节跳动 Seed 团队，视频 / 图像 / Agent 多模态矩阵。', 76.9, 0.02, 14000, 90, ['多模态', '视频生成'], 'ByteDance'],
  ['AI-HUNYUAN', '腾讯混元', 'Hunyuan', 'Hunyuan Video / Image / 3D 全面发力，腾讯云 AI 商业化提速。', 48.7, 0.016, 7000, 85, ['视频', '3D'], 'Tencent'],
  ['AI-MINIMAX', 'MiniMax', 'MiniMax', 'MiniMax Video / Audio 自研，Agent 能力突出。', 45.2, 0.021, 4500, 84, ['视频', '音频'], 'MiniMax'],
  ['AI-MISTRAL', 'Mistral', 'Mistral AI', '欧洲开源模型代表，Le Chat 商业化提速。', 32.6, 0.018, 3000, 82, ['欧洲', '开源'], 'Mistral AI'],
  ['AI-NOVA', 'Amazon Nova', 'Nova', 'AWS 原生模型矩阵，企业部署成本优势明显。', 28.4, 0.014, 3500, 80, ['企业', 'AWS'], 'Amazon'],
  ['AI-PHI', 'Microsoft Phi', 'Phi', '小模型高效路线，端侧部署首选。', 22.8, 0.013, 2800, 79, ['小模型', '端侧'], 'Microsoft'],
  ['AI-NEMOTRON', 'Nemotron', 'NVIDIA', 'NVIDIA 开源模型 + 芯片协同，合成数据训练。', 35.7, 0.015, 3200, 83, ['开源', '芯片协同'], 'NVIDIA'],
  ['AI-BAICHUAN', '百川智能', 'Baichuan', '国产大模型，医疗 / 金融垂直化落地。', 18.5, 0.017, 1600, 77, ['国产', '垂直'], 'Baichuan'],
  ['AI-YI', '零一万物', '01.AI', 'Yi 系列开源模型，企业级推理部署。', 20.3, 0.016, 1800, 78, ['开源', '企业'], '01.AI'],
  ['AI-STEP', '阶跃星辰', 'StepFun', 'Step 系列多模态，万亿参数探索。', 15.6, 0.018, 1200, 76, ['多模态', '万亿参数'], 'StepFun'],
  ['AI-KUNLUN', '昆仑万维', 'Kunlun', '天工大模型，AI 搜索 + 音乐 + 短剧生态。', 12.8, 0.016, 1500, 75, ['AI 搜索', '应用生态'], 'Kunlun'],
  ['AI-SENSETIME', '商汤', 'SenseTime', '日日新大模型，视觉能力深厚，端侧落地。', 26.4, 0.015, 2500, 81, ['视觉', '端侧'], 'SenseTime'],
  ['AI-IFLYTEK', '科大讯飞', 'iFlytek', '星火大模型，教育 / 医疗语音入口优势。', 30.2, 0.014, 3000, 82, ['语音', '教育'], 'iFlytek'],
  ['AI-PANGU', '华为盘古', 'Pangu', '盘古大模型，昇腾算力全栈自主可控。', 34.6, 0.015, 3200, 83, ['自主可控', '昇腾'], 'Huawei'],
  ['AI-WENXIN', '百度文心', 'ERNIE', '文心大模型，搜索 + 自动驾驶联动。', 42.8, 0.016, 4000, 84, ['搜索', '自动驾驶'], 'Baidu'],
  ['AI-OLMO', 'OLMo', 'AI2', 'AI2 完全开放模型，训练数据全透明。', 8.6, 0.014, 600, 72, ['开源', '开放数据'], 'AI2'],
  ['AI-GEMMA', 'Gemma', 'Google', 'Google 开源轻量模型，端侧生态。', 14.2, 0.013, 1800, 76, ['开源', '轻量'], 'Google'],
  ['AI-THINKING', 'Thinking Machines', 'ThinkingMachines', '推理模型新锐，Agent 编排领先。', 9.8, 0.02, 900, 74, ['推理', 'Agent'], 'Thinking Machines'],
]

// ---------- 02 AGENT 智能体市场 ----------
const AGENT_ROWS: Row[] = [
  ['AG-CODEX', 'Codex', 'OpenAI Codex', 'OpenAI 编程 Agent，云端沙箱 + 长任务执行。', 158.4, 0.024, 12000, 94, ['Coding', 'Agent'], 'OpenAI'],
  ['AG-CLAUDE', 'Claude Code', 'Anthropic', 'Claude Code 终端原生编程 Agent，Agent Skills 支持。', 142.6, 0.022, 11000, 93, ['Coding', 'Skills'], 'Anthropic'],
  ['AG-CURSOR', 'Cursor', 'Cursor', 'AI 优先 IDE，Composer 多文件编辑。', 96.8, 0.02, 8000, 90, ['IDE', 'Coding'], 'Anysphere'],
  ['AG-WINDSURF', 'Windsurf', 'Windsurf', 'Agentic IDE，Cascade 工作流。', 48.5, 0.019, 3500, 84, ['IDE', 'Agentic'], 'Cognition'],
  ['AG-REPLIT', 'Replit Agent', 'Replit', '浏览器内全栈开发 Agent，一键部署。', 38.2, 0.018, 2800, 82, ['全栈', '部署'], 'Replit'],
  ['AG-COPILOT', 'GitHub Copilot', 'GitHub', '代码补全到 Agent Mode，GitHub 生态入口。', 66.4, 0.016, 6000, 86, ['Coding', '生态'], 'GitHub / Microsoft'],
  ['AG-CEO', 'CEO Agent', 'AI CEO', '战略决策 + 经营分析模拟，高管数字分身。', 22.4, 0.02, 1200, 78, ['Business', '决策'], 'AI Office'],
  ['AG-CFO', 'CFO Agent', 'AI CFO', '财务建模、预算与现金流管理 Agent。', 24.6, 0.019, 1400, 79, ['Finance', '财务'], 'AI Office'],
  ['AG-CMO', 'CMO Agent', 'AI CMO', '营销策划、投放优化与品牌分析。', 20.8, 0.02, 1000, 76, ['Marketing', '增长'], 'AI Office'],
  ['AG-SALES', 'Sales Agent', 'AI Sales', '客户跟进、商机管理、话术优化。', 18.2, 0.021, 900, 75, ['Sales', 'CRM'], 'AI Office'],
  ['AG-HR', 'HR Agent', 'AI HR', '招聘筛选、绩效评估、员工关怀。', 16.4, 0.018, 800, 74, ['HR', '招聘'], 'AI Office'],
  ['AG-LEGAL', 'Legal Agent', 'AI Legal', '合同审查、合规检查、法律检索。', 28.6, 0.016, 1600, 80, ['Legal', '合规'], 'AI Office'],
  ['AG-FINANCE', 'Finance Agent', 'AI Finance', '投研分析、风险控制、交易辅助。', 32.8, 0.022, 2000, 82, ['Finance', '投研'], 'AI Office'],
  ['AG-PROCURE', 'Procurement Agent', 'AI Procure', '采购寻源、供应商评估、比价谈判。', 12.6, 0.018, 600, 72, ['Procurement'], 'AI Office'],
  ['AG-EDU', '教育 Agent', 'AI Edu', 'WE-AIGO 教育智能体，覆盖教学全流程。', 26.8, 0.015, 1800, 80, ['Education', '教学'], 'WE-AIGO'],
  ['AG-TEACHER', '教师 Agent', 'AI Teacher', '备课、授课、作业批改、学情诊断。', 18.6, 0.014, 1200, 78, ['Education', '教师'], 'WE-AIGO'],
  ['AG-PPT', 'PPT Agent', 'AI PPT', '一键生成演示文稿，内容 + 设计全自动。', 8.4, 0.016, 500, 73, ['PPT', '演示'], 'WE-AIGO'],
  ['AG-COACH', '英语陪练 Agent', 'AI Coach', 'AI 口语陪练与个性化辅导，学生日活领先。', 10.2, 0.015, 700, 74, ['Education', '口语'], 'WE-AIGO'],
  ['AG-EXAM', '测评 Agent', 'AI Exam', '组卷、测评、学情分析，考试全流程。', 9.8, 0.014, 600, 73, ['Education', '测评'], 'WE-AIGO'],
  ['AG-RESEARCH', 'Research Agent', 'AI Research', '深度研究、资料检索、报告生成一体化。', 42.6, 0.019, 3000, 85, ['Research', '深度研究'], 'AI Labs'],
  ['AG-PAPER', 'Paper Agent', 'AI Paper', '论文检索、阅读、综述与引用管理。', 25.4, 0.017, 1500, 81, ['Research', '论文'], 'AI Labs'],
  ['AG-SCIENCE', 'Science Agent', 'AI Science', '科学实验设计、数据分析、文献追踪。', 30.2, 0.018, 2000, 82, ['Research', '科学'], 'AI Labs'],
  ['AG-ASSISTANT', 'Personal Assistant', 'AI Assistant', '日程、邮件、信息聚合个人助理。', 15.8, 0.016, 1000, 75, ['Personal', '助理'], 'AI Labs'],
  ['AG-HEALTH', 'Health Agent', 'AI Health', '健康管理、症状咨询、用药提醒。', 21.4, 0.017, 1300, 77, ['Personal', '健康'], 'AI Labs'],
  ['AG-HOME', 'Home Agent', 'AI Home', '家庭数字孪生、设备控制、场景联动。', 13.2, 0.015, 800, 73, ['Personal', '家庭'], 'WE-AIGO'],
]

// ---------- 03 SKILL 技能市场 ----------
const SKILL_ROWS: Row[] = [
  ['SK-000001', 'Excel 财务分析', 'Excel Finance', 'Excel 数据清洗、财务建模与分析。', 3.2, 0.02, 320, 76, ['办公', '财务']],
  ['SK-PPT', 'PPT 生成', 'PPT Gen', '结构化 PPT 大纲与版式生成。', 2.8, 0.021, 280, 75, ['办公', '演示']],
  ['SK-RESEARCH', '深度研究', 'Deep Research', '多源检索 + 交叉验证 + 长文报告。', 5.6, 0.022, 560, 82, ['研究', '报告']],
  ['SK-SEARCH', '网页搜索', 'Web Search', '实时网页检索与信息抽取。', 2.4, 0.018, 240, 74, ['搜索', '工具']],
  ['SK-PYTHON', 'Python 数据分析', 'PyData', 'Python 数据统计、可视化与建模。', 4.8, 0.02, 480, 80, ['数据', '编程']],
  ['SK-TRADING', '交易分析', 'Trading', '行情分析、策略回测与交易信号。', 6.4, 0.024, 640, 81, ['金融', '交易']],
  ['SK-SEO', 'SEO 优化', 'SEO', '关键词研究、内容优化与排名追踪。', 3.6, 0.019, 360, 76, ['营销', 'SEO']],
  ['SK-VIDEO', '视频生成', 'Video Gen', '脚本、分镜、生成到剪辑一体化。', 5.2, 0.023, 520, 79, ['视频', '创作']],
  ['SK-TEACHING', '教学诊断', 'Teaching DX', '学情诊断、错题归因、个性化教案。', 4.2, 0.016, 420, 78, ['教育', '诊断'], 'WE-AIGO'],
  ['SK-LEGAL', '合同审查', 'Legal Review', '合同条款审查、风险标注与修改建议。', 4.6, 0.017, 460, 79, ['法律', '合规']],
  ['SK-WRITING', '文案写作', 'Copywriting', '营销文案、公众号、长文创作。', 2.2, 0.018, 220, 72, ['写作', '营销']],
  ['SK-CODING', '代码生成', 'Code Gen', '需求到代码、补全、重构与审查。', 6.8, 0.02, 680, 83, ['编程', '开发']],
  ['SK-IMAGE', '图像生成', 'Image Gen', '文生图、图生图、风格迁移。', 3.8, 0.022, 380, 77, ['设计', '图像']],
  ['SK-AGENT', 'Agent 构建', 'Agent Build', '零代码构建自定义 Agent。', 5.4, 0.021, 540, 80, ['Agent', '低代码']],
  ['SK-DATA', '数据清洗', 'Data Clean', '脏数据检测、清洗与标准化。', 3.4, 0.016, 340, 75, ['数据', '工具']],
]

// ---------- 04 MCP 工具协议市场 ----------
const MCP_ROWS: Row[] = [
  ['MCP-GITHUB', 'GitHub MCP', 'GitHub', '仓库、Issue、PR、Code Search 统一接入。', 6.8, 0.024, 680, 85, ['代码', '开发']],
  ['MCP-GOOGLE', 'Google MCP', 'Google', '搜索、Calendar、Gmail、Drive 服务接入。', 5.6, 0.02, 560, 83, ['搜索', '办公']],
  ['MCP-SLACK', 'Slack MCP', 'Slack', '消息、频道、工作流自动化接入。', 4.2, 0.019, 420, 80, ['协作', '办公']],
  ['MCP-DATABASE', 'Database MCP', 'Database', 'Postgres / MySQL 等数据库查询与运维。', 7.4, 0.022, 740, 86, ['数据', '数据库']],
  ['MCP-BROWSER', 'Browser MCP', 'Browser', '浏览器自动化、网页交互与数据抓取。', 6.2, 0.023, 620, 84, ['浏览器', '自动化']],
  ['MCP-NOTION', 'Notion MCP', 'Notion', '页面、数据库、多维表格读写。', 3.8, 0.018, 380, 78, ['笔记', '办公']],
  ['MCP-SUPABASE', 'Supabase MCP', 'Supabase', 'Postgres + Auth + Storage 一站式后端。', 4.8, 0.02, 480, 81, ['后端', 'BaaS']],
  ['MCP-FILESYSTEM', 'Filesystem MCP', 'FS', '本地文件系统安全读写与组织。', 3.2, 0.016, 320, 76, ['文件', '系统']],
  ['MCP-WEB', 'Web MCP', 'Web', '网页内容抓取、API 调用与数据提取。', 4.4, 0.021, 440, 79, ['网络', '工具']],
  ['MCP-SEARCH', 'Search MCP', 'Search', '语义检索、向量搜索与知识库问答。', 5.2, 0.02, 520, 82, ['搜索', '知识库']],
  ['MCP-EMAIL', 'Email MCP', 'Email', '邮件收发、解析与自动化回复。', 3.6, 0.017, 360, 77, ['邮件', '办公']],
  ['MCP-SHELL', 'Shell MCP', 'Shell', '命令行执行、脚本运行与运维自动化。', 4.6, 0.024, 460, 80, ['运维', '命令行']],
]

// ---------- 05 APP AI 应用市场 ----------
const APP_ROWS: Row[] = [
  ['APP-CODEX', 'Codex', 'OpenAI Codex App', '云端 Agent 编程工作台。', 128.6, 0.024, 9000, 92, ['Coding'], 'OpenAI'],
  ['APP-CURSOR', 'Cursor', 'Cursor App', 'AI 优先 IDE 应用。', 88.4, 0.02, 6500, 89, ['IDE'], 'Anysphere'],
  ['APP-COPILOT', 'GitHub Copilot', 'Copilot App', '编辑器 AI 助手。', 56.2, 0.016, 4200, 85, ['Coding'], 'GitHub'],
  ['APP-WINDSURF', 'Windsurf', 'Windsurf App', 'Agentic 编程 IDE。', 32.6, 0.019, 2200, 81, ['IDE'], 'Cognition'],
  ['APP-REPLIT', 'Replit', 'Replit App', '在线开发与部署平台。', 26.8, 0.018, 1800, 79, ['云开发'], 'Replit'],
  ['APP-PERPLEXITY', 'Perplexity', 'Perplexity', '答案引擎，引用溯源搜索。', 45.6, 0.021, 3800, 84, ['搜索', '答案'], 'Perplexity'],
  ['APP-SEARCHGPT', 'ChatGPT Search', 'OpenAI Search', '对话式搜索 + 实时信息。', 38.4, 0.02, 3200, 83, ['搜索'], 'OpenAI'],
  ['APP-GEMINI', 'Gemini App', 'Google', '多模态对话助手。', 42.8, 0.019, 3600, 84, ['助手', '多模态'], 'Google'],
  ['APP-KIMI', 'Kimi 助手', 'Kimi App', '长文本阅读与问答助手。', 22.6, 0.018, 1800, 79, ['助手', '长文本'], 'Moonshot'],
  ['APP-CANVA', 'Canva', 'Canva', '设计平台 + AI 魔法工具。', 68.4, 0.016, 5200, 86, ['设计'], 'Canva'],
  ['APP-FIGMA', 'Figma', 'Figma', '协作设计 + Figma AI。', 52.6, 0.015, 4000, 84, ['设计', '协作'], 'Figma'],
  ['APP-MIDJOURNEY', 'Midjourney', 'Midjourney', '顶级文生图社区。', 36.8, 0.022, 2800, 83, ['图像', '创作'], 'Midjourney'],
  ['APP-RUNWAY', 'Runway', 'Runway', 'Gen-4 视频生成与编辑。', 28.4, 0.023, 2000, 80, ['视频'], 'Runway'],
  ['APP-SORA', 'Sora', 'OpenAI Sora', 'OpenAI 视频生成模型应用。', 34.6, 0.024, 2600, 82, ['视频'], 'OpenAI'],
  ['APP-KLING', '可灵', 'Kling', '快手视频生成应用，中文生态领先。', 26.8, 0.022, 1900, 81, ['视频', '中文'], 'Kuaishou'],
  ['APP-VEO', 'Veo', 'Google Veo', 'Google 视频生成模型应用。', 30.2, 0.023, 2200, 82, ['视频'], 'Google'],
  ['APP-ELEVENLABS', 'ElevenLabs', 'ElevenLabs', '语音合成与克隆，多语言。', 24.6, 0.021, 1700, 80, ['语音'], 'ElevenLabs'],
  ['APP-SUNO', 'Suno', 'Suno', 'AI 音乐生成。', 18.4, 0.022, 1300, 78, ['音乐'], 'Suno'],
  ['APP-MINIMAX-AUDIO', 'MiniMax Audio', 'MiniMax', '语音 / 音乐生成应用。', 12.6, 0.02, 900, 75, ['音频'], 'MiniMax'],
  ['APP-NOTION', 'Notion AI', 'Notion', '知识库 + AI 工作流。', 42.8, 0.017, 3400, 84, ['办公', '知识库'], 'Notion'],
  ['APP-MSCOPILOT', 'Microsoft Copilot', 'Microsoft', 'Office 全家桶 AI 助手。', 58.6, 0.015, 4600, 85, ['办公'], 'Microsoft'],
  ['APP-GWAI', 'Google Workspace AI', 'Google', 'Gmail / 文档 / 表格 AI 增强。', 48.2, 0.015, 3800, 84, ['办公'], 'Google'],
]

// ---------- 06 ROBOT 机器人市场 ----------
const ROBOT_ROWS: Row[] = [
  ['ROB-FIGURE', 'Figure AI', 'Figure', '人形机器人头部公司，大模型驱动具身智能。', 156.8, 0.026, 9000, 90, ['人形', '具身智能'], 'Figure AI'],
  ['ROB-OPTIMUS', 'Tesla Optimus', 'Optimus', '特斯拉人形机器人，量产与成本优势。', 268.4, 0.028, 18000, 92, ['人形', '量产'], 'Tesla'],
  ['ROB-UNITREE', '宇树科技', 'Unitree', '国产四足 / 人形机器人龙头，出货领先。', 88.6, 0.024, 6000, 87, ['四足', '人形'], 'Unitree'],
  ['ROB-AGILITY', 'Agility Robotics', 'Agility', 'Digit 人形机器人，仓储物流落地。', 42.6, 0.025, 2600, 82, ['人形', '物流'], 'Agility'],
  ['ROB-1X', '1X Technologies', '1X', 'NEO 家庭人形机器人。', 36.8, 0.027, 2200, 80, ['人形', '家庭'], '1X'],
  ['ROB-APPTRONIK', 'Apptronik', 'Apptronik', 'Apollo 通用人形机器人，工业场景。', 34.2, 0.024, 2000, 79, ['人形', '工业'], 'Apptronik'],
  ['ROB-BOSTON', 'Boston Dynamics', 'BD', 'Atlas 电动人形机器人，运动能力标杆。', 48.6, 0.023, 3000, 83, ['人形', '运动'], 'Boston Dynamics'],
  ['ROB-NVIDIA', 'NVIDIA Robotics', 'NVDA Robo', '机器人基础模型 + 仿真平台。', 66.4, 0.02, 4500, 86, ['机器人 AI', '仿真'], 'NVIDIA'],
]

// ---------- 07 DATA AI 数据市场 ----------
const DATA_ROWS: Row[] = [
  ['DAT-TRAINING', '高质量训练语料', 'Training Data', '全网高质量文本语料授权集。', 8.6, 0.024, 600, 78, ['训练', '语料']],
  ['DAT-VIDEO', '视频数据', 'Video Data', '视频理解与生成训练数据。', 7.4, 0.023, 520, 77, ['视频', '多模态']],
  ['DAT-MEDICAL', '医疗数据', 'Medical Data', '脱敏医疗影像与病历数据集。', 9.8, 0.022, 700, 79, ['医疗', '专业']],
  ['DAT-EDU', '教育数据', 'Edu Data', 'K12 课程、题库与学情数据。', 6.2, 0.018, 440, 76, ['教育', '题库'], 'WE-AIGO'],
  ['DAT-FINANCE', '金融数据', 'Finance Data', '行情、财报与另类金融数据。', 10.4, 0.021, 750, 80, ['金融', '行情']],
  ['DAT-SCIENCE', '科学数据', 'Science Data', '论文、实验与科研开放数据。', 7.8, 0.019, 560, 77, ['科学', '论文']],
  ['DAT-CODE', '代码数据', 'Code Data', '开源代码与训练代码库。', 8.2, 0.02, 580, 78, ['代码', '训练']],
  ['DAT-SYNTHETIC', '合成数据', 'Synthetic Data', 'AI 生成的合成训练数据。', 5.6, 0.025, 400, 74, ['合成', '训练']],
]

// ---------- 08 INFRA 算力基础设施 ----------
const INFRA_ROWS: Row[] = [
  ['INF-NVIDIA', 'NVIDIA', 'NVIDIA', 'GPU 之王，训练 / 推理算力基础设施核心。', 486.2, 0.02, 68000, 95, ['GPU', '训练'], 'NVIDIA'],
  ['INF-AMD', 'AMD', 'AMD', 'MI 系列 GPU 加速卡，性价比竞争。', 82.6, 0.019, 12000, 86, ['GPU', '加速卡'], 'AMD'],
  ['INF-TPU', 'Google TPU', 'TPU', '云端 TPU 集群，Gemini 训练基座。', 96.4, 0.018, 9000, 88, ['TPU', '云'], 'Google'],
  ['INF-AWS', 'AWS AI', 'AWS', '云上 AI 基础设施与 Bedrock。', 108.6, 0.015, 15000, 89, ['云', '训练'], 'Amazon'],
  ['INF-AZURE', 'Azure AI', 'Azure', '微软云 AI 与 OpenAI 独家托管。', 92.8, 0.016, 13000, 88, ['云', '托管'], 'Microsoft'],
  ['INF-COREWEAVE', 'CoreWeave', 'CoreWeave', 'GPU 云新贵，大模型训练集群。', 45.6, 0.024, 5000, 84, ['GPU 云', '训练'], 'CoreWeave'],
  ['INF-LAMBDA', 'Lambda', 'Lambda Labs', '按需 GPU 云与工作站。', 18.4, 0.021, 1500, 78, ['GPU 云'], 'Lambda'],
  ['INF-TOGETHER', 'Together AI', 'Together', '开源模型推理云 + 微调平台。', 22.6, 0.022, 1800, 79, ['推理云', '开源'], 'Together'],
  ['INF-GROQ', 'Groq', 'Groq', 'LPU 超快推理，推理速度标杆。', 28.4, 0.025, 2200, 81, ['推理', 'LPU'], 'Groq'],
  ['INF-CEREBRAS', 'Cerebras', 'Cerebras', '晶圆级芯片，超大规模训练。', 16.8, 0.026, 1200, 77, ['芯片', '训练'], 'Cerebras'],
]

// ---------- 09 PROTOCOL AI 协议市场 ----------
const PROTOCOL_ROWS: Row[] = [
  ['PRT-MCP', 'MCP 协议', 'Model Context Protocol', 'Agent → Tool 标准，Anthropic 发起，生态 8400+ Server。', 12.6, 0.026, 900, 85, ['协议', 'Agent 工具'], 'Anthropic'],
  ['PRT-A2A', 'A2A 协议', 'Agent2Agent', 'Agent → Agent 互操作标准。', 8.4, 0.024, 600, 80, ['协议', '互操作'], 'Google'],
  ['PRT-ACP', 'ACP 协议', 'Agent Client Protocol', 'Agent 客户端与 IDE 通信标准。', 5.6, 0.023, 400, 76, ['协议', '客户端'], 'Zed'],
  ['PRT-UCP', 'UCP 协议', 'Universal Control', '通用控制平面，跨 Agent 编排。', 6.8, 0.022, 480, 77, ['协议', '编排']],
  ['PRT-SKILLS', 'Agent Skills', 'Skills Spec', 'Anthropic 技能规范，Skill 生态 59000+。', 7.2, 0.024, 520, 79, ['协议', '技能'], 'Anthropic'],
  ['PRT-ALP', 'ALP 协议', 'AI Learning Protocol', 'WE-AIGO 自有 AI 经济协议，连接教育生态。', 4.2, 0.02, 300, 74, ['协议', '教育'], 'WE-AIGO'],
]

// ---------- 10 INDEX 指数市场（指数基金 + 生态积分资产） ----------
const INDEX_ROWS: Row[] = [
  ['IDX-AI10', 'AI10 指数基金', 'AI10 ETF', '跟踪 AI10 指数，一篮子 Top10 AI 资产。', 10.5, 0.016, 800, 82, ['指数', 'ETF'], 'AI Exchange'],
  ['IDX-AI100', 'AI100 指数基金', 'AI100 ETF', '跟踪 AI100 综合指数，全市场代表。', 12.8, 0.015, 1000, 84, ['指数', 'ETF'], 'AI Exchange'],
]

// ---------- 经济资产（WEG 生态积分） ----------
const ECONOMY_ROWS: Row[] = [
  ['WEG', 'AI-Wego', 'AI Education Economy', 'WEG 生态积分资产，衡量 AI 教育生态贡献，非证券。', 5.8, 0.008, 5800, 82, ['生态积分', '非证券'], 'WE-AIGO'],
]

export const ASSETS: Asset[] = [
  ...buildAssets(MODEL_ROWS, 'model'),
  ...buildAssets(AGENT_ROWS, 'agent'),
  ...buildAssets(SKILL_ROWS, 'skill'),
  ...buildAssets(MCP_ROWS, 'mcp'),
  ...buildAssets(APP_ROWS, 'app'),
  ...buildAssets(ROBOT_ROWS, 'robot'),
  ...buildAssets(DATA_ROWS, 'data'),
  ...buildAssets(INFRA_ROWS, 'infra'),
  ...buildAssets(PROTOCOL_ROWS, 'protocol'),
  ...buildAssets(INDEX_ROWS, 'index'),
  ...buildAssets(ECONOMY_ROWS, 'index').map((a) => ({ ...a, isWeg: true, type: 'economy' as const })),
]

export const assetOf = (symbol: string) => ASSETS.find((a) => a.symbol === symbol)

// ---------- 指数定义 ----------
export const INDEXES: IndexDef[] = [
  { id: 'ai100', code: 'AI100', name: 'AI 综合指数', scope: 'top', count: 100, base: 12580.35, desc: '全市场代表资产按市值加权模拟编制，反映 AI 经济整体景气度。' },
  { id: 'ai10', code: 'AI10', name: 'AI 综合 TOP10', scope: 'top', count: 10, base: 10000, desc: '全市场市值 Top10 资产加权指数。' },
  { id: 'ai50', code: 'AI50', name: 'AI 综合 TOP50', scope: 'top', count: 50, base: 10000, desc: '全市场市值 Top50 资产加权指数。' },
  { id: 'model100', code: 'MODEL100', name: 'AI 模型 100', scope: 'sector', sectorId: 'model', base: 10000, desc: '全球大模型资产指数。' },
  { id: 'agent100', code: 'AGENT100', name: 'Agent 100', scope: 'sector', sectorId: 'agent', base: 10000, desc: '智能体资产指数。' },
  { id: 'skill100', code: 'SKILL100', name: 'Skill 100', scope: 'sector', sectorId: 'skill', base: 10000, desc: 'Agent Skill 资产指数。' },
  { id: 'app100', code: 'APP100', name: 'AI 应用 100', scope: 'sector', sectorId: 'app', base: 10000, desc: 'AI 应用资产指数。' },
  { id: 'robot50', code: 'ROBOT50', name: '机器人 50', scope: 'sector', sectorId: 'robot', base: 10000, desc: '人形机器人与具身智能指数。' },
  { id: 'infra50', code: 'INFRA50', name: '算力基础设施 50', scope: 'sector', sectorId: 'infra', base: 10000, desc: 'GPU / 云 / 推理芯片基础设施指数。' },
]

export function indexMembers(index: IndexDef): string[] {
  if (index.scope === 'sector' && index.sectorId) {
    return ASSETS.filter((a) => a.sectorId === index.sectorId).map((a) => a.symbol)
  }
  const top = [...ASSETS].sort((a, b) => b.marketCap - a.marketCap).slice(0, index.count ?? 50)
  return top.map((a) => a.symbol)
}

// ---------- 新闻事件池 ----------
export const NEWS_POOL: NewsEvent[] = [
  {
    id: 'n1',
    title: 'DeepSeek 发布 V4 Pro，Agent 能力跃升，推理成本再降 40%',
    summary: '新一代模型在数学与代码能力上刷新榜单，API 调用量单日暴增。',
    sectorId: 'model',
    symbol: 'AI-DEEPSEEK',
    time: '2026-08-13 09:15',
    importance: 3,
    effect: [
      { index: 'model', delta: 0.06 },
      { index: 'calls', delta: 0.12 },
    ],
    published: true,
  },
  {
    id: 'n2',
    title: 'AI-Wego 生态用户突破 120 万，教育生态加速扩张',
    summary: 'WEG 生态用户月增 20%，AI 贡献系统正式上线，生态积分需求提升。',
    sectorId: 'index',
    symbol: 'WEG',
    time: '2026-08-13 08:40',
    importance: 3,
    effect: [
      { index: 'users', delta: 0.15 },
      { index: 'ecosystem', delta: 0.1 },
    ],
    published: true,
  },
  {
    id: 'n3',
    title: 'Agent OS 发布技能市场，Skill 生态规模突破 59,000',
    summary: '开发者通过 Agent OS 上传 Skill，审核通过后可获 WEG 贡献奖励。',
    sectorId: 'skill',
    symbol: 'SK-AGENT',
    time: '2026-08-13 08:00',
    importance: 2,
    effect: [
      { index: 'skill', delta: 0.05 },
      { index: 'developers', delta: 0.08 },
    ],
    published: true,
  },
  {
    id: 'n4',
    title: '人形机器人量产提速，Figure 获新一轮融资',
    summary: '具身智能赛道热度升温，产业链相关标的受资金关注。',
    sectorId: 'robot',
    symbol: 'ROB-FIGURE',
    time: '2026-08-12 22:30',
    importance: 2,
    effect: [{ index: 'robot', delta: 0.05 }],
    published: true,
  },
  {
    id: 'n5',
    title: 'Gemini 3.7 Flash 发布，主打 Coding 与工作流自动化',
    summary: 'Google 新一代模型强化工程能力，Vertex AI 调用量显著增长。',
    sectorId: 'model',
    symbol: 'AI-GEMINI',
    time: '2026-08-12 20:10',
    importance: 3,
    effect: [
      { index: 'model', delta: 0.04 },
      { index: 'calls', delta: 0.06 },
    ],
    published: false,
  },
  {
    id: 'n6',
    title: 'MCP 生态 Server 突破 8,400 个，Agent 工具层标准化加速',
    summary: '微软将 MCP Skills 接入 Agent Framework，协议价值重估。',
    sectorId: 'mcp',
    symbol: 'PRT-MCP',
    time: '2026-08-12 18:45',
    importance: 2,
    effect: [
      { index: 'mcp', delta: 0.06 },
      { index: 'protocol', delta: 0.04 },
    ],
    published: false,
  },
  {
    id: 'n7',
    title: '全球 AI 算力投资激增，CoreWeave 获新一轮数十亿融资',
    summary: '训练集群供不应求，GPU 云资产价值重估。',
    sectorId: 'infra',
    symbol: 'INF-COREWEAVE',
    time: '2026-08-12 15:00',
    importance: 2,
    effect: [{ index: 'infra', delta: 0.05 }],
    published: false,
  },
  {
    id: 'n8',
    title: 'AI 教育写入新课标，教育 AI 渗透率加速提升',
    summary: '政策利好 AI 教育赛道，学生端使用时长与付费意愿同步提升。',
    sectorId: 'data',
    symbol: null,
    time: '2026-08-11 18:45',
    importance: 3,
    effect: [
      { index: 'users', delta: 0.08 },
      { index: 'data', delta: 0.04 },
    ],
    published: false,
  },
  {
    id: 'n9',
    title: 'AI Exchange 模拟大盘总市值突破千亿',
    summary: 'AI100 指数创历史新高，市场情绪高涨，成交额显著放大。',
    sectorId: null,
    symbol: null,
    time: '2026-08-11 15:00',
    importance: 2,
    effect: [{ index: 'market', delta: 0.02 }],
    published: false,
  },
  {
    id: 'n10',
    title: 'A2A 协议生态扩张，Agent 间协作进入标准化时代',
    summary: '多家大厂宣布支持 A2A 互操作，协议资产关注度提升。',
    sectorId: 'protocol',
    symbol: 'PRT-A2A',
    time: '2026-08-11 10:20',
    importance: 2,
    effect: [
      { index: 'protocol', delta: 0.05 },
      { index: 'agent', delta: 0.03 },
    ],
    published: false,
  },
]

// ---------- 贡献规则 ----------
export const CONTRIBUTION_RULES = [
  {
    role: '学生',
    icon: '🎒',
    items: [
      { action: '学习AI课程30分钟', reward: 5 },
      { action: '完成AI口语训练', reward: 10 },
      { action: '完成每日测评打卡', reward: 3 },
      { action: '连续学习7天', reward: 50, note: '成长奖励' },
    ],
  },
  {
    role: '老师',
    icon: '👩‍🏫',
    items: [
      { action: '上传一门课程', reward: 100 },
      { action: '创建AI教师Agent', reward: 500 },
      { action: '课程被100人学习', reward: 200 },
      { action: '制作AI课件', reward: 60 },
    ],
  },
  {
    role: '开发者',
    icon: '🧑‍💻',
    items: [
      { action: '上传Skill并通过审核', reward: 1000 },
      { action: '开发Agent应用上架', reward: 800 },
      { action: '参与开源生态共建', reward: 300 },
      { action: '修复社区Issues', reward: 50 },
    ],
  },
  {
    role: '普通用户',
    icon: '🧑',
    items: [
      { action: '完成每日AI使用任务', reward: 10 },
      { action: '产生有效AI行为数据', reward: 8 },
      { action: '邀请好友加入生态', reward: 20 },
      { action: '分享优质内容', reward: 15 },
    ],
  },
]

// ---------- 候选资产池（AI Research Agent 自动发现） ----------
export const CANDIDATES: CandidateAsset[] = [
  { symbol: 'AG-DEVOPS', name: 'DevOps Agent', nameEn: 'AI DevOps', type: 'agent', sectorId: 'agent', description: 'CI/CD 自动化与发布管理 Agent。', basePrice: 12.4, marketCap: 900e6, score: 74, tags: ['DevOps', '自动化'] },
  { symbol: 'AG-SECURITY', name: 'Security Agent', nameEn: 'AI Security', type: 'agent', sectorId: 'agent', description: '代码审计、漏洞扫描与安全运营。', basePrice: 15.6, marketCap: 1100e6, score: 75, tags: ['安全', '审计'] },
  { symbol: 'SK-REPORT', name: '智能报告', nameEn: 'Smart Report', type: 'skill', sectorId: 'skill', description: '多源数据自动生成结构化报告。', basePrice: 4.8, marketCap: 340e6, score: 78, tags: ['报告', '办公'] },
  { symbol: 'MCP-REDIS', name: 'Redis MCP', nameEn: 'Redis', type: 'mcp', sectorId: 'mcp', description: '缓存与实时数据接入。', basePrice: 3.4, marketCap: 240e6, score: 74, tags: ['缓存', '数据'] },
  { symbol: 'APP-GAMMA', name: 'Gamma', nameEn: 'Gamma', type: 'app', sectorId: 'app', description: 'AI 演示文稿应用。', basePrice: 8.6, marketCap: 600e6, score: 76, tags: ['演示', '办公'] },
  { symbol: 'DAT-IOT', name: 'IoT 数据', nameEn: 'IoT Data', type: 'data', sectorId: 'data', description: '物联网传感器数据资产。', basePrice: 6.2, marketCap: 440e6, score: 75, tags: ['IoT', '传感器'] },
  { symbol: 'INF-PAPERSPACE', name: 'Paperspace', nameEn: 'Paperspace', type: 'infra', sectorId: 'infra', description: 'ML 云平台。', basePrice: 9.4, marketCap: 700e6, score: 76, tags: ['ML 云', '训练'] },
  { symbol: 'AI-COHERE', name: 'Cohere', nameEn: 'Cohere', type: 'model', sectorId: 'model', description: '企业级 RAG 模型。', basePrice: 14.2, marketCap: 1000e6, score: 77, tags: ['RAG', '企业'] },
  { symbol: 'AI-ALEPH', name: 'Aleph Alpha', nameEn: 'Aleph Alpha', type: 'model', sectorId: 'model', description: '欧洲主权 AI。', basePrice: 6.8, marketCap: 480e6, score: 73, tags: ['欧洲', '主权'] },
  { symbol: 'DAT-VOICE', name: '语音数据', nameEn: 'Voice Data', type: 'data', sectorId: 'data', description: '多语言语音识别训练数据。', basePrice: 5.4, marketCap: 380e6, score: 73, tags: ['语音', '训练'] },
]
