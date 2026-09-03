import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

import { AuthScreen } from './AuthScreen'

describe('AuthScreen', () => {
  it('allows a demo login when Supabase is not configured', () => {
    const onAuthenticated = vi.fn()

    render(<AuthScreen onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@nexus.test' } })
    fireEvent.change(screen.getByPlaceholderText('Masukkan password Anda'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }))

    expect(onAuthenticated).toHaveBeenCalledTimes(1)
  })

  it('shows placeholder guidance and toggles password visibility', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} />)

    expect(screen.getByPlaceholderText('contoh: student@nexus.test')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Masukkan password Anda')).toBeInTheDocument()

    const passwordInput = screen.getByPlaceholderText('Masukkan password Anda')
    const toggle = screen.getByRole('button', { name: /tampilkan password/i })

    expect(passwordInput).toHaveAttribute('type', 'password')
    fireEvent.click(toggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
