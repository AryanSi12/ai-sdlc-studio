import { useEffect, useState } from 'react'
import { getApiUrl } from '../lib/api'

export function useApiHealth(intervalMs = 8000) {
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function ping() {
      try {
        const res = await fetch(`${getApiUrl()}/health`)
        if (!cancelled) setOk(res.ok)
      } catch {
        if (!cancelled) setOk(false)
      }
    }
    ping()
    const t = setInterval(ping, intervalMs)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [intervalMs])

  return ok
}
