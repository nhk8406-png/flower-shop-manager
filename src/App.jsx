import './index.css'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './components/dashboard/Dashboard'
import OrderList from './components/orders/OrderList'
import TodoList from './components/todos/TodoList'
import Settings from './components/settings/Settings'
import ImageToTextPage from './components/ocr/ImageToText'
import ChatPanel from './components/chat/ChatPanel'
import useAppStore from './store/useAppStore'

export default function App() {
  const { activeTab, isChatOpen } = useAppStore()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className={`flex-1 ml-56 flex flex-col transition-all ${isChatOpen ? 'mr-80' : ''}`}>
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'orders' && <OrderList />}
          {activeTab === 'todos' && <TodoList />}
          {activeTab === 'ocr' && <ImageToTextPage />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      <ChatPanel />
    </div>
  )
}
