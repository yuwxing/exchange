import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Windows 文件监听改用轮询：避免文件被快速编辑/杀软扫描时 chokidar EBUSY 崩溃
    watch: {
      usePolling: true,
      interval: 300,
    },
    // 开发代理：/api → 本地任务市场后端（task_market_api.py :8000）
    // 生产：前端 Cloudflare Pages + 后端容器 nginx 反代，或设置 VITE_TASK_API_BASE
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
