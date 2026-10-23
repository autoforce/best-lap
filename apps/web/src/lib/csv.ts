type Cell = string | number | null | undefined

function formatCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  // Comma decimals and semicolon separators open correctly in Excel configured for pt-BR
  const text = typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 3, useGrouping: false }) : value
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  const lines = [header, ...rows].map((row) => row.map(formatCell).join(';'))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
