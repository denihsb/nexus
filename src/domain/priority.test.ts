import { describe, expect, it } from 'vitest'
import { buildFocusSuggestion, computePriorityScore } from './priority'

describe('priority scoring', () => {
  it('ranks urgent high importance work higher than low urgency tasks', () => {
    const urgent = {
      id: 'u1',
      title: 'Capstone draft',
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      effort_minutes: 180,
      importance: 3 as const,
      status: 'open' as const,
    }

    const later = {
      id: 'l1',
      title: 'Reading notes',
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      effort_minutes: 45,
      importance: 1 as const,
      status: 'open' as const,
    }

    expect(computePriorityScore(urgent)).toBeGreaterThan(computePriorityScore(later))
    expect(buildFocusSuggestion([later, urgent])[0].id).toBe('u1')
  })

  it('explains why the task is recommended', () => {
    const task = {
      id: 't1',
      title: 'Research proposal',
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      effort_minutes: 210,
      importance: 3 as const,
      status: 'open' as const,
    }

    const explanation = buildFocusSuggestion([task])[0].explanation
    expect(explanation.some((item) => item.includes('Due'))).toBe(true)
    expect(explanation.some((item) => item.includes('High effort'))).toBe(true)
  })
})
