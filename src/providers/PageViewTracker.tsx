import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics } from '../services/analytics'
import { AnalyticsEventType } from '../services/analytics/types'

/**
 * Tracks page views and the initial app-load event.
 *
 * Mount once near the root of the React tree (inside <BrowserRouter>) so it
 * can observe `useLocation()` changes.
 */
export function PageViewTracker() {
    const location = useLocation()
    const firstRender = useRef(true)

    useEffect(() => {
        const path = location.pathname
        const pageName = path === '/' ? 'Home' : path.replace(/^\//, '').split('/')[0] || 'Home'

        if (firstRender.current) {
            const start = performance.now()
            analytics.trackEvent(AnalyticsEventType.APP_INITIALIZED, {
                path,
            })
            analytics.trackEvent(AnalyticsEventType.APP_LOADED, {
                path,
                load_ms: Math.round(performance.now() - start),
            })
            analytics.trackEvent(AnalyticsEventType.SESSION_START, {
                path,
            })
            firstRender.current = false
        }

        analytics.page(pageName, { path, search: location.search })
    }, [location.pathname, location.search])

    return null
}
