import { useEffect, useState } from 'react'
import { clearDemoAuthentication, persistDemoAuthentication } from '../../lib/demoStore'
import { supabase } from '../../lib/supabase'

type SettingsPageProps = {
  onSignOut: () => void
  displayName?: string
  email?: string
}

export function SettingsPage({ onSignOut, displayName: initialDisplayName = '', email: initialEmail = '' }: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [email, setEmail] = useState(initialEmail)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
      const { data: profile } = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
      if (profile?.display_name) setDisplayName(profile.display_name)
    })
  }, [])
  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    clearDemoAuthentication()
    persistDemoAuthentication(false)
    onSignOut()
  }

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <p className="eyebrow accent-text">ACCOUNT</p>
          <h1>Pengaturan.</h1>
          <p className="heading-subtitle">Atur ruang akademik Anda agar tetap personal dan terarah.</p>
        </div>
      </section>

      <div className="lower-grid">
        <div className="pulse-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">PROFIL</p>
              <h2>{displayName || 'Your profile'}</h2>
            </div>
          </div>
          <p className="pulse-copy">
            <strong>Akun mahasiswa</strong>
            <br />
            {email || 'Account email unavailable'}
          </p>
        </div>

        <div className="load-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">PREFERENSI</p>
              <h2>Ritme belajar</h2>
            </div>
          </div>

          <div className="upcoming-list">
            <div className="upcoming-item">
              <div className="date-block"><strong>UTC</strong><span>Timezone</span></div>
              <div className="upcoming-detail"><strong>Local campus time</strong><span>Syncs to your local calendar</span></div>
            </div>
            <div className="upcoming-item">
              <div className="date-block"><strong>Mon</strong><span>Week</span></div>
              <div className="upcoming-detail"><strong>Academic week starts</strong><span>Monday-first planning</span></div>
            </div>
          </div>
        </div>
      </div>

      <section className="focus-section" aria-labelledby="settings-actions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACTIONS</p>
            <h2 id="settings-actions-title">Account controls</h2>
          </div>
        </div>
        <div className="focus-content">
          <div>
            <p className="focus-reason">Manage your account session and sign out when you are finished.</p>
          </div>
          <button className="primary-button" type="button" onClick={handleSignOut}>Log out <span>-&gt;</span></button>
        </div>
      </section>
    </div>
  )
}
