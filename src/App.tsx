import { useEffect, useState } from 'react'
import { buildFocusSuggestion } from './domain/priority'
import { computeDailyWorkload } from './domain/workload'
import { AuthScreen } from './features/auth/AuthScreen'
import { CoursesPage } from './features/courses/CoursesPage'
import { InboxPage } from './features/inbox/InboxPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TasksPage } from './features/tasks/TasksPage'
import type { InboxItem } from './features/inbox/InboxPage'
import type { Task } from './features/tasks/TasksPage'
import { getDemoInbox, isDemoAuthenticated, isMissingSupabaseTableError, persistDemoAuthentication, setDemoInbox } from './lib/demoStore'
import { supabase } from './lib/supabase'
import { formatDateOnly, timestampToDateInput } from './lib/dateOnly'
import './App.css'

type View = 'Today' | 'Inbox' | 'Tasks' | 'Timeline' | 'Workload' | 'Courses' | 'Settings'

const navigation: { label: View; icon: string }[] = [
  { label: 'Today', icon: 'O' }, { label: 'Inbox', icon: 'I' }, { label: 'Tasks', icon: 'T' },
  { label: 'Timeline', icon: 'L' }, { label: 'Workload', icon: 'W' }, { label: 'Courses', icon: 'C' },
  { label: 'Settings', icon: 'S' },
]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => (!supabase ? isDemoAuthenticated() : false))
  const [activeView, setActiveView] = useState<View>('Today')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [recommendationIndex, setRecommendationIndex] = useState(0)
  const [contextualizingItem, setContextualizingItem] = useState<InboxItem | null>(null)
  const [capture, setCapture] = useState('')
  const [inboxCount, setInboxCount] = useState(() => (!supabase ? getDemoInbox<InboxItem[]>([]).length : 0))
  const [profileName, setProfileName] = useState('')
  const [liveTasks, setLiveTasks] = useState<Task[]>([])
  const [isLiveData, setIsLiveData] = useState(Boolean(supabase))
  const openTasks = liveTasks.filter((task) => task.status === 'open')
  const focusSource = openTasks
  const focusSuggestions = buildFocusSuggestion(focusSource).slice(0, 2)
  const focusSuggestion = focusSuggestions[recommendationIndex] ?? { id: 'empty', title: 'Tangkap tugas pertama', score: 0, explanation: ['Belum ada tugas aktif'] }
  const weekLoad = computeDailyWorkload(openTasks, 7)
  const heaviestDay = openTasks.length > 0 ? weekLoad.reduce((heavy, item) => item.value > heavy.value ? item : heavy, weekLoad[0] ?? { day: '', value: 0 }) : { day: '', value: 0 }
  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase()
  const timelineSource = openTasks.filter((task) => task.due_at).map((task) => {
    const dueDate = new Date(task.due_at as string)
    return {
      day: new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(dueDate),
      date: formatDateOnly(task.due_at),
      title: task.title,
      detail: task.effort_minutes ? `${task.effort_minutes} minutes estimated` : 'Open task',
      time: '',
    }
  })
  const today = new Date()
  const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayTasks = openTasks.filter((task) => timestampToDateInput(task.due_at) === todayInput)
  const upcomingTasks = openTasks.filter((task) => task.due_at && (timestampToDateInput(task.due_at) as string) >= todayInput).slice(0, 4)
  const upcoming = upcomingTasks.map((task) => {
    const dueDate = new Date(task.due_at as string)
    return {
      date: `${new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(dueDate)}, ${formatDateOnly(task.due_at)}`,
      title: task.title,
      course: 'Open task',
      effort: task.effort_minutes ? `${Math.round(task.effort_minutes / 60)}h` : 'Flexible',
    }
  })
  const timelineEmptyState = timelineSource.length > 0 ? timelineSource : [{ day: '', date: '', title: 'Your timeline is clear.', detail: 'Add a due date to a task to see it here.', time: '' }]
  const timelineItemsWithEmptyState = timelineEmptyState
  const workloadSummary = openTasks.length === 0 ? [] : [
    { label: 'Open tasks', value: openTasks.length, tone: 'teal' },
    { label: 'Minutes planned', value: openTasks.reduce((total, task) => total + (task.effort_minutes ?? 0), 0), tone: 'amber' },
    { label: 'Scheduled days', value: new Set(openTasks.filter((task) => task.due_at).map((task) => new Date(task.due_at as string).toDateString())).size, tone: 'coral' },
  ]

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session))
      if (data.session?.user) {
        setProfileName(data.session.user.user_metadata?.display_name || data.session.user.email?.split('@')[0] || '')
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setIsAuthenticated(Boolean(session)))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !isAuthenticated) return
    const client = supabase
    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setProfileName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
      const { data: profile } = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
      if (profile?.display_name) setProfileName(profile.display_name)
    })
  }, [isAuthenticated])

  useEffect(() => {
    setRecommendationIndex(0)
  }, [liveTasks])

  useEffect(() => {
    if (!isAuthenticated) return
    if (!supabase) {
      setLiveTasks([])
      setIsLiveData(true)
      return
    }

    let isMounted = true
    const refreshTasks = () => supabase.from('tasks').select('*').eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Today task loading error:', error)
        if (isMissingSupabaseTableError(error)) {
          setLiveTasks([])
          setIsLiveData(true)
        }
        return
      }
      setLiveTasks((data ?? []) as Task[])
      setIsLiveData(true)
    })
    refreshTasks()
    window.addEventListener('nexus:tasks-changed', refreshTasks)
    return () => { isMounted = false; window.removeEventListener('nexus:tasks-changed', refreshTasks) }
  }, [isAuthenticated])


  useEffect(() => {
    if (!supabase) {
      setInboxCount(getDemoInbox<InboxItem[]>([]).length)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return <AuthScreen onAuthenticated={() => { persistDemoAuthentication(true); setIsAuthenticated(true) }} />

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }
    persistDemoAuthentication(false)
    setIsAuthenticated(false)
    setActiveView('Today')
    setContextualizingItem(null)
    setCapture('')
    setIsMoreOpen(false)
  }

  async function handleCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = capture.trim()
    if (!value) return

    if (!supabase) {
      const items = getDemoInbox<InboxItem[]>([])
      const nextItem: InboxItem = {
        id: crypto.randomUUID(),
        user_id: 'demo-user',
        raw_text: value,
        status: 'unprocessed',
        captured_at: new Date().toISOString(),
        processed_at: null,
      }
      const nextItems = [nextItem, ...items]
      setDemoInbox(nextItems)
      setInboxCount(nextItems.length)
      setCapture('')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('inbox_items').insert({ raw_text: value, user_id: user.id })
    if (error) {
      console.error('Today capture error:', error)
      return
    }
    setInboxCount((count) => count + 1)
    setCapture('')
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">+</span><span>NEXUS</span></div>
      <div className="workspace-label">MY ACADEMIC SPACE</div>
      <nav aria-label="Primary navigation">{navigation.map((item) => <button className={`nav-item ${activeView === item.label ? 'active' : ''}`} key={item.label} onClick={() => setActiveView(item.label)} type="button"><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{item.label === 'Inbox' && inboxCount > 0 && <span className="nav-count">{inboxCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">{(profileName || 'U').slice(0, 2).toUpperCase()}</div><div><strong>{profileName || 'Your account'}</strong><span>Student account</span></div><span className="profile-more">...</span></div></div>
    </aside>
    <main className="main-content">
      <button className="menu-toggle" type="button" aria-label="Open navigation" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}><span aria-hidden="true">☰</span></button>
      {isMenuOpen && <div className="menu-panel">{navigation.map((item) => <button className={activeView === item.label ? 'active' : ''} key={item.label} type="button" onClick={() => { setActiveView(item.label); setIsMenuOpen(false) }}>{item.label}</button>)}</div>}
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">+</span>NEXUS</div><div className="date-context"><span className="eyebrow">{todayLabel}</span><span className="live-dot">{isLiveData ? 'Synced with your account' : 'Your week is taking shape · Demo workspace'}</span></div><button className="notification-button" type="button" aria-label="Notifications">*</button></header>
      {activeView === 'Courses' ? <CoursesPage /> : activeView === 'Tasks' ? <TasksPage initialInboxItem={contextualizingItem} onInboxProcessed={(id) => { setContextualizingItem(null); setInboxCount((count) => Math.max(0, count - (id ? 1 : 0))) }} /> : activeView === 'Inbox' ? <InboxPage onCountChange={setInboxCount} onContextualize={(item) => { setContextualizingItem(item); setActiveView('Tasks') }} /> : activeView === 'Timeline' ? <div className="page-wrap"><section className="page-heading"><div><p className="eyebrow accent-text">NEXT STEPS</p><h1>Your timeline.</h1><p className="heading-subtitle">The next few days are mapped so your focus stays realistic.</p></div><button className="primary-button" type="button" onClick={() => setActiveView('Today')}>Back to today <span>-&gt;</span></button></section><div className="inbox-list">{timelineItemsWithEmptyState.map((item) => <article className="inbox-item" key={`${item.day}-${item.title}`}><div className="inbox-item-mark" aria-hidden="true">•</div><div className="inbox-item-content"><p>{item.title}</p><span>{item.day}, {item.date} · {item.time}</span></div><div className="inbox-actions"><span className="muted-label">{item.detail}</span></div></article>)}</div></div> : activeView === 'Workload' ? <div className="page-wrap"><section className="page-heading"><div><p className="eyebrow accent-text">SHOWING THE SCALE</p><h1>Your workload.</h1><p className="heading-subtitle">A quick read of how your week is distributed.</p></div><button className="primary-button" type="button" onClick={() => setActiveView('Today')}>Back to today <span>-&gt;</span></button></section><div className="lower-grid"><div className="load-panel"><div className="section-heading compact"><div><p className="eyebrow">WEEK LOAD</p><h2>Effort by day</h2></div><span className="muted-label">Next 7 days</span></div><div className="load-chart">{weekLoad.map((item, index) => <div className="load-bar" key={`${item.day}-${index}`}><span className="bar-track"><i style={{ height: `${item.value}%` }} /></span><small>{item.day}</small></div>)}</div></div><div className="pulse-panel"><div className="section-heading compact"><div><p className="eyebrow">BALANCE</p><h2>What the week looks like</h2></div></div>{workloadSummary.map((item) => <div className="upcoming-item" key={item.label}><div className="date-block"><strong>{item.value}</strong><span>{item.label}</span></div><div className="upcoming-detail"><strong>{item.tone === 'teal' ? 'Stable rhythm' : item.tone === 'amber' ? 'Needs attention' : 'High focus'}</strong><span>{item.tone === 'teal' ? 'Good pacing across class blocks.' : item.tone === 'amber' ? 'A few deadlines are clustered.' : 'Protect concentration blocks this week.'}</span></div></div>)}</div></div></div> : activeView === 'Settings' ? <SettingsPage onSignOut={handleSignOut} /> : activeView === 'Today' ? <div className="page-wrap">
        <section className="page-heading"><div><p className="eyebrow accent-text">YOUR FOCUS</p><h1>Good morning, {profileName || 'there'}.</h1><p className="heading-subtitle">Here is what deserves your attention today.</p></div><button className="text-button" type="button">View week <span>-&gt;</span></button></section>
        <section className="focus-section" aria-labelledby="focus-title"><div className="section-heading"><div><p className="eyebrow">WHAT MATTERS</p><h2 id="focus-title">{focusSuggestion.title}</h2></div><span className="focus-badge">Recommended</span></div><div className="focus-content"><div><p className="focus-reason">This recommendation is based on urgency, effort, and your current workload. It is the most actionable choice for the next session.</p><div className="reason-list">{focusSuggestion.explanation.map((item) => <span key={item}><b className="reason-dot coral" />{item}</span>)}</div></div><button className="primary-button" type="button" onClick={() => setActiveView('Tasks')}>Start planning <span>-&gt;</span></button></div></section>
        <div className="content-grid"><section aria-labelledby="today-title"><div className="section-heading compact"><div><p className="eyebrow">TODAY</p><h2 id="today-title">Your day at a glance</h2></div><span className="muted-label">{todayTasks.length} {todayTasks.length === 1 ? 'item' : 'items'}</span></div><div className="schedule">{todayTasks.length === 0 ? <p className="empty-inline">No tasks due today. Use the space to rest or get ahead.</p> : todayTasks.map((task) => <div className="schedule-row" key={task.id}><span className="schedule-time">{task.due_at ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(task.due_at)) : '--'}</span><span className="schedule-line" /><div><strong>{task.title}</strong><span className="schedule-meta">{task.effort_minutes ? `${task.effort_minutes} min estimated` : 'Open task'} <i>Task</i></span></div></div>)}</div><form className="capture-form" onSubmit={handleCapture}><span className="capture-plus">+</span><input aria-label="Quick capture" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Capture something for later..." /><button type="submit">Capture</button></form></section>
        <section aria-labelledby="upcoming-title"><div className="section-heading compact"><div><p className="eyebrow">COMING UP</p><h2 id="upcoming-title">Next on your radar</h2></div><button className="icon-button" type="button" aria-label="Open timeline" onClick={() => setActiveView('Timeline')}>-&gt;</button></div><div className="upcoming-list">{upcoming.length === 0 ? <p className="empty-inline">Nothing scheduled yet. Your next chapter is still yours to shape.</p> : upcoming.map((item) => <div className="upcoming-item" key={item.title}><div className="date-block"><strong>{item.date.split(',')[0]}</strong><span>{item.date.split(',')[1]}</span></div><div className="upcoming-detail"><strong>{item.title}</strong><span>{item.course} <b>{item.effort}</b></span></div></div>)}</div></section></div>
        <section className="lower-grid"><div className="pulse-panel"><div className="section-heading compact"><div><p className="eyebrow">ACADEMIC PULSE</p><h2>A useful read on your week</h2></div><span className="pulse-spark">~</span></div><p className="pulse-copy"><strong>{heaviestDay.day} is your heaviest day.</strong> This workload estimate updates with your current task mix and nearest deadlines.</p><button className="text-button" type="button" onClick={() => setActiveView('Workload')}>See workload <span>-&gt;</span></button></div><div className="load-panel"><div className="section-heading compact"><div><p className="eyebrow">WEEK LOAD</p><h2>Effort by day</h2></div><span className="muted-label">Next 7 days</span></div><div className="load-chart">{weekLoad.map((item, index) => { const isHeavy = item.day === heaviestDay.day && item.value === heaviestDay.value; return <div className={`load-bar ${isHeavy ? 'is-heavy' : ''}`} key={`${item.day}-${index}`}><span className="bar-track"><i style={{ height: `${item.value}%` }} /></span><small>{item.day}</small></div> })}</div><div className="chart-legend"><span><i className="legend-dot" />Planned effort</span><button className="text-button" type="button" onClick={() => setActiveView('Workload')}>Open workload <span>-&gt;</span></button></div></div></section>
      </div> : <section className="placeholder-view"><p className="eyebrow accent-text">NEXUS FOUNDATION</p><h1>{activeView}</h1><p>This view is ready for the next implementation slice. Your navigation and application shell are in place.</p><button className="primary-button" onClick={() => setActiveView('Today')} type="button">Back to Today <span>-&gt;</span></button></section>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.slice(0, 4).map((item) => <button className={activeView === item.label ? 'active' : ''} key={item.label} onClick={() => { setActiveView(item.label); setIsMoreOpen(false) }} type="button"><span>{item.icon}</span>{item.label}</button>)}<button className="mobile-add" type="button" onClick={() => document.querySelector<HTMLInputElement>('.capture-form input')?.focus()} aria-label="Quick capture">+</button><button className={isMoreOpen || ['Workload', 'Courses', 'Settings'].includes(activeView) ? 'active' : ''} type="button" onClick={() => setIsMoreOpen((open) => !open)}><span>...</span>More</button>{isMoreOpen && <div className="mobile-more-menu"><button type="button" onClick={() => { setActiveView('Workload'); setIsMoreOpen(false) }}>Workload</button><button type="button" onClick={() => { setActiveView('Courses'); setIsMoreOpen(false) }}>Courses</button><button type="button" onClick={() => { setActiveView('Settings'); setIsMoreOpen(false) }}>Settings</button></div>}</nav>
  </div>
}
export default App
