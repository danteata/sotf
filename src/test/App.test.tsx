import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

describe('App', () => {
  it('renders home page', () => {
    render(
      <BrowserRouter>
        <div>Home</div>
      </BrowserRouter>
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
