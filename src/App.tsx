import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Market from './pages/Market'
import Stocks from './pages/Stocks'
import StockDetail from './pages/StockDetail'
import WegEconomy from './pages/WegEconomy'
import Portfolio from './pages/Portfolio'
import AIIndex from './pages/AIIndex'
import News from './pages/News'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Market />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/weg" element={<WegEconomy />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/index" element={<AIIndex />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
