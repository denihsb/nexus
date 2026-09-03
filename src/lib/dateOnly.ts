export function dateInputToTimestamp(value: string) {
  return value ? `${value}T12:00:00.000Z` : null
}

export function timestampToDateInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function formatDateOnly(value: string | null) {
  const input = timestampToDateInput(value)
  if (!input) return 'Belum ada deadline'
  const [year, month, day] = input.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}