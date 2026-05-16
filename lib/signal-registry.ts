/**
 * Signal Registry
 *
 * Extensible system for tracking behavioral signals that predict conversion.
 * Add new signals without touching core logic - they automatically feed into
 * conversion path discovery.
 */

export type SignalCategory = 'intent' | 'engagement' | 'friction'

export interface Signal {
  name: string
  description: string
  category: SignalCategory
  weight: number // 0-1, importance for conversion prediction
  detect: (context: SignalContext) => boolean
}

export interface SignalContext {
  events: SignalEvent[]
  sessionStart: number
  currentTime: number
}

export interface SignalEvent {
  type: string
  timestamp: number
  element?: string
  data?: Record<string, any>
}

/**
 * Global Signal Registry
 * Add new signals here - they'll automatically be tracked and analyzed
 */
export const SIGNAL_REGISTRY: Signal[] = [
  // ===== HIGH-VALUE INTENT SIGNALS =====

  {
    name: 'text_copy',
    description: 'Copied text from page',
    category: 'intent',
    weight: 0.7,
    detect: (ctx) => ctx.events.some(e => e.type === 'copy')
  },

  {
    name: 'form_focus',
    description: 'Focused on an input field',
    category: 'intent',
    weight: 0.85,
    detect: (ctx) => ctx.events.some(e => e.type === 'form_focus')
  },

  {
    name: 'text_selection',
    description: 'Selected/highlighted text',
    category: 'intent',
    weight: 0.6,
    detect: (ctx) => ctx.events.some(e => e.type === 'text_select')
  },

  {
    name: 'context_menu',
    description: 'Right-clicked (likely to open in new tab)',
    category: 'intent',
    weight: 0.75,
    detect: (ctx) => ctx.events.some(e => e.type === 'contextmenu')
  },

  // ===== ENGAGEMENT SIGNALS =====
  {
    name: 'tab_return',
    description: 'Left tab and came back',
    category: 'engagement',
    weight: 0.5,
    detect: (ctx) => {
      const visibility = ctx.events.filter(e => e.type === 'visibility_change')
      let hiddenCount = 0
      let returnCount = 0

      for (const event of visibility) {
        if (event.data?.visible === false) hiddenCount++
        if (event.data?.visible === true && hiddenCount > 0) returnCount++
      }

      return returnCount > 0
    }
  },

  {
    name: 'scroll_reversal',
    description: 'Scrolled back up significantly',
    category: 'engagement',
    weight: 0.4,
    detect: (ctx) => {
      const scrolls = ctx.events.filter(e => e.type === 'scroll')

      for (let i = 1; i < scrolls.length; i++) {
        const prev = scrolls[i - 1].data?.depth || 0
        const curr = scrolls[i].data?.depth || 0

        if (prev - curr > 20) { // Scrolled up more than 20%
          return true
        }
      }
      return false
    }
  },

  {
    name: 'slow_scroll',
    description: 'Scrolling through content',
    category: 'engagement',
    weight: 0.5,
    detect: (ctx) => {
      const scrolls = ctx.events.filter(e => e.type === 'scroll')
      return scrolls.length >= 2
    }
  },

  {
    name: 'hover_dwell',
    description: 'Hovered over element',
    category: 'engagement',
    weight: 0.6,
    detect: (ctx) => {
      const hovers = ctx.events.filter(e => e.type === 'hover')
      return hovers.some(h => (h.data?.duration || 0) >= 1000) // Reduced from 2s to 1s
    }
  },

  // ===== FRICTION SIGNALS (NEGATIVE) =====
  {
    name: 'rage_click',
    description: 'Clicked same element 3+ times within 2 seconds',
    category: 'friction',
    weight: 0.8,
    detect: (ctx) => {
      const clicks = ctx.events.filter(e => e.type === 'click')

      for (let i = 0; i < clicks.length - 2; i++) {
        const first = clicks[i]
        const third = clicks[i + 2]

        if (
          first.element === clicks[i + 1].element &&
          first.element === third.element &&
          third.timestamp - first.timestamp < 2000
        ) {
          return true
        }
      }
      return false
    }
  },

  {
    name: 'dead_click',
    description: 'Clicked non-interactive element',
    category: 'friction',
    weight: 0.7,
    detect: (ctx) => ctx.events.some(e => e.type === 'dead_click')
  },

  {
    name: 'form_abandon',
    description: 'Started typing in form then left empty',
    category: 'friction',
    weight: 0.8,
    detect: (ctx) => ctx.events.some(e => e.type === 'form_abandon')
  },

  {
    name: 'rapid_scroll_exit',
    description: 'Scrolled to bottom very quickly',
    category: 'friction',
    weight: 0.6,
    detect: (ctx) => {
      const scrolls = ctx.events.filter(e => e.type === 'scroll')
      if (scrolls.length < 2) return false

      const firstScroll = scrolls[0]
      const lastScroll = scrolls[scrolls.length - 1]
      const timeToBottom = lastScroll.timestamp - firstScroll.timestamp
      const finalDepth = lastScroll.data?.depth || 0

      // Reached 80%+ depth in under 3 seconds = rapid exit behavior
      return finalDepth >= 80 && timeToBottom < 3000
    }
  },
]

/**
 * Evaluate all signals against current behavioral context
 */
export function evaluateSignals(context: SignalContext): {
  firedSignals: string[]
  intentScore: number
  engagementScore: number
  frictionScore: number
} {
  const firedSignals: string[] = []
  let intentScore = 0
  let engagementScore = 0
  let frictionScore = 0

  for (const signal of SIGNAL_REGISTRY) {
    if (signal.detect(context)) {
      firedSignals.push(signal.name)

      switch (signal.category) {
        case 'intent':
          intentScore += signal.weight
          break
        case 'engagement':
          engagementScore += signal.weight
          break
        case 'friction':
          frictionScore += signal.weight
          break
      }
    }
  }

  return {
    firedSignals,
    intentScore,
    engagementScore,
    frictionScore,
  }
}

/**
 * Get signal metadata by name
 */
export function getSignal(name: string): Signal | undefined {
  return SIGNAL_REGISTRY.find(s => s.name === name)
}

/**
 * Get all signals in a category
 */
export function getSignalsByCategory(category: SignalCategory): Signal[] {
  return SIGNAL_REGISTRY.filter(s => s.category === category)
}
