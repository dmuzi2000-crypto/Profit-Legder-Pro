export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const [headerLine, ...rows] = lines
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return rows.filter(r => r.trim()).map(row => {
    // Basic CSV split that handles quoted commas
    const vals = row.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? []
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim().replace(/^"|"$/g, '')]))
  })
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const content = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
