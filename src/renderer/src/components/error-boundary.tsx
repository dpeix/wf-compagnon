import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Shown instead of the children after one of them threw while rendering */
  fallback: (reset: () => void) => ReactNode
  /** Rendering is tried again when this changes (new data arrived) */
  resetKey?: unknown
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * Keeps a rendering error inside one screen instead of blanking the whole window (React only
 * offers error boundaries as class components).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('A screen failed to render', error, info.componentStack)
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.reset()
  }

  private readonly reset = (): void => {
    this.setState({ failed: false })
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback(this.reset) : this.props.children
  }
}
