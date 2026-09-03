export type WorkloadTask = {
  id: string
  title: string
  due_at: string | null
  effort_minutes: number | null
  status: 'open' | 'completed' | 'archived'
}

export type DailyLoad = {
  day: string
  value: number
}

export function computeDailyWorkload(tasks: WorkloadTask[], days = 7): DailyLoad[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })

    return {
      day: weekday,
      value: 0,
    }
  })

  for (const task of tasks) {
    if (task.status !== 'open') continue

    const dueAt = task.due_at ? new Date(task.due_at) : null
    if (!dueAt) continue

    // Compare local calendar dates, not raw ms difference — avoids rounding
    // a late-in-the-day due time (e.g. 23:59) into the next day's bucket.
    const dueMidnight = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate())
    const diffDays = Math.round((dueMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0 || diffDays >= days) continue

    const effort = task.effort_minutes ?? 60
    const contribution = Math.min(effort, 180)
    buckets[diffDays].value += contribution
  }

  return buckets.map((bucket) => ({
    day: bucket.day,
    value: Math.min(100, Math.round((bucket.value / 180) * 100)),
  }))
}
