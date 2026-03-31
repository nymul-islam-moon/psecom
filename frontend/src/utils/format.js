import { format } from 'date-fns'

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export const formatDate = (dateStr) =>
  format(new Date(dateStr), 'MMM d, yyyy HH:mm')

export const formatShortDate = (dateStr) =>
  format(new Date(dateStr), 'MMM d')
