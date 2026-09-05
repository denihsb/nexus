import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

import { AuthScreen } from './AuthScreen'

describe('AuthScreen', () => {
  it('does not authenticate when Supabase is unavailable', () => {
    const onAuthenticated = vi.fn()

    render(<AuthScreen onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@nexus.test' } })
    fireEvent.change(screen.getByPlaceholderText('Masukkan password Anda'), { target: { value: 'password123' } })
    expect(screen.getByRole('button', { name: /masuk/i })).toBeDisabled()

    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('shows neutral unavailable guidance and toggles password visibility', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} />)

    expect(screen.getByText('Layanan masuk sedang disiapkan.')).toBeInTheDocument()
    expect(screen.queryByText(/project|demo|\.env/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('contoh: student@nexus.test')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Masukkan password Anda')).toBeInTheDocument()

    const passwordInput = screen.getByPlaceholderText('Masukkan password Anda')
    const toggle = screen.getByRole('button', { name: /tampilkan password/i })

    expect(passwordInput).toHaveAttribute('type', 'password')
    fireEvent.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
