'use client'

import { useEffect, useState, useRef } from 'react'

interface Event {
  timestamp: string
  type: 'signal' | 'conversion' | 'variant' | 'session'
  message: string
}

interface Stats {
  sessionId: string | null
  visitorId: string | null
  eventsCount: number
}

interface SignalData {
  signals: Array<{ name: string; description: string; category: string; weight: number }>
  intentScore: number
  engagementScore: number
  frictionScore: number
}

interface ProgressData {
  likelihood: number
  stage: string
  stageWeight: number
  sessionDuration: number
  pageViews: number
}

interface VariantSelection {
  element: string
  content: string
  reason: string
  timestamp: string
}

export function DebugPanel() {
  const [events, setEvents] = useState<Event[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [stats, setStats] = useState<Stats>({
    sessionId: null,
    visitorId: null,
    eventsCount: 0,
  })
  const [signals, setSignals] = useState<SignalData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [variants, setVariants] = useState<VariantSelection[]>([])
  const eventsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Intercept console logs
  useEffect(() => {
    const originalLog = console.log

    console.log = (...args) => {
      originalLog(...args)
      const message = args.join(' ')

      // Parse variant selections to track current variants
      if (message.includes('Variant selected')) {
        // Format: "✅ Variant selected for element: "content" | reason"
        const match = message.match(/Variant selected for (\w+): ["']([^"']+)["'] \| (.+)/)
        if (match) {
          const [, element, content, reason] = match
          const cleanReason = reason.replace(/📡|🎯|✅|🔍|📊|🎲|✨/g, '').trim()

          setTimeout(() => {
            setVariants(prev => {
              // Replace any existing variant for this element
              const updated = prev.filter(v => v.element !== element)
              return [
                ...updated,
                {
                  element,
                  content,
                  reason: cleanReason,
                  timestamp: new Date().toLocaleTimeString(),
                }
              ].slice(-5) // Keep last 5
            })
          }, 0)
        }
      }

      // Only show variants, conversions, and session creation
      if (
        !message.includes('Variant selected') &&
        !message.includes('PERSONALISING') &&
        !message.includes('Conversion') &&
        !message.includes('converted') &&
        !message.includes('Session created')
      ) {
        return
      }

      let type: 'signal' | 'conversion' | 'variant' | 'session' = 'session'

      if (message.includes('Variant') || message.includes('PERSONALISING')) type = 'variant'
      else if (message.includes('Conversion') || message.includes('converted')) type = 'conversion'

      // Defer setState to avoid render conflicts
      setTimeout(() => {
        addEvent({
          timestamp: new Date().toLocaleTimeString(),
          type,
          message: message.replace(/📡|🎯|✅|🔍|📊|🎲|✨/g, '').trim(),
        })
      }, 0)
    }

    return () => {
      console.log = originalLog
    }
  }, [])

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      const sessionId = sessionStorage.getItem('omni_session_id')
      if (!sessionId) return

      try {
        // Fetch signals
        const signalsRes = await fetch(`/api/signals?session_id=${sessionId}`)
        if (signalsRes.ok) {
          const data = await signalsRes.json()
          setSignals(data)
        }

        // Fetch progress
        const progressRes = await fetch(`/api/progress?session_id=${sessionId}`)
        if (progressRes.ok) {
          const data = await progressRes.json()
          if (data.success && data.progress) {
            setProgress(data.progress)
          }
        }
      } catch (error) {
        // Silent fail
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [])

  // Track session
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        sessionId: sessionStorage.getItem('omni_session_id'),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  function addEvent(event: Event) {
    setEvents(prev => {
      const newEvents = [...prev, event]
      return newEvents.slice(-50) // Keep last 50
    })
    setTimeout(() => {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (!isMounted) return null

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-white text-gray-900 px-4 py-2 rounded shadow-lg hover:shadow-xl transition-shadow z-50 border border-gray-200"
        data-debug-panel="true"
      >
        Debug Panel
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-0 right-0 w-full md:w-[680px] h-[580px] bg-white text-gray-900 shadow-2xl border-l border-t border-gray-200 z-40 flex flex-col"
      data-debug-panel="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Debug Panel</h2>
          {stats.sessionId && (
            <span className="text-xs text-gray-500 font-mono">
              Session: {stats.sessionId.substring(0, 8)}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Live Event Feed */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-700">Live Events</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
            {events.length === 0 ? (
              <div className="text-gray-400 text-xs text-center mt-10">
                No events yet
              </div>
            ) : (
              events.map((event, idx) => (
                <div
                  key={idx}
                  className={`text-xs px-2 py-1.5 rounded ${
                    event.type === 'signal'
                      ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500'
                      : event.type === 'conversion'
                      ? 'bg-green-50 text-green-900 border-l-2 border-green-500'
                      : event.type === 'variant'
                      ? 'bg-purple-50 text-purple-900 border-l-2 border-purple-500'
                      : 'bg-gray-50 text-gray-700 border-l-2 border-gray-300'
                  }`}
                >
                  <span className="text-gray-500 text-[10px] mr-2">
                    {event.timestamp}
                  </span>
                  <span className="font-mono">{event.message}</span>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>

        {/* Metrics Sidebar */}
        <div className="w-72 bg-gray-50 overflow-y-auto">
          {/* Conversion Likelihood */}
          {progress && (
            <div className="p-3 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Conversion Likelihood
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(progress.likelihood * 100).toFixed(0)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.likelihood * 100}%` }}
                />
              </div>

              {/* Stage Explanation */}
              <div className="mb-3 p-2 bg-gray-100 rounded">
                <div className="text-xs text-gray-600 mb-1">
                  <span className="font-medium capitalize">{progress.stage}</span> Stage
                </div>
                <div className="text-[10px] text-gray-500">
                  {progress.stage === 'awareness' && 'Just arrived, exploring'}
                  {progress.stage === 'interest' && 'Showing engagement signals'}
                  {progress.stage === 'consideration' && 'Deep engagement, evaluating'}
                  {progress.stage === 'intent' && 'Strong buying signals detected'}
                  {progress.stage === 'action' && 'Converting or converted'}
                </div>
              </div>

              {/* Calculation Breakdown */}
              {signals && (
                <>
                  <div className="text-xs text-gray-500 mb-2">How we calculate {(progress.likelihood * 100).toFixed(0)}%:</div>
                  <div className="space-y-1.5 text-xs bg-blue-50 p-2 rounded">
                    <div className="flex justify-between items-center font-mono text-[11px]">
                      <span className="text-gray-700">Stage ({progress.stageWeight.toFixed(2)}) × 40%</span>
                      <span className="font-semibold text-gray-900">
                        = {((progress.stageWeight || 0) * 0.4 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-mono text-[11px]">
                      <span className="text-gray-700">Intent ({signals.intentScore.toFixed(2)}) × 30%</span>
                      <span className="font-semibold text-yellow-700">
                        = {(signals.intentScore * 0.3 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-mono text-[11px]">
                      <span className="text-gray-700">Engagement ({signals.engagementScore.toFixed(2)}) × 20%</span>
                      <span className="font-semibold text-green-700">
                        = {(signals.engagementScore * 0.2 * 100).toFixed(0)}%
                      </span>
                    </div>
                    {signals.frictionScore > 0 && (
                      <div className="flex justify-between items-center font-mono text-[11px]">
                        <span className="text-gray-700">Friction ({signals.frictionScore.toFixed(2)}) × -10%</span>
                        <span className="font-semibold text-red-700">
                          = -{(signals.frictionScore * 0.1 * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <div className="border-t border-blue-200 pt-1.5 mt-1.5 flex justify-between items-center font-mono text-[11px]">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-blue-700">
                        {(
                          (progress.stageWeight || 0) * 0.4 * 100 +
                          signals.intentScore * 0.3 * 100 +
                          signals.engagementScore * 0.2 * 100 -
                          (signals.frictionScore || 0) * 0.1 * 100
                        ).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Current Variants */}
          {variants.length > 0 && (
            <div className="p-3 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Current Variants
              </div>
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div key={idx} className="bg-purple-50 border border-purple-200 rounded p-2">
                    <div className="text-[9px] text-purple-600 uppercase font-semibold mb-1">
                      {v.element}
                    </div>
                    <div className="text-xs font-medium text-purple-900 mb-1">
                      "{v.content}"
                    </div>
                    <div className="text-[10px] text-purple-700">
                      {v.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Signals - Moved Up */}
          {signals && signals.signals.length > 0 && (
            <div className="border-b border-gray-200">
              <div className="p-3 pb-2 bg-gray-50">
                <div className="text-xs font-semibold text-gray-700">
                  Active Signals ({signals.signals.length})
                </div>
              </div>
              <div className="p-3 pt-0">
                <div className="space-y-1.5">
                  {signals.signals
                    .sort((a, b) => b.weight - a.weight)
                    .map((signal, idx) => {
                      const isHighImpact = signal.weight >= 0.7
                      return (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1.5 rounded border ${
                            signal.category === 'intent'
                              ? isHighImpact
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-400 border-2'
                                : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                              : signal.category === 'engagement'
                              ? isHighImpact
                                ? 'bg-green-100 text-green-900 border-green-400 border-2'
                                : 'bg-green-50 text-green-800 border-green-200'
                              : isHighImpact
                              ? 'bg-red-100 text-red-900 border-red-400 border-2'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium capitalize">
                              {signal.name.replace(/_/g, ' ')}
                              {isHighImpact && (
                                <span className="ml-1 text-[9px] font-bold">HIGH IMPACT</span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono opacity-75">
                              {(signal.weight * 100).toFixed(0)}
                            </div>
                          </div>
                          <div className="text-[10px] opacity-75 mt-0.5">
                            {signal.description}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}


          {(!signals || signals.signals.length === 0) && (
            <div className="flex-1 flex items-center justify-center p-6 border-b border-gray-200">
              <div className="text-center text-gray-400 text-xs">
                <div className="mb-1 font-medium">No signals detected yet</div>
                <div className="text-[10px]">Scroll, click, or interact with the page</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
