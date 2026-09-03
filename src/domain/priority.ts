export type ImportanceLevel = 1 | 2 | 3

export type PriorityTask = {
  id: string
  title: string
  due_at: string | null
  effort_minutes: number | null
  importance: ImportanceLevel
  status: 'open' | 'completed' | 'archived'
}

export type FocusSuggestion = {
  id: string
  title: string
  score: number
  explanation: string[]
}

const urgency = (dueAt: string | null) => {
  if (!dueAt) return 20

  const now = Date.now()
  const dueMs = new Date(dueAt).getTime()
  const daysLeft = (dueMs - now) / (1000 * 60 * 60 * 24)

  if (daysLeft < 0) return 100
  if (daysLeft <= 1) return 90
  if (daysLeft <= 3) return 70
  if (daysLeft <= 7) return 45
  return 20
}

const effortWeight = (effort: number | null) => {
  if (!effort) return 25
  if (effort <= 60) return 25
  if (effort <= 180) return 60
  return 100
}

const importanceWeight = (importance: ImportanceLevel) => {
  if (importance === 1) return 20
  if (importance === 2) return 60
  return 100
}

export function computePriorityScore(task: PriorityTask) {
  const urgencyScore = urgency(task.due_at)
  const importanceScore = importanceWeight(task.importance)
  const effortScore = effortWeight(task.effort_minutes)
  const loadScore = 0

  return Math.round(0.4 * urgencyScore + 0.25 * importanceScore + 0.2 * effortScore + 0.15 * loadScore)
}

export function buildFocusSuggestion(tasks: PriorityTask[]): FocusSuggestion[] {
  const openTasks = tasks.filter((task) => task.status === 'open')

  return openTasks
    .map((task) => {
      const score = computePriorityScore(task)
      const explanation = [
        task.due_at ? `Due ${new Date(task.due_at).toLocaleDateString()}` : 'No deadline set',
      ]

      if (task.importance === 3) explanation.push('High importance')
      if (task.importance === 2) explanation.push('Medium importance')
      if (task.importance === 1) explanation.push('Lower importance')

      if (task.effort_minutes && task.effort_minutes > 180) explanation.push('High effort')
      else if (task.effort_minutes && task.effort_minutes > 60) explanation.push('Moderate effort')
      else explanation.push('Quick action')

      return { id: task.id, title: task.title, score, explanation }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const dueA = new Date(tasks.find((task) => task.id === a.id)?.due_at ?? '9999-12-31').getTime()
      const dueB = new Date(tasks.find((task) => task.id === b.id)?.due_at ?? '9999-12-31').getTime()
      if (dueA !== dueB) return dueA - dueB
      return b.score - a.score
    })
}
