import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'

const today = () => format(new Date(), 'yyyy-MM-dd')

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const useAppStore = create(
  persist(
    (set, get) => ({
      // ===== 발주 =====
      orders: [],

      addOrder: (order) =>
        set((state) => ({
          orders: [
            ...state.orders,
            {
              id: generateId(),
              itemName: '',
              quantity: 1,
              unit: '개',
              supplier: '',
              orderDate: today(),
              deliveryDate: today(),
              status: '대기중',
              type: '주문',
              memo: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              ...order,
            },
          ],
        })),

      updateOrder: (id, patch) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o
          ),
        })),

      deleteOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, status, updatedAt: Date.now() } : o
          ),
        })),

      // ===== 할일 =====
      todos: [],

      addTodo: (todo) =>
        set((state) => ({
          todos: [
            ...state.todos,
            {
              id: generateId(),
              date: today(),
              title: '',
              done: false,
              priority: '보통',
              linkedOrderId: null,
              createdAt: Date.now(),
              ...todo,
            },
          ],
        })),

      toggleTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          ),
        })),

      updateTodo: (id, patch) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      deleteTodo: (id) =>
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        })),

      // ===== UI 상태 =====
      isChatOpen: false,
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

      selectedDate: today(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ===== 채팅 =====
      messages: [],
      activeModel: 'claude',
      setActiveModel: (model) => set({ activeModel: model }),

      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateId(),
              role: 'user',
              content: '',
              model: state.activeModel,
              timestamp: Date.now(),
              ...msg,
            },
          ],
        })),

      clearMessages: () => set({ messages: [] }),

      // ===== 집계 (파생) =====
      getStats: () => {
        const { orders, todos } = get()
        const todayStr = today()
        const reservations = orders.filter((o) => o.type === '예약').length
        const totalOrders = orders.filter((o) => o.type === '주문').length
        const missing = orders.filter(
          (o) => o.deliveryDate < todayStr && o.status !== '출고완료'
        ).length
        const todayDelivery = orders.filter(
          (o) => o.deliveryDate === todayStr && o.status !== '출고완료'
        ).length
        const pendingTodos = todos.filter(
          (t) => t.date === todayStr && !t.done
        ).length
        return { reservations, totalOrders, missing, todayDelivery, pendingTodos }
      },
    }),
    {
      name: 'flower-shop-storage',
    }
  )
)

export default useAppStore
