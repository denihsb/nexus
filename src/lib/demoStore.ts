const AUTH_KEY = 'nexus-demo-auth'
const COURSE_KEY = 'nexus-demo-courses'
const INBOX_KEY = 'nexus-demo-inbox'
const TASK_KEY = 'nexus-demo-tasks'

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const rawValue = window.localStorage.getItem(key)
    if (!rawValue) return fallback
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
}

export function isDemoAuthenticated() {
  return safeRead<boolean>(AUTH_KEY, false)
}

export function persistDemoAuthentication(isAuthenticated: boolean) {
  safeWrite(AUTH_KEY, isAuthenticated)
}

export function clearDemoAuthentication() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_KEY)
}

export function getDemoCourses<T>(fallback: T): T {
  return safeRead(COURSE_KEY, fallback)
}

export function setDemoCourses<T>(value: T) {
  safeWrite(COURSE_KEY, value)
}

export function getDemoInbox<T>(fallback: T): T {
  return safeRead(INBOX_KEY, fallback)
}

export function setDemoInbox<T>(value: T) {
  safeWrite(INBOX_KEY, value)
}

export function getDemoTasks<T>(fallback: T): T {
  return safeRead(TASK_KEY, fallback)
}

export function setDemoTasks<T>(value: T) {
  safeWrite(TASK_KEY, value)
}

export function isMissingSupabaseTableError(error: { code?: string | null } | null | undefined) {
  const code = error?.code ?? ''
  return ['PGRST205', 'PGRST301', '42P01', '42704'].includes(code)
}
