// ============================================================
// AI Exchange · AI 巨鲸（模拟机构）数据集
// 原创设定：8 家「AI 时代资本」——用于资金流洞察教学
// ============================================================
import type { Whale } from '../types'

export const WHALES: Whale[] = [
  {
    id: 'wh-openai-cap',
    name: 'OpenAI Capital',
    nameEn: 'OpenAI Capital',
    icon: '🐋',
    color: '#16a34a',
    focus: '前沿大模型与 Agent 生态',
    focusSectorId: 'model',
    capital: 4.2e12,
  },
  {
    id: 'wh-gdm-fund',
    name: 'DeepMind 基金',
    nameEn: 'DeepMind Fund',
    icon: '🔮',
    color: '#6366f1',
    focus: '多模态模型与科研突破',
    focusSectorId: 'model',
    capital: 3.6e12,
  },
  {
    id: 'wh-msft-ai',
    name: '微软 AI 基金',
    nameEn: 'Microsoft AI Fund',
    icon: '🪟',
    color: '#0ea5e9',
    focus: '企业级 Agent 与 Copilot 应用',
    focusSectorId: 'app',
    capital: 3.1e12,
  },
  {
    id: 'wh-nvda-ventures',
    name: 'NVIDIA Ventures',
    nameEn: 'NVIDIA Ventures',
    icon: '⚡',
    color: '#76b900',
    focus: '算力基础设施与机器人',
    focusSectorId: 'infra',
    capital: 2.8e12,
  },
  {
    id: 'wh-alibaba-ai',
    name: '阿里 AI 资本',
    nameEn: 'Alibaba AI Capital',
    icon: '💎',
    color: '#f59e0b',
    focus: '开源模型与云上生态',
    focusSectorId: 'model',
    capital: 1.9e12,
  },
  {
    id: 'wh-tencent-ai',
    name: '腾讯 AI 资本',
    nameEn: 'Tencent AI Capital',
    icon: '🐧',
    color: '#3b82f6',
    focus: 'AI 应用与教育生态',
    focusSectorId: 'app',
    capital: 1.6e12,
  },
  {
    id: 'wh-xai-cap',
    name: 'xAI Capital',
    nameEn: 'xAI Capital',
    icon: '🚀',
    color: '#8b5cf6',
    focus: '前沿推理模型与实时信息',
    focusSectorId: 'model',
    capital: 1.2e12,
  },
  {
    id: 'wh-sb-vision',
    name: '软银 AI 愿景',
    nameEn: 'SoftBank AI Vision',
    icon: '🏦',
    color: '#ef4444',
    focus: '机器人、数据与基础设施',
    focusSectorId: 'robot',
    capital: 2.4e12,
  },
]

export const whaleOf = (id: string) => WHALES.find((w) => w.id === id)
