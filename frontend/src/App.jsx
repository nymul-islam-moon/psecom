import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Analytics from './pages/Analytics'
import Deleted from './pages/Deleted'
import DiscordSchema from './pages/DiscordSchema'
import Convert from './pages/Convert'

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/deleted" element={<Deleted />} />
          <Route path="/convert" element={<Convert />} />
          <Route path="/discord" element={<DiscordSchema />} />
        </Routes>
      </main>
    </div>
  )
}
