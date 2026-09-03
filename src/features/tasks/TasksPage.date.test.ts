import { describe, expect, it } from 'vitest'
import { formatTaskDue } from './TasksPage'

describe('formatTaskDue', () => {
  it('keeps the selected calendar date stable', () => {
    expect(formatTaskDue('2026-09-02T12:00:00.000Z', new Date('2026-09-01T23:00:00.000Z'))).toContain('2 September 2026')
  })

  it('marks an earlier calendar date as overdue without shifting it', () => {
    expect(formatTaskDue('2026-09-02T12:00:00.000Z', new Date('2026-09-03T01:00:00.000Z'))).toBe('Terlambat · 2 September 2026')
  })
})
