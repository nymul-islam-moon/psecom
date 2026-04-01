import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Transactions
export const getTransactions = (params = {}) => api.get('/transactions/', { params })
export const getDeletedTransactions = () => api.get('/transactions/deleted')
export const getTransaction = (id) => api.get(`/transactions/${id}`)

// Accounts
export const getAccounts = () => api.get('/accounts/')
export const getAccount = (id) => api.get(`/accounts/${id}`)

// Events
export const postEvent = (payload) => api.post('/events/', payload)
export const getEvents = (params = {}) => api.get('/events/', { params })

// Transfers
export const getTransfers = () => api.get('/transfers/')
export const getTransfer = (id) => api.get(`/transfers/${id}`)

// Sync
export const triggerSync = () => api.post('/sync/')

// Purge (year reset)
export const triggerPurge = () => api.post('/purge/?confirm=true')

export default api
