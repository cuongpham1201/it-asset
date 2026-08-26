import { useCallback, useEffect, useRef, useState } from 'react'
import { apiErrorMessage, isAborted, isUnauthorized } from '../services/api-client'

export interface QueryState<T> {
  data: T | undefined
  loading: boolean
  /** User-facing failure message. Undefined while the request succeeded or is still running. */
  error: string | undefined
  /** Re-runs the request. Safe to pass straight to a "Thử lại" button. */
  retry: () => void
}

/**
 * Runs an async loader whenever `deps` change, and exposes the three states every screen
 * needs: loading, error and data. A failed load never leaves stale data on screen pretending
 * to be current — `data` is cleared so callers cannot render "0 tài sản" after an outage.
 */
export function useServerQuery<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[]): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError(undefined)
    loaderRef.current(controller.signal)
      .then(result => { if (active) { setData(result); setError(undefined) } })
      .catch(failure => {
        if (!active || isAborted(failure)) return
        // A 401 is already handled globally by the API client, which sends the user back to
        // the login screen. Showing an inline error on top of that would be noise.
        setData(undefined)
        setError(isUnauthorized(failure) ? undefined : apiErrorMessage(failure))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const retry = useCallback(() => setNonce(value => value + 1), [])
  return { data, loading, error, retry }
}

/** Debounces a rapidly changing value, so typing in a search box does not fire a request per keystroke. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
