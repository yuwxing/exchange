import { lazy, Suspense, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomeGate from './components/WelcomeGate'

// 路由级代码分割：首屏只加载当前页，其余按需分包
const Market = lazy(() => import('./pages/Market'))
const Capital = lazy(() => import('./pages/Capital'))
const Assets = lazy(() => import('./pages/Assets'))
const AssetDetail = lazy(() => import('./pages/AssetDetail'))
const AIIndex = lazy(() => import('./pages/AIIndex'))
const Intelligence = lazy(() => import('./pages/Intelligence'))
const WegEconomy = lazy(() => import('./pages/WegEconomy'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const News = lazy(() => import('./pages/News'))

function PageLoading() {
  return <div className="py-24 text-center text-sm text-market-sub">加载中…</div>
}

const WELCOME_KEY = 'ai-exchange-welcomed'

function AppInner() {
  // 首次进入显示欢迎页（本地标记；清除浏览器数据后再次显示）
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) === '1'
    } catch {
      return false
    }
  })
  // 欢迎页选择的总入口（默认行情大厅；选 CAPITAL 则直达 AI Capital OS）
  const [startPath, setStartPath] = useState('/')

  if (!welcomed) {
    return (
      <WelcomeGate
        onStart={(path = '/') => {
          try {
            localStorage.setItem(WELCOME_KEY, '1')
          } catch {
            // ignore
          }
          setStartPath(path)
          setWelcomed(true)
        }}
      />
    )
  }

  return (
    <HashRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {startPath !== '/' && <Route path="/" element={<Navigate to={startPath} replace />} />}
          <Route element={<Layout />}>
            <Route path="/" element={<Market />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/asset/:symbol" element={<AssetDetail />} />
            <Route path="/index" element={<AIIndex />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/weg" element={<WegEconomy />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/news" element={<News />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default function App() {
  return <AppInner />
}
