import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

describe('LazyVim Key-Dojo', () => {
  it('renders practice mode by default', () => {
    render(<App />)
    expect(screen.getByText('LazyVim Key-Dojo')).toBeInTheDocument()
    expect(screen.getByTestId('mode-tag')).toHaveTextContent('稽古')
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument()
  })

  it('accepts correct input sequence and updates score', async () => {
    render(<App />)

    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'f' })

    expect(screen.getByTestId('score-value')).toHaveTextContent('10')
    expect(screen.getByTestId('correct-value')).toHaveTextContent('3')
    expect(screen.getByTestId('wrong-value')).toHaveTextContent('0')
  })

  it('finishes time attack and shows result overlay', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(0))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '早駆け' }))
    fireEvent.click(screen.getByRole('button', { name: '30s' }))
    fireEvent.click(screen.getByTestId('start-button'))

    await act(async () => {
      vi.advanceTimersByTime(31000)
    })

    expect(screen.getByText('リザルト')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('switches language to English', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Time Attack' }))

    expect(screen.getByText('Mode')).toBeInTheDocument()
    expect(screen.getByText('Start')).toBeInTheDocument()
  })
})
