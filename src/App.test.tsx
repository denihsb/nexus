import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  supabase: null,
}))

vi.mock('./lib/demoStore', () => ({
  getDemoInbox: () => [],
  getDemoTasks: () => [
    { id: 'task-1', title: 'Math exam prep', due_at: new Date(Date.now() + 86400000).toISOString(), effort_minutes: 180, status: 'open' },
    { id: 'task-2', title: 'Design review', due_at: new Date(Date.now() + 172800000).toISOString(), effort_minutes: 150, status: 'open' },
    { id: 'task-3', title: 'Reading notes', due_at: new Date(Date.now() + 345600000).toISOString(), effort_minutes: 90, status: 'open' },
  ],
  isDemoAuthenticated: () => true,
  persistDemoAuthentication: vi.fn(),
  setDemoInbox: vi.fn(),
  clearDemoAuthentication: vi.fn(),
}))

vi.mock('./features/auth/AuthScreen', () => ({
  AuthScreen: ({ onAuthenticated }: { onAuthenticated: () => void }) => (
    <button type="button" onClick={onAuthenticated}>Mock login</button>
  ),
}))

vi.mock('./features/courses/CoursesPage', () => ({
  CoursesPage: () => <div>Courses</div>,
}))

vi.mock('./features/inbox/InboxPage', () => ({
  InboxPage: () => <div>Inbox</div>,
}))

vi.mock('./features/settings/SettingsPage', () => ({
  SettingsPage: () => <div>Settings</div>,
}))

vi.mock('./features/tasks/TasksPage', () => ({
  TasksPage: () => <div>Tasks</div>,
}))

import App from './App'

describe('App workload visualization', () => {
  it('does not render demo workload data for an empty workspace', () => {
    render(<App />)

    expect(screen.queryByText('RPL project proposal')).not.toBeInTheDocument()
    expect(document.querySelector('.load-bar.is-heavy')).toBeNull()
  })
})
