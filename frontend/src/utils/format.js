import { format } from 'date-fns'

const CURRENCY_SYMBOLS = {
  BDT: '৳',
  USD: '$',
}

export const formatCurrency = (amount, currency = 'BDT') => {
  const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  const symbol = CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency
  return `${symbol}${num}`
}

export const formatDate = (dateStr) =>
  format(new Date(dateStr), 'MMM d, yyyy HH:mm')

export const formatShortDate = (dateStr) =>
  format(new Date(dateStr), 'MMM d')
