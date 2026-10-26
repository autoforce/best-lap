import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Absolute URL for a stored address. Domains and websites may be saved without the protocol
 * ("site.com.br"), which the browser would resolve as a path inside the dashboard.
 */
export function externalUrl(address: string) {
  const value = address.trim()
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value.replace(/^\/+/, '')}`
}
