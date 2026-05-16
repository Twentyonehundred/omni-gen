# OMNI-GEN

**Autonomous Generative Experience (AGE) System**

A self-optimizing website that uses AI to continuously generate, test, and deploy better user experiences — without human intervention.

## 🎯 The Vision

Imagine a website that:
- **Observes** how visitors behave (scroll patterns, clicks, hesitations)
- **Learns** what different visitor types need (Quick Buyers vs. Researchers)
- **Hypothesizes** what will convert better ("Mobile hero too long - test shorter version")
- **Generates** new variants using AI (headlines, CTAs, full sections)
- **Tests** automatically using multi-armed bandit algorithms
- **Deploys** winners without asking permission
- **Iterates** forever, getting better every day

**All autonomously.** You set the guardrails (fact ledger, brand guidelines). The AI does the rest.

**See the full vision:** [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Free Supabase account ([sign up here](https://supabase.com))
- (Optional) Anthropic & OpenAI API keys for AI variant generation (Phase 4+)

### Setup Instructions

1. **Clone & Install**
   ```bash
   git clone <your-repo-url>
   cd omni-gen
   npm install
   ```

2. **Configure Supabase**
   - Create a new Supabase project
   - Follow instructions in [`supabase/README.md`](supabase/README.md)
   - Run migrations and seed data

3. **Environment Variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

---

## 📊 Current Implementation Status

### ✅ Phase 1: Foundation (COMPLETE)

**What's Built:**
- ✅ Next.js 15 app with TypeScript & Tailwind CSS
- ✅ Supabase database with 8 core tables
- ✅ Genesis Load landing page (< 100ms target)
- ✅ Comprehensive visitor tracking system
- ✅ Multi-armed bandit variant selection
- ✅ 3-page conversion funnel (/, /offer, /convert)
- ✅ Fact Ledger validation system
- ✅ Basic variant rendering infrastructure

**Database Schema:**
- `fact_ledger` - Source of truth (10 seed facts)
- `visitors` - Persistent identity tracking
- `sessions` - Individual visits with context
- `events` - Micro-interaction capture
- `variants` - UI component variations (7 seed variants)
- `variant_assignments` - What was shown to whom
- `hypotheses` - AI investigation tracking
- `behavioral_archetypes` - Visitor clustering

**Tracking Capabilities:**
- Device fingerprinting
- Click, scroll, hover tracking
- Page visibility & dwell time
- Form interactions
- Session context (device, geo, referrer)
- Batch event processing (5s or 20 events)

**Cost Profile (POC):**
- Supabase: Free tier (500MB DB, 2GB bandwidth)
- Vercel: Free tier (100GB bandwidth)
- **Estimated monthly cost: < $5**

### 🔄 Phase 2: Behavioral Profiling (NEXT)
- [ ] Behavioral vectorization (OpenAI embeddings)
- [ ] Visitor archetype clustering
- [ ] Context-aware variant selection
- [ ] Trait discovery algorithms

### 🤖 Phase 3: AI Variant Generation (PLANNED)
- [ ] Claude integration for variant creation
- [ ] Fact Ledger validation layer
- [ ] Automated variant testing pipeline
- [ ] Performance-based variant retirement

### 📈 Phase 4: Investigation Engine (PLANNED)
- [ ] Proxy metric discovery
- [ ] Hypothesis testing framework
- [ ] Autonomous optimization loop
- [ ] Correlation analysis

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Next.js 15 (App Router, React Server Components)
- **Styling:** Tailwind CSS
- **Database:** Supabase (Postgres + pgvector)
- **Deployment:** Vercel Edge Runtime
- **AI (Future):** Anthropic Claude + OpenAI Embeddings

### Data Flow

```
Visitor Lands
    ↓
Generate Fingerprint → Create/Update Visitor → Create Session
    ↓
Fetch Facts from Ledger → Select Variant (Multi-Armed Bandit)
    ↓
Render Page (Server Component, < 100ms)
    ↓
Track All Interactions → Batch Events → Store in Supabase
    ↓
Visitor Converts → Update Variant Performance → Update Archetypes
    ↓
[Future] AI Analyzes Data → Generates New Variants → Tests & Evolves
```

### Key Files

**Core Infrastructure:**
- `lib/supabase.ts` - Database client & TypeScript types
- `lib/fact-ledger.ts` - Truth validation system
- `lib/variant-selector.ts` - Multi-armed bandit algorithm
- `lib/tracking.ts` - Event capture utilities (TBD)

**API Routes (Edge Runtime):**
- `app/api/track/route.ts` - Event ingestion & session management
- `app/api/variant/route.ts` - Variant assignment
- `app/api/convert/route.ts` - Conversion recording

**Pages:**
- `app/page.tsx` - Genesis Load landing (optimized for speed)
- `app/offer/page.tsx` - Product details
- `app/convert/page.tsx` - Conversion page

**Components:**
- `components/TrackingProvider.tsx` - Client-side event capture
- `components/VariantRenderer.tsx` - JSON-to-UI renderer

---

## 🧪 Testing the System

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Visitor Tracking
1. Open http://localhost:3000
2. Click around, scroll, interact
3. Check Supabase dashboard:
   - `visitors` table should have 1 row
   - `sessions` table should have 1 row
   - `events` table should have multiple rows

### 3. Test Variant System
1. Check `variants` table in Supabase
2. Query performance: `SELECT * FROM variants ORDER BY performance_score DESC`
3. Multiple visits should show different headlines (20% random, 80% best performer)

### 4. Test Conversion Flow
1. Navigate: / → /offer → /convert
2. Submit form on /convert
3. Check Supabase:
   - Session should be marked `converted: true`
   - Variant assignments should show `converted: true`
   - Variant `times_converted` should increment

### 5. Verify Genesis Load
1. Set invalid Supabase URL in `.env.local`
2. Restart server
3. Page should still load with fallback facts
4. Re-enable correct URL

---

## 📖 The OMNI-GEN Specification

### Vision Statement
OMNI-GEN is a **post-static web architecture** where the user interface does not exist until it is necessitated by a visitor's intent. It is an autonomous, self-governing system that treats every visitor session as a unique experiment, aimed at discovering the most effective path to a terminal conversion through continuous, unconstrained mutation and scientific investigation.

### The Six Core Pillars (The Logic Gate)

Every interaction within the system must be governed by these six principles:

1. **The Genesis Load**  
   The system must always be capable of serving a high-performance, universally accessible "Safety State" if data is low or the generation engine is offline.

2. **Atomic Assembly**  
   The interface must be assembled from discrete assets (logic, copy, and visual tokens). The system does not "serve pages"; it "resolves intent" through real-time assembly.

3. **Algorithmic Skepticism**  
   The system is required to continuously challenge its own winning variants. It must maintain a persistent "Exploration" budget to prevent stagnation and discover new local maxima.

4. **Accelerated Trait Discovery**  
   The initial stage of any session is dedicated to "Provocation"—serving elements designed to force a user choice or reaction that reveals their psychological or technical persona.

5. **Ruthless Conversion Primacy**  
   Every system mutation is measured against a singular Terminal Conversion Event. Aesthetics and traditional UX patterns are hypotheses, not rules.

6. **The Adversarial Boundary**  
   A structural "Truth Layer" must exist to prevent the system from "cheating." Every output must be validated against a Fact Ledger to ensure 100% accuracy and ethical compliance.

### Functional Requirements

#### 1. Real-Time Contextual Ingestion
The system must capture and vectorize ambient data (environment, network, referral) and active behavioral data (micro-interactions, scroll velocity, engagement heat) without latency. This data must be immediately available for the session's "Reasoning" phase.

**Status:** ✅ Basic tracking implemented. Vectorization planned for Phase 2.

#### 2. The Investigation Engine
The system is authorized to go beyond preset KPIs. It must autonomously investigate correlations between behavioral patterns and final conversions. It is empowered to shift its own intermediate goals (Proxy Metrics) if it mathematically proves they are a more accurate predictor of the Terminal Conversion.

**Status:** 🔄 Database schema ready. Implementation planned for Phase 4.

#### 3. Asynchronous Evolution Factory
The creation of new UI code, layout structures, and narrative pitches happens asynchronously. The system identifies low-performing cohorts, generates novel solutions (unconstrained HTML/CSS/JS), validates them through the Adversarial Boundary, and prepares them for deployment at the Edge.

**Status:** 🔄 Manual variants working. AI generation planned for Phase 3.

#### 4. The Predictive Deployment Matrix
The system must be capable of serving these pre-computed, hyper-personalized variants in milliseconds. The decision of which variant to serve is made at the moment of the request based on the visitor's initial Context Vector.

**Status:** ✅ Multi-armed bandit selection at < 50ms. Context vector integration planned for Phase 2.

### The "Constitution" (Data Layers)

- **The Fact Ledger:** A central, immutable repository of "Ground Truths" about the product, its features, and its legal boundaries. ✅ *Implemented*

- **The Feature Store:** A record of every measured user interaction, vectorized to allow the system to recognize "Behavioral Archetypes" across different sessions. 🔄 *Events stored, vectorization pending*

- **The Hypothesis Log:** A record of the AI's ongoing investigations, detailing which "Proxy Metrics" it is currently testing and why. ✅ *Schema ready, automation pending*

---

## 🔐 Security & Privacy

- Row Level Security (RLS) enabled on all Supabase tables
- Device fingerprinting (not personally identifiable)
- No authentication required for POC
- Service role key never exposed to client
- HTTPS enforced in production (via Vercel)

---

## 🎯 Success Metrics

### Phase 1 (Current)
- ✅ Page load < 100ms (Genesis Load)
- ✅ All interactions tracked
- ✅ Variant assignment working
- ✅ Conversion tracking functional
- ✅ POC cost < $5/month

### Phase 2 (Target)
- [ ] Behavioral archetypes discovered
- [ ] Context-aware variant selection
- [ ] 10%+ improvement in conversion rate

### Phase 3 (Target)
- [ ] AI-generated variants validated
- [ ] 5+ new variants per day
- [ ] Autonomous optimization loop running

---

## 📚 Additional Documentation

- [Supabase Setup Guide](supabase/README.md)
- [Architecture Details](docs/ARCHITECTURE.md) *(coming soon)*
- [API Reference](docs/API.md) *(coming soon)*

---

## 🤝 Contributing

This is currently a private POC. Contribution guidelines will be added when open-sourced.

---

## 📝 License

Proprietary - All rights reserved.

---

## Developer/AI Implementation Note

When building components for OMNI-GEN, prioritize **API-first modularity**. The frontend should be a "dumb" renderer capable of interpreting a JSON-based UI structure. The backend should be a secure orchestration layer that bridges the Fact Ledger, the Interaction Data, and the Generative AI endpoints.

**The system is successful not when it looks "correct," but when it successfully evolves itself to minimize the distance between a user landing and a user converting.**
