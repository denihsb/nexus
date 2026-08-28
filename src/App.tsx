import { useEffect, useState } from 'react'
import { AuthScreen } from './features/auth/AuthScreen'
import { CoursesPage } from './features/courses/CoursesPage'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type View = 'Today' | 'Inbox' | 'Tasks' | 'Timeline' | 'Workload' | 'Courses'

const navigation: { label: View; icon: string }[] = [
  { label: 'Today', icon: 'O' }, { label: 'Inbox', icon: 'I' }, { label: 'Tasks', icon: 'T' },
  { label: 'Timeline', icon: 'L' }, { label: 'Workload', icon: 'W' }, { label: 'Courses', icon: 'C' },
]
const upcoming = [
  { date: 'Sat, Aug 29', title: 'Calculus assignment', course: 'Calculus II', effort: '2h' },
  { date: 'Mon, Aug 31', title: 'Psychology presentation', course: 'Psychology', effort: '3h' },
  { date: 'Wed, Sep 02', title: 'Activity diagram', course: 'RPL', effort: '1h' },
]
const weekLoad = [{ day: 'M', value: 42 }, { day: 'T', value: 68 }, { day: 'W', value: 94 }, { day: 'T', value: 58 }, { day: 'F', value: 35 }, { day: 'S', value: 21 }, { day: 'S', value: 12 }]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseConfigured)
  const [activeView, setActiveView] = useState<View>('Today')
  const [capture, setCapture] = useState('')
  const [capturedItems, setCapturedItems] = useState<string[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setIsAuthenticated(Boolean(data.session)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setIsAuthenticated(Boolean(session)))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isAuthenticated) return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />

  function handleCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = capture.trim()
    if (!value) return
    setCapturedItems((items) => [value, ...items])
    setCapture('')
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">+</span><span>NEXUS</span></div>
      <div className="workspace-label">MY ACADEMIC SPACE</div>
      <nav aria-label="Primary navigation">{navigation.map((item) => <button className={`nav-item ${activeView === item.label ? 'active' : ''}`} key={item.label} onClick={() => setActiveView(item.label)} type="button"><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{item.label === 'Inbox' && capturedItems.length > 0 && <span className="nav-count">{capturedItems.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" type="button"><span className="nav-icon" aria-hidden="true">S</span>Settings</button><div className="profile"><div className="avatar">AR</div><div><strong>Alex Rahman</strong><span>Student account</span></div><span className="profile-more">...</span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">+</span>NEXUS</div><div className="date-context"><span className="eyebrow">FRIDAY, AUGUST 28, 2026</span><span className="live-dot">Your week is taking shape</span></div><button className="notification-button" type="button" aria-label="Notifications">*</button></header>
      {activeView === 'Courses' ? <CoursesPage /> : activeView === 'Today' ? <div className="page-wrap">
        <section className="page-heading"><div><p className="eyebrow accent-text">FRIDAY FOCUS</p><h1>Good morning, Alex.</h1><p className="heading-subtitle">Here is what deserves your attention today.</p></div><button className="text-button" type="button">View week <span>-&gt;</span></button></section>
        <section className="focus-section" aria-labelledby="focus-title"><div className="section-heading"><div><p className="eyebrow">WHAT MATTERS</p><h2 id="focus-title">Start with the RPL project</h2></div><span className="focus-badge">Recommended</span></div><div className="focus-content"><div><p className="focus-reason">It is due tomorrow and needs a little runway. Starting today keeps Wednesday from becoming too heavy.</p><div className="reason-list"><span><b className="reason-dot coral" />Due tomorrow</span><span><b className="reason-dot amber" />High effort</span><span><b className="reason-dot teal" />Schedule is filling up</span></div></div><button className="primary-button" type="button" onClick={() => setActiveView('Tasks')}>Start planning <span>-&gt;</span></button></div></section>
        <div className="content-grid"><section aria-labelledby="today-title"><div className="section-heading compact"><div><p className="eyebrow">TODAY</p><h2 id="today-title">Your day at a glance</h2></div><span className="muted-label">2 items</span></div><div className="schedule"><div className="schedule-row"><span className="schedule-time">10:00</span><span className="schedule-line" /><div><strong>RPL lecture</strong><span className="schedule-meta">Room B-204 <i>Class</i></span></div></div><div className="schedule-row"><span className="schedule-time">14:00</span><span className="schedule-line" /><div><strong>Group meeting</strong><span className="schedule-meta">Project discussion <i>Planned</i></span></div></div></div><form className="capture-form" onSubmit={handleCapture}><span className="capture-plus">+</span><input aria-label="Quick capture" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Capture something for later..." /><button type="submit">Capture</button></form></section>
        <section aria-labelledby="upcoming-title"><div className="section-heading compact"><div><p className="eyebrow">COMING UP</p><h2 id="upcoming-title">Next on your radar</h2></div><button className="icon-button" type="button" aria-label="Open timeline">-&gt;</button></div><div className="upcoming-list">{upcoming.map((item) => <div className="upcoming-item" key={item.title}><div className="date-block"><strong>{item.date.split(',')[0]}</strong><span>{item.date.split(',')[1]}</span></div><div className="upcoming-detail"><strong>{item.title}</strong><span>{item.course} <b>{item.effort}</b></span></div></div>)}</div></section></div>
        <section className="lower-grid"><div className="pulse-panel"><div className="section-heading compact"><div><p className="eyebrow">ACADEMIC PULSE</p><h2>A useful read on your week</h2></div><span className="pulse-spark">~</span></div><p className="pulse-copy"><strong>Wednesday is your heaviest day.</strong> Three high-effort items are due within four days. You have room to get ahead today.</p><button className="text-button" type="button" onClick={() => setActiveView('Workload')}>See workload <span>-&gt;</span></button></div><div className="load-panel"><div className="section-heading compact"><div><p className="eyebrow">WEEK LOAD</p><h2>Effort by day</h2></div><span className="muted-label">Next 7 days</span></div><div className="load-chart">{weekLoad.map((item, index) => <div className="load-bar" key={`${item.day}-${index}`}><span className="bar-track"><i style={{ height: `${item.value}%` }} /></span><small>{item.day}</small></div>)}</div><div className="chart-legend"><span><i className="legend-dot" />Planned effort</span><button className="text-button" type="button" onClick={() => setActiveView('Workload')}>Open workload <span>-&gt;</span></button></div></div></section>
        {capturedItems.length > 0 && <section className="capture-note"><span className="eyebrow">JUST CAPTURED</span><p>{capturedItems[0]}</p><span>Saved to Inbox. Add context when you are ready.</span></section>}
      </div> : <section className="placeholder-view"><p className="eyebrow accent-text">NEXUS FOUNDATION</p><h1>{activeView}</h1><p>This view is ready for the next implementation slice. Your navigation and application shell are in place.</p><button className="primary-button" onClick={() => setActiveView('Today')} type="button">Back to Today <span>-&gt;</span></button></section>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.slice(0, 4).map((item) => <button className={activeView === item.label ? 'active' : ''} key={item.label} onClick={() => setActiveView(item.label)} type="button"><span>{item.icon}</span>{item.label}</button>)}<button className="mobile-add" type="button" onClick={() => document.querySelector<HTMLInputElement>('.capture-form input')?.focus()} aria-label="Quick capture">+</button></nav>
  </div>
}
export default App
