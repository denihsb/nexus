import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useModalA11y } from './useModalA11y'

function TestDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const ref = useModalA11y<HTMLDivElement>(isOpen, onClose)
  if (!isOpen) return null
  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  )
}

describe('useModalA11y', () => {
  it('moves focus into the dialog when it opens', () => {
    render(<TestDialog isOpen onClose={() => {}} />)
    expect(screen.getByText('First')).toHaveFocus()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<TestDialog isOpen onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previously focused element on close', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { rerender } = render(
      <TestDialog isOpen onClose={() => {}} />,
    )
    expect(trigger).not.toHaveFocus()

    rerender(<TestDialog isOpen={false} onClose={() => {}} />)
    expect(trigger).toHaveFocus()

    document.body.removeChild(trigger)
  })
})
