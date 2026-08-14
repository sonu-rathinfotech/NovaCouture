import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Minimal async-data hook. Deliberately not a caching layer — if the catalogue
 * grows enough to need one, reach for TanStack Query rather than growing this.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })

  // The dependency list IS provided — it is the `deps` argument, forwarded
  // below. Both linters flag it because they cannot follow a dynamic array
  // through a parameter, so the effect looks dependency-free to them. Callers
  // must pass a stable list, exactly as they would to useEffect directly.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))

    fn()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, loading: false, error })
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
