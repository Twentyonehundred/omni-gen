'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * SignalTracker
 *
 * Client-side component that listens for behavioral signals and records them as events.
 * Automatically tracks: rage clicks, copy, form interactions, text selection,
 * right-clicks, tab visibility, scroll patterns, hovers, dead clicks, form abandonment.
 */

export function SignalTracker() {
  const clickHistory = useRef<Array<{ element: string; timestamp: number }>>([])
  const hoverTimers = useRef<Map<string, number>>(new Map())
  const formValues = useRef<Map<string, string>>(new Map())
  const eventQueue = useRef<Array<{ type: string; data?: Record<string, any> }>>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Wait for session to be ready
  useEffect(() => {
    const checkSession = () => {
      const id = sessionStorage.getItem('omni_session_id')
      if (id) {
        console.log('✅ SignalTracker: Session ready', id)
        setSessionId(id)
        return true
      }
      return false
    }

    if (checkSession()) return

    console.log('⚠️ SignalTracker: Waiting for session...')
    const interval = setInterval(() => {
      if (checkSession()) {
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    console.log('✅ SignalTracker: Attaching listeners with session', sessionId)

    /**
     * Queue signal event (will be sent in batches)
     */
    const recordSignal = (type: string, data?: Record<string, any>) => {
      console.log('📡 Signal queued:', type, data)
      eventQueue.current.push({ type, data })

      // Auto-flush if queue gets large
      if (eventQueue.current.length >= 10) {
        flushQueue()
      }
    }

    /**
     * Send queued signals to backend
     */
    const flushQueue = () => {
      if (eventQueue.current.length === 0) return

      const eventsToSend = [...eventQueue.current]
      eventQueue.current = []

      console.log(`📤 Flushing ${eventsToSend.length} signals`)

      // Send all events in a single batch
      Promise.all(
        eventsToSend.map(({ type, data }) => {
          const eventData = {
            session_id: sessionId,
            event_type: type,
            timestamp: new Date().toISOString(),
            element_id: data?.element || type,
            element_type: type,
            page_path: window.location.pathname,
            metadata: data,
          }

          return fetch('/api/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
          }).catch(err => {
            console.error('❌ Failed to record signal:', type, err)
          })
        })
      ).then(() => {
        console.log(`✅ Flushed ${eventsToSend.length} signals`)
      })
    }

    // Flush queue every 3 seconds
    const flushInterval = setInterval(flushQueue, 3000)

    // ===== CLICK TRACKING =====
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const elementId = target.id || target.tagName.toLowerCase()

      // Track click in history
      clickHistory.current.push({ element: elementId, timestamp: Date.now() })

      // Keep only last 10 clicks
      if (clickHistory.current.length > 10) {
        clickHistory.current.shift()
      }

      // Detect rage clicks (3+ clicks on same element within 2 seconds)
      const recentClicks = clickHistory.current.filter(
        c => c.element === elementId && Date.now() - c.timestamp < 2000
      )
      if (recentClicks.length >= 3) {
        recordSignal('rage_click', { element: elementId })
      }

      // Detect dead clicks (clicked non-interactive element)
      const isInteractive = target.matches('a, button, input, select, textarea, [onclick], [role="button"]')
      if (!isInteractive && !target.closest('a, button, input, select, textarea')) {
        recordSignal('dead_click', { element: elementId })
      }
    }

    // ===== COPY TRACKING =====
    const handleCopy = () => {
      const selection = window.getSelection()?.toString()
      if (selection && selection.length > 0) {
        recordSignal('copy', { text_length: selection.length })
      }
    }

    // ===== TEXT SELECTION =====
    let selectionTimeout: NodeJS.Timeout
    const handleSelectionChange = () => {
      clearTimeout(selectionTimeout)
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection()?.toString()
        if (selection && selection.length > 10) { // Only track meaningful selections
          recordSignal('text_select', { text_length: selection.length })
        }
      }, 500) // Debounce to 500ms
    }

    // ===== CONTEXT MENU (RIGHT CLICK) =====
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      recordSignal('contextmenu', { element: target.id || target.tagName.toLowerCase() })
    }

    // ===== FORM INTERACTIONS =====
    const handleFormFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.matches('input, textarea, select')) {
        const fieldName = (target as HTMLInputElement).name || target.id || 'unnamed'
        recordSignal('form_focus', { field: fieldName })

        // Track initial value for abandonment detection
        formValues.current.set(fieldName, (target as HTMLInputElement).value)
      }
    }

    const handleFormBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.matches('input, textarea, select')) {
        const fieldName = (target as HTMLInputElement).name || target.id || 'unnamed'
        const initialValue = formValues.current.get(fieldName) || ''
        const currentValue = (target as HTMLInputElement).value

        // Detect form abandonment (had value, now empty OR typed then deleted)
        if (initialValue !== currentValue && currentValue === '') {
          recordSignal('form_abandon', { field: fieldName })
        }
      }
    }

    // ===== TAB VISIBILITY =====
    const handleVisibilityChange = () => {
      recordSignal('visibility_change', { visible: !document.hidden })
    }

    // ===== HOVER TRACKING =====
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.matches('a, button, [role="button"]')) return // Only track interactive elements

      const elementId = target.id || target.tagName.toLowerCase()
      const enterTime = Date.now()

      hoverTimers.current.set(elementId, enterTime)
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const elementId = target.id || target.tagName.toLowerCase()
      const enterTime = hoverTimers.current.get(elementId)

      if (enterTime) {
        const duration = Date.now() - enterTime
        hoverTimers.current.delete(elementId)

        // Track significant hovers (2+ seconds)
        if (duration >= 2000) {
          recordSignal('hover', { element: elementId, duration })
        }
      }
    }

    // ===== SCROLL TRACKING (enhanced) =====
    let lastScrollDepth = 0
    let lastScrollTime = Date.now()
    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      const depth = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      const currentTime = Date.now()

      // Debounce: only record scroll events every 1 second
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        // Send scroll event with depth data (needed for signal detection)
        recordSignal('scroll', { depth, timestamp: currentTime })

        // Detect scroll reversal (scrolled up significantly)
        if (depth < lastScrollDepth - 20) {
          recordSignal('scroll_reversal', { from: lastScrollDepth, to: depth })
        }

        lastScrollDepth = depth
        lastScrollTime = currentTime
      }, 1000) // Only fire once per second
    }

    // Attach listeners
    document.addEventListener('click', handleClick)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('focusin', handleFormFocus)
    document.addEventListener('focusout', handleFormBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('mouseover', handleMouseEnter, true) // Use capture for better coverage
    document.addEventListener('mouseout', handleMouseLeave, true)
    window.addEventListener('scroll', handleScroll)

    return () => {
      clearInterval(flushInterval)
      flushQueue() // Final flush on cleanup

      document.removeEventListener('click', handleClick)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('focusin', handleFormFocus)
      document.removeEventListener('focusout', handleFormBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('mouseover', handleMouseEnter, true)
      document.removeEventListener('mouseout', handleMouseLeave, true)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [sessionId])

  return null // This component doesn't render anything
}
