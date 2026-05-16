'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  createProfile,
  addWindow,
  calculateVector,
  shouldRepersonalize,
  markPersonalized,
  type BehavioralProfile,
} from '@/lib/behavior-tracker'

interface VariantProps {
  targetElement: string
  targetPage?: string
  fallback: React.ReactNode
}

export function DynamicVariant({ targetElement, targetPage = '/', fallback }: VariantProps) {
  const [variant, setVariant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [personalized, setPersonalized] = useState(false)

  const profileRef = useRef<BehavioralProfile>(createProfile())
  const startTimeRef = useRef(Date.now())
  const maxScrollDepthRef = useRef(0)
  const clickCountRef = useRef(0)

  // Track behavior continuously
  useEffect(() => {
    const scrollHandler = () => {
      const depth = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, depth)
    }

    const clickHandler = () => {
      clickCountRef.current++
      console.log('Click tracked! Total clicks:', clickCountRef.current)
    }

    window.addEventListener('scroll', scrollHandler)
    document.addEventListener('click', clickHandler)

    // Check behavior every 6 seconds
    const checkInterval = setInterval(async () => {
      const now = Date.now()
      const windowStart = profileRef.current.lastUpdateTime
      const windowEnd = now

      // Add this behavior window to the profile
      profileRef.current = addWindow(
        profileRef.current,
        maxScrollDepthRef.current,
        clickCountRef.current,
        windowStart,
        windowEnd
      )

      const deviceType = window.innerWidth < 768 ? 'mobile' as const : 'desktop' as const
      const currentVector = calculateVector(profileRef.current, deviceType)
      profileRef.current.currentVector = currentVector

      console.log('📊 Behavior window added:', {
        activeWindows: profileRef.current.windows.filter(w => w.isActive).length,
        totalActiveTime: profileRef.current.totalActiveTime.toFixed(1) + 's',
        currentVector,
      })

      // Check if we should (re)personalize
      if (shouldRepersonalize(profileRef.current)) {
        console.log('Requesting personalisation based on accumulated behaviour')
        console.log('  Behavior vector being sent:', currentVector)

        const behavior = {
          scroll_speed: currentVector[0],
          max_scroll_depth: currentVector[1],
          click_count: currentVector[2],
          dwell_time: currentVector[3],
          hover_duration: currentVector[4],
          device_type: deviceType,
        }

        console.log('  Behavior object:', behavior)

        try {
          const sessionId = sessionStorage.getItem('omni_session_id')

          const response = await fetch('/api/personalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              behavior,
              target_element: targetElement,
              session_id: sessionId,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('🎯 Personalisation result:', data)

            // Emit event for debug panel
            const personalisationEvent = new CustomEvent('personalisation-update', {
              detail: {
                confidence: data.confidence || 0,
                similarVisitors: data.similar_count || 0,
                recommendation: data.personalized ? data.variant_content : null,
                matchBreakdown: data.match_breakdown || null,
                hasPersonalized: profileRef.current.hasPersonalized,
              }
            })
            window.dispatchEvent(personalisationEvent)

            // Mark that we've personalized with this vector
            profileRef.current = markPersonalized(profileRef.current, currentVector)

            if (data.personalized && data.variant_content && data.confidence > 0.4) {
              console.log(`✨ Variant selected for ${targetElement}: "${data.variant_content}" | Personalized based on behavior (${(data.confidence * 100).toFixed(0)}% confidence)`)
              console.log(`   Match strength: ${(data.match_breakdown?.overall * 100 || 0).toFixed(0)}%`)
              console.log(`   Reasoning: ${data.reasoning}`)

              // Swap to personalised variant
              setVariant({
                type: targetElement === 'headline' ? 'h1' : 'button',
                className: variant?.className || (targetElement === 'headline'
                  ? 'text-5xl font-bold text-gray-900 mb-4'
                  : 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors'),
                content: data.variant_content,
              })
              setPersonalized(true)
            } else {
              console.log(`   No personalisation: ${data.reasoning}`)
            }
          }
        } catch (error) {
          console.error('❌ Personalisation failed:', error)
        }
      }
    }, 6000) // Check every 6 seconds

    return () => {
      window.removeEventListener('scroll', scrollHandler)
      document.removeEventListener('click', clickHandler)
      clearInterval(checkInterval)
    }
  }, [targetElement, variant])

  useEffect(() => {
    async function fetchVariant() {
      console.log(`🎲 DynamicVariant mounted for ${targetElement}`)

      // Wait for session to be created
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        const sessionId = sessionStorage.getItem('omni_session_id')
        console.log(`  🔍 Attempt ${attempts + 1}/${maxAttempts} - Session ID:`, sessionId || 'not found yet')

        if (sessionId) {
          console.log('🎲 Fetching variant for', targetElement, 'with session:', sessionId)

          try {
            console.log('📡 Calling /api/variant with:', { target_page: targetPage, target_element: targetElement, session_id: sessionId })

            const response = await fetch('/api/variant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                target_page: targetPage,
                target_element: targetElement,
                session_id: sessionId,
              }),
            })

            console.log('📡 Variant API response status:', response.status)

            if (response.ok) {
              const data = await response.json()
              console.log('📡 Variant API response data:', data)
              if (data.variant) {
                const variantText = data.variant.component_code.content
                const reason = data.reason || 'Testing variant'

                console.log(`✅ Variant selected for ${targetElement}: "${variantText}" | ${reason}`)

                setVariant(data.variant.component_code)
              } else {
                console.warn('⚠️ No variant returned from API')
              }
            } else {
              console.error('❌ Variant API returned error:', response.status, await response.text())
            }
          } catch (error) {
            console.error('❌ Failed to fetch variant:', error)
          }

          setLoading(false)
          return
        }

        // Wait 200ms before trying again
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }

      console.warn('⚠️ Session not ready after 2 seconds, using fallback')
      setLoading(false)
    }

    fetchVariant()
  }, [targetElement, targetPage])

  if (loading || !variant) {
    console.log('🔄 DynamicVariant showing fallback for', targetElement, { loading, hasVariant: !!variant })
    return <>{fallback}</>
  }

  console.log('✅ DynamicVariant rendering variant for', targetElement, variant)

  // Render the variant dynamically
  // For CTA variants (buttons), render as Link instead
  if (targetElement === 'cta') {
    console.log('🔗 Rendering CTA variant as Link:', { content: variant.content, href: '/offer' })
    return (
      <div className="relative" style={{ zIndex: 10 }}>
        <Link
          href="/offer"
          data-track-event="cta-click"
          className={`${variant.className} inline-block ${
            personalized
              ? 'ring-2 ring-green-400/50 ring-offset-2 ring-offset-white shadow-lg shadow-green-200/50 transition-all duration-300'
              : ''
          }`}
          data-variant-element={targetElement}
          data-personalized={personalized}
          onClick={(e) => {
            console.log('🖱️ CTA Link clicked!', e)
          }}
        >
          {variant.content}
        </Link>
        {personalized && (
          <div className="absolute -top-8 left-0 text-xs text-green-700 font-semibold bg-green-50 border border-green-300 px-3 py-1.5 rounded-md shadow-sm animate-pulse">
            Personalized for you
          </div>
        )}
      </div>
    )
  }

  // For headline variants, render as the appropriate element
  const Component = variant.type as keyof React.JSX.IntrinsicElements

  return (
    <div className="relative">
      <Component
        className={`${variant.className} ${
          personalized
            ? 'ring-2 ring-green-400/50 ring-offset-2 ring-offset-white shadow-lg shadow-green-200/50 transition-all duration-300'
            : ''
        }`}
        data-variant-element={targetElement}
        data-personalized={personalized}
      >
        {variant.content}
      </Component>
      {personalized && (
        <div className="absolute -top-8 left-0 text-xs text-green-700 font-semibold bg-green-50 border border-green-300 px-3 py-1.5 rounded-md shadow-sm animate-pulse">
          Personalized for you
        </div>
      )}
    </div>
  )
}
