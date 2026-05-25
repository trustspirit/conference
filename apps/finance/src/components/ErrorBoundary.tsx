import { Component, ReactNode } from 'react'
import i18n from 'i18next'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    const t = i18n.t.bind(i18n)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-finance-bg">
        <div className="max-w-md w-full bg-white rounded-lg border border-finance-border p-6 text-center">
          <h1 className="text-xl font-semibold text-finance-text mb-2">
            {t('common.errorBoundaryTitle')}
          </h1>
          <p className="text-sm text-finance-muted mb-4">
            {t('common.errorBoundaryDescription')}
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-left bg-red-50 text-red-700 p-3 rounded mb-4 overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 text-sm border border-finance-border rounded hover:bg-finance-muted-surface"
            >
              {t('common.goHome')}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm bg-finance-accent text-white rounded hover:bg-finance-accent-hover"
            >
              {t('common.reload')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
