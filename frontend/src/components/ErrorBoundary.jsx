import { Component } from 'react'

/** Catches render errors anywhere below it so a bug shows a recovery screen instead of a white page. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-canvas">
        <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
        <p className="text-ink-3 max-w-md">
          The page hit an unexpected error. You can try again, or reload the app.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-outline" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="btn btn-dark" onClick={() => window.location.assign('/')}>
            Go to home page
          </button>
        </div>
      </div>
    )
  }
}
