import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { restoreSession } from '../../lib/api'

/**
 * OAuth2 callback page. After Google login, the backend sets the HttpOnly
 * refresh cookie and redirects here with NO token in the URL. This page calls
 * POST /auth/refresh to obtain the access token (same as a page reload), then
 * navigates home. On failure, redirects to /login.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const me = await restoreSession()
        if (!cancelled && me) {
          navigate('/', { replace: true })
        } else if (!cancelled) {
          navigate('/login', { replace: true })
        }
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return null
}
