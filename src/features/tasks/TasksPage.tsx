import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Course } from '../courses/CoursesPage'
import type { InboxItem } from '../inbox/InboxPage'

export type Task = {
  id: string
  user_id: string
  course_id: string | null
  inbox_item_id: string | null
  title: string
  notes: string
  due_at: string | null
  effort_minutes: number | null
  importance: 1 | 2 | 3
  status: 'open' | 'completed' | 'archived'
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

type TaskDraft = { title: string; course_id: string; due_at: string; effort_minutes: string; importance: '1' | '2' | '3' }
const emptyDraft: TaskDraft = { title: '', course_id: '', due_at: '', effort_minutes: '', importance: '2' }

function toDateInput(value: string | null) { return value ? value.slice(0, 10) : '' }

type TasksPageProps = { initialInboxItem?: InboxItem | null; onInboxProcessed?: (id: string) => void }

export function TasksPage({ initialInboxItem, onInboxProcessed }: TasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    if (!supabase) return
    Promise.all([
      supabase.from('tasks').select('*').eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('courses').select('*').eq('is_archived', false).order('name'),
    ]).then(([taskResult, courseResult]) => {
      if (!isMounted) return
      setIsLoading(false)
      if (taskResult.error || courseResult.error) {
        console.error('Task loading error:', taskResult.error ?? courseResult.error)
        setMessage('Could not load your tasks. Check your connection and try again.')
        return
      }
      setTasks(taskResult.data as Task[])
      setCourses(courseResult.data as Course[])
    })
    return () => { isMounted = false }
  }, [])

  function openCreateForm(item?: InboxItem) {
    setEditingTask(null)
    setDraft({ ...emptyDraft, title: item?.raw_text ?? '' })
    setMessage('')
    setIsFormOpen(true)
  }

  function openEditForm(task: Task) {
    setEditingTask(task)
    setDraft({ title: task.title, course_id: task.course_id ?? '', due_at: toDateInput(task.due_at), effort_minutes: task.effort_minutes?.toString() ?? '', importance: String(task.importance) as TaskDraft['importance'] })
    setMessage('')
    setIsFormOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !draft.title.trim()) return
    setIsSaving(true)
    setMessage('')
    const values = { title: draft.title.trim(), course_id: draft.course_id || null, due_at: draft.due_at ? `${draft.due_at}T23:59:59` : null, effort_minutes: draft.effort_minutes ? Number(draft.effort_minutes) : null, importance: Number(draft.importance) }
    let result
    if (editingTask) {
      result = await supabase.from('tasks').update(values).eq('id', editingTask.id).select().single()
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsSaving(false); setMessage('Your session has expired. Please log in again.'); return }
      result = await supabase.from('tasks').insert({ ...values, user_id: user.id, inbox_item_id: initialInboxItem?.id ?? null }).select().single()
    }
    setIsSaving(false)
    if (result.error) { console.error('Task save error:', result.error); setMessage('Could not save this task. Check the details and try again.'); return }
    const saved = result.data as Task
    setTasks((items) => editingTask ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved].sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999')))
    setIsFormOpen(false)
    setDraft(emptyDraft)
    if (initialInboxItem) onInboxProcessed?.(initialInboxItem.id)
  }

  async function updateStatus(task: Task, status: 'completed' | 'archived') {
    if (!supabase) return
    const values = status === 'completed' ? { status, completed_at: new Date().toISOString() } : { status, archived_at: new Date().toISOString() }
    const { error } = await supabase.from('tasks').update(values).eq('id', task.id)
    if (error) { console.error('Task status error:', error); setMessage('Could not update this task. Try again.'); return }
    setTasks((items) => items.filter((item) => item.id !== task.id))
  }

  function formatDue(value: string | null) {
    if (!value) return 'No deadline'
    const date = new Date(value)
    return date < new Date() ? `Overdue · ${date.toLocaleDateString()}` : `Due ${date.toLocaleDateString()}`
  }

  return <div className="page-wrap tasks-page"><section className="page-heading"><div><p className="eyebrow accent-text">ACADEMIC RESPONSIBILITIES</p><h1>Your tasks.</h1><p className="heading-subtitle">Turn deadlines into a clear next action.</p></div><button className="primary-button" type="button" onClick={() => openCreateForm()}>+ Add task</button></section>{message && <div className="course-message" role="alert">{message}</div>}{isLoading ? <div className="course-state">Loading your tasks...</div> : tasks.length === 0 ? <div className="course-empty"><span className="empty-mark">+</span><h2>Your task list is clear.</h2><p>Capture something in Inbox or add a structured responsibility here.</p><button className="primary-button" type="button" onClick={() => openCreateForm()}>Add a task <span>-&gt;</span></button></div> : <div className="task-list">{tasks.map((task) => { const course = courses.find((item) => item.id === task.course_id); return <article className="task-item" key={task.id}><button className="task-check" type="button" aria-label={`Complete ${task.title}`} onClick={() => void updateStatus(task, 'completed')}> </button><div className="task-main"><h2>{task.title}</h2><div className="task-meta"><span>{course?.code || course?.name || 'Unassigned'}</span><span className={task.due_at && new Date(task.due_at) < new Date() ? 'overdue-text' : ''}>{formatDue(task.due_at)}</span><span>{task.effort_minutes ? `${task.effort_minutes} min` : 'Effort unestimated'}</span></div></div><span className={`importance importance-${task.importance}`}>{task.importance === 3 ? 'High' : task.importance === 2 ? 'Medium' : 'Low'}</span><button className="text-button" type="button" onClick={() => openEditForm(task)}>Edit</button><button className="quiet-button" type="button" onClick={() => void updateStatus(task, 'archived')}>Archive</button></article> })}</div>}{isFormOpen && <div className="modal-backdrop" role="presentation"><div className="course-modal task-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title"><div className="section-heading"><div><p className="eyebrow accent-text">TASK CONTEXT</p><h2 id="task-form-title">{editingTask ? 'Edit task' : 'Add a task'}</h2></div><button className="modal-close" type="button" onClick={() => setIsFormOpen(false)} aria-label="Close">x</button></div><form className="course-form" onSubmit={handleSubmit}><label>Task title<input autoFocus required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What needs to be done?" /></label><label>Course <span>(optional)</span><select value={draft.course_id} onChange={(event) => setDraft({ ...draft, course_id: event.target.value })}><option value="">No course yet</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ''}{course.name}</option>)}</select></label><label>Due date <span>(optional)</span><input type="date" value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })} /></label><label>Estimated effort in minutes <span>(optional)</span><input min="1" max="1440" type="number" value={draft.effort_minutes} onChange={(event) => setDraft({ ...draft, effort_minutes: event.target.value })} placeholder="e.g. 90" /></label><label>Importance<select value={draft.importance} onChange={(event) => setDraft({ ...draft, importance: event.target.value as TaskDraft['importance'] })}><option value="1">Low</option><option value="2">Medium</option><option value="3">High</option></select></label><div className="modal-actions"><button className="quiet-button" type="button" onClick={() => setIsFormOpen(false)}>Cancel</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving...' : editingTask ? 'Save changes' : 'Add task'}</button></div></form></div></div>}</div>
}
