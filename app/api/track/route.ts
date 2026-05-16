import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UAParser } from 'ua-parser-js'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, fingerprint, session_id, events, entry_url, referrer, viewport } = body

    const supabase = createServerSupabaseClient()

    // Initialize session
    if (action === 'init') {
      // Parse user agent
      const ua = new UAParser(request.headers.get('user-agent') || '')
      const device = ua.getDevice()
      const browser = ua.getBrowser()
      const os = ua.getOS()

      // Get geo data from headers (Vercel provides these in production)
      const geo = {
        country: (request as any).geo?.country || request.headers.get('x-vercel-ip-country') || null,
        city: (request as any).geo?.city || request.headers.get('x-vercel-ip-city') || null,
      }

      // Create or update visitor
      let visitor_id: string
      const { data: existingVisitor } = await supabase
        .from('visitors')
        .select('id')
        .eq('fingerprint_hash', fingerprint)
        .single()

      if (existingVisitor) {
        visitor_id = existingVisitor.id
        // Update last_seen and increment sessions
        const { data: currentVisitor } = await supabase
          .from('visitors')
          .select('total_sessions')
          .eq('id', visitor_id)
          .single()

        await supabase
          .from('visitors')
          .update({
            last_seen: new Date().toISOString(),
            total_sessions: (currentVisitor?.total_sessions || 0) + 1,
          })
          .eq('id', visitor_id)
      } else {
        // Create new visitor
        const { data: newVisitor, error } = await supabase
          .from('visitors')
          .insert({
            fingerprint_hash: fingerprint,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            total_sessions: 1,
            total_conversions: 0,
            traits: {},
          })
          .select('id')
          .single()

        if (error) throw error
        visitor_id = newVisitor.id
      }

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          visitor_id,
          started_at: new Date().toISOString(),
          entry_url: entry_url || '',
          referrer: referrer || '',
          device_type: device.type || 'desktop',
          viewport_size: `${viewport.width}x${viewport.height}`,
          geo_country: geo.country,
          geo_city: geo.city,
          converted: false,
          variant_assignments: {},
        })
        .select('id')
        .single()

      if (sessionError) throw sessionError

      return NextResponse.json({
        session_id: session.id,
        visitor_id,
      })
    }

    // Record events
    if (action === 'events' && session_id && events) {
      console.log('📥 Received', events.length, 'events for session:', session_id)

      const eventsToInsert = events.map((event: any) => ({
        session_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        element_id: event.element_id || null,
        element_type: event.element_type || null,
        page_path: event.page_path,
        scroll_depth: event.scroll_depth || null,
        dwell_time: event.dwell_time || null,
        metadata: event.metadata || {},
      }))

      console.log('💾 Inserting events:', JSON.stringify(eventsToInsert, null, 2))

      let data, error
      try {
        const result = await supabase
          .from('events')
          .insert(eventsToInsert)
          .select()
        data = result.data
        error = result.error
      } catch (insertError) {
        console.error('❌ Supabase insert threw exception:', insertError)
        console.error('Exception type:', insertError instanceof Error ? insertError.constructor.name : typeof insertError)
        if (insertError instanceof Error) {
          console.error('Exception message:', insertError.message)
          console.error('Exception stack:', insertError.stack)
        }
        throw new Error(`Supabase insert failed: ${insertError instanceof Error ? insertError.message : String(insertError)}`)
      }

      if (error) {
        console.error('❌ Supabase insert error:', JSON.stringify(error, null, 2))
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw new Error(`Supabase insert failed: ${error.message || error.code || 'unknown'}`)
      }

      console.log('✅ Events inserted successfully:', data?.length)

      return NextResponse.json({ success: true, events_recorded: events.length })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Tracking error:', error)
    console.error('Error type:', typeof error)
    console.error('Error stringified:', JSON.stringify(error, null, 2))

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error)
    }

    return NextResponse.json(
      { error: 'Failed to track', details: errorMessage },
      { status: 500 }
    )
  }
}
