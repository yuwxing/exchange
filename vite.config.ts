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
  },
})
