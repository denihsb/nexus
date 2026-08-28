import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type InboxItem = {
  id: string
  user_id: string
  raw_text: string
  status: 'unprocessed' | 'processed' | 'archived'
  captured_at: string
  processed_at: string | null
}

type InboxPageProps = { onCountChange?: (count: number) => void }

export function InboxPage({ onCountChange }: InboxPageProps) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [capture, setCapture] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    if (!supabase) return
    supabase.from('inbox_items').select('*').eq('status', 'unprocessed').order('captured_at', { ascending: false }).then(({ data, error }) => {
      if (!isMounted) return
      setIsLoading(false)
      if (error) {
        console.error('Inbox loading error:', error)
        setMessage('Could not load your inbox. Check your connection and try again.')
        return
      }
      const nextItems = data as InboxItem[]
      setItems(nextItems)
      onCountChange?.(nextItems.length)
    })
    return () => { isMounted = false }
  }, [onCountChange])

  async function handleCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const rawText = capture.trim()
    if (!rawText) return
    setIsSaving(true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsSaving(false)
      setMessage('Your session has expired. Please log in again.')
      return
    }
    const { data, error } = await supabase.from('inbox_items').insert({ raw_text: rawText, user_id: user.id }).select().single()
    setIsSaving(false)
    if (error) {
      console.error('Inbox capture error:', error)
      setMessage('Could not save this capture. Check your connection and try again.')
      return
    }
    const nextItems = [data as InboxItem, ...items]
    setItems(nextItems)
    onCountChange?.(nextItems.length)
    setCapture('')
  }

  async function updateItem(id: string, status: 'processed' | 'archived') {
    if (!supabase) return
    const values = status === 'processed' ? { status, processed_at: new Date().toISOString() } : { status }
    const { error } = await supabase.from('inbox_items').update(values).eq('id', id)
    if (error) {
      console.error('Inbox update error:', error)
      setMessage('Could not update this item. Try again.')
      return
    }
    const nextItems = items.filter((item) => item.id !== id)
    setItems(nextItems)
    onCountChange?.(nextItems.length)
  }

  return <div className="page-wrap inbox-page"><section className="page-heading"><div><p className="eyebrow accent-text">UNPROCESSED INFORMATION</p><h1>Your inbox.</h1><p className="heading-subtitle">Capture now. Add context when you have the space.</p></div></section><form className="inbox-capture" onSubmit={handleCapture}><span className="capture-plus" aria-hidden="true">+</span><input autoFocus aria-label="Capture academic information" maxLength={500} value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="What do you need to remember?" /><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving...' : 'Capture'}</button></form>{message && <div className="course-message" role="alert">{message}</div>}<div className="inbox-heading"><div><p className="eyebrow">TO ORGANIZE</p><h2>{items.length} {items.length === 1 ? 'item' : 'items'} waiting for context</h2></div></div>{isLoading ? <div className="course-state">Loading your inbox...</div> : items.length === 0 ? <div className="course-empty"><span className="empty-mark">+</span><h2>Nothing needs organizing right now.</h2><p>Capture a message, deadline, or reminder whenever it arrives.</p></div> : <div className="inbox-list">{items.map((item) => <article className="inbox-item" key={item.id}><div className="inbox-item-mark" aria-hidden="true">+</div><div className="inbox-item-content"><p>{item.raw_text}</p><span>Captured {new Date(item.captured_at).toLocaleDateString()}</span></div><div className="inbox-actions"><button className="text-button" type="button" onClick={() => void updateItem(item.id, 'processed')}>Add context</button><button className="quiet-button" type="button" onClick={() => void updateItem(item.id, 'archived')}>Archive</button></div></article>)}</div>}</div>
}
