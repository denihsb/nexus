/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeDailyWorkload, type WorkloadTask } from './workload'

const baseTask: Omit<WorkloadTask, 'due_at'> = {
  id: 't1',
  title: 'Test task',
  effort_minutes: 60,
  status: 'open',
}

describe('computeDailyWorkload', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    // Reproduce the WIB (UTC+7) environment where the original bug surfaced:
    // a task due "tomorrow" stored with a late-in-the-day UTC time must still
    // land in tomorrow's bucket, not the day after.
    process.env.TZ = 'Asia/Jakarta'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-09-04T05:00:00.000Z')) // 12:00 WIB, Sept 4
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = originalTz
  })

  it('places a task due tomorrow (stored at noon UTC) in tomorrow\'s bucket, not the day after', () => {
    const tasks: WorkloadTask[] = [
      { ...baseTask, due_at: '2025-09-05T12:00:00.000Z' },
    ]

    const buckets = computeDailyWorkload(tasks, 7)

    // index 0 = today (Sep 4), index 1 = tomorrow (Sep 5)
    expect(buckets[1].value).toBeGreaterThan(0)
    expect(buckets[2].value).toBe(0)
  })

  it('places a task due today in today\'s bucket', () => {
    const tasks: WorkloadTask[] = [
      { ...baseTask, due_at: '2025-09-04T12:00:00.000Z' },
    ]

    const buckets = computeDailyWorkload(tasks, 7)

    expect(buckets[0].value).toBeGreaterThan(0)
  })

  it('ignores tasks that are not open', () => {
    const tasks: WorkloadTask[] = [
      { ...baseTask, due_at: '2025-09-05T12:00:00.000Z', status: 'completed' },
    ]

    const buckets = computeDailyWorkload(tasks, 7)

    expect(buckets.every((bucket) => bucket.value === 0)).toBe(true)
  })
})
