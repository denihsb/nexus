import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

type AuthMode = 'login' | 'signup'

type AuthScreenProps = { onAuthenticated: () => void }

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setMessage('')
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName },
              emailRedirectTo: window.location.origin,
            },
          })
      if (result.error) {
        console.error('Supabase authentication error:', result.error)
        const errorMessage = result.error.message.toLowerCase()
        if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
          setMessage('This email is already registered. Try logging in instead.')
        } else if (errorMessage.includes('password')) {
          setMessage('Your password does not meet the current requirements. Use a stronger password and try again.')
        } else if (errorMessage.includes('email')) {
          setMessage('Please check that your email address is valid and try again.')
        } else {
          setMessage('Authentication is unavailable right now. Check the browser console for setup details.')
        }
        return
      }
      if (mode === 'signup' && !result.data.session) {
        setMessage('Account created. Check your email to confirm your account, then log in.')
        setMode('login')
        return
      }
      onAuthenticated()
    } catch (error) {
      console.error('Unexpected authentication error:', error)
      setMessage('Could not reach Supabase. Check your project URL, anon key, and network connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="auth-page"><div className="auth-panel"><div className="brand"><span className="brand-mark">+</span><span>NEXUS</span></div><p className="eyebrow accent-text">ACADEMIC CLARITY</p><h1>{mode === 'login' ? 'Welcome back.' : 'Make sense of your week.'}</h1><p className="auth-intro">Your academic responsibilities, in one calm place.</p>{!isSupabaseConfigured ? <div className="setup-message"><strong>Supabase is not connected yet.</strong><span>Add the values from <code>.env.example</code> to start authentication.</span></div> : <form className="auth-form" onSubmit={handleSubmit}>{mode === 'signup' && <label>Name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className="auth-message" role="status">{message}</p>}<button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'} <span>-&gt;</span></button></form>}<button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</button></div></main>
}
