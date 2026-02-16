# Cartographix — Product Requirements Document

**Version:** 1.0
**Date:** February 15, 2026
**Author:** Radman Rakhshandehroo
**Status:** Draft

---

## 1. Overview

Cartographix is an open-source web application that transforms any city in the world into a beautiful, stylized map poster. Users enter a city name, select a visual theme, customize parameters, and receive a high-resolution poster delivered to their email.

The project serves two purposes: a polished portfolio piece demonstrating full-stack engineering and deployment skills, and a genuinely useful open-source tool for the community.

**Based on:** [MapToPoster](https://github.com/originalankur/maptoposter) by Ankur Kumar — a Python script using OSMnx, Nominatim, and matplotlib to generate styled city map posters from OpenStreetMap data.

---

## 2. Goals & Non-Goals

### Goals

- Deliver a production-quality web experience on top of the existing MapToPoster generation engine
- Zero-friction usage: no accounts, no sign-ups — enter an email and get your poster
- Showcase full-stack skills: React frontend, FastAPI backend, Docker containerization, Railway deployment, transactional email integration
- Open-source the entire stack for community contribution
- Build an extensible architecture that supports future output formats (wallpapers, social graphics) without rewriting core systems

### Non-Goals (V1)

- User accounts, authentication, or saved poster history
- Payment processing or monetization
- Print-on-demand / physical poster fulfillment
- Real-time preview rendering in the browser (generation happens server-side)
- Mobile-native apps

---

## 3. Target Users

| Persona | Description |
|---------|-------------|
| **City enthusiast** | Wants a unique piece of art representing their hometown, travel destination, or a meaningful location |
| **Gift giver** | Looking for a personalized, low-effort gift — "a poster of the city where we met" |
| **Designer / developer** | Curious about the tool, may fork and customize, interested in the open-source stack |
| **Portfolio reviewer** | Hiring manager or PhD admissions committee evaluating Radman's engineering work |

---

## 4. User Flow

```
Landing Page
    │
    ├── Hero: example poster + tagline
    │
    ▼
Input Form
    │
    ├── City / Country input (text, with autocomplete)
    ├── Theme selector (17 visual theme cards with previews)
    ├── Distance slider (controls map radius in meters)
    ├── Email address input
    │
    ▼
Generate (button)
    │
    ├── POST /api/generate
    ├── Returns job_id immediately
    │
    ▼
Waiting State
    │
    ├── "Your poster is being created..."
    ├── Estimated time: ~30–120 seconds
    ├── Progress indicator (animated, not real-time %)
    │
    ▼
Completion
    │
    ├── Backend renders poster → emails PNG via Resend
    ├── Frontend shows: "Check your email! ✉️"
    ├── Option to generate another
    │
    ▼
Email Received
    │
    └── Subject: "Your Cartographix poster of [City] is ready"
        └── Poster attached as high-res PNG
```

---

## 5. Feature Specification

### 5.1 Core Features (V1)

#### City & Country Input
- Text input field for city name
- Optional country field for disambiguation (e.g., "Portland" → Portland, OR vs Portland, ME)
- Geocoding via Nominatim (already in MapToPoster codebase)
- Graceful error handling for unrecognized locations

#### Theme Selection
- 17 themes from the existing codebase displayed as visual cards
- Each card shows a small preview of that theme's color palette / style
- Themes: `default`, `classic`, `midnight`, `ocean`, `forest`, `sunset`, `neon`, `pastel`, `monochrome`, `vintage`, `arctic`, `desert`, `cyberpunk`, `watercolor`, `blueprint`, `autumn`, `minimal`
- Single-select interaction

#### Distance Control
- Slider input controlling the map's radius from city center (in meters)
- Range: 1,000m – 50,000m (matching existing codebase defaults)
- Default: 10,000m
- Visual label showing current value

#### Email Delivery
- Email input field with validation
- Poster delivered as PNG attachment via Resend API
- Email template: clean, branded, includes city name and theme in subject
- No marketing content, no newsletter opt-in — just the poster

#### Rate Limiting
- Soft limit: 3 poster generations per email address per 24 hours
- Enforced server-side via in-memory store (Redis optional for persistence)
- Friendly messaging when limit hit: "You've generated 3 posters today — come back tomorrow!"
- No hard block — this is a portfolio project, not a SaaS paywall

### 5.2 Extensible Features (V2+)

These are NOT built in V1 but the architecture must support adding them without major refactoring.

#### Output Formats
- **Wall art / print-ready:** High-DPI PNG or PDF at standard print sizes (A4, A3, 24x36")
- **Phone/desktop wallpapers:** Pre-sized outputs (1080x1920, 2560x1440, etc.)
- **Social media graphics:** Instagram square (1080x1080), story (1080x1920), Twitter header (1500x500)

#### Additional Customization
- Custom poster title text (e.g., "NEW YORK" → "Our First Home")
- Color overrides (background color, street color, water color)
- Paper size selection for print-ready output
- Show/hide coordinate display on the poster
- Font selection for title text

#### Other Future Possibilities
- Direct download option alongside email
- Gallery of community-generated posters (opt-in)
- Shareable poster links
- Poster generation API for developers

---

## 6. Technical Architecture

### 6.1 System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Railway                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          Single Docker Container             │   │
│  │                                              │   │
│  │  ┌──────────────┐    ┌───────────────────┐  │   │
│  │  │ React SPA    │    │ FastAPI Backend    │  │   │
│  │  │ (static)     │    │                   │  │   │
│  │  │              │    │  /api/generate     │  │   │
│  │  │ - Input form │    │  /api/status/:id   │  │   │
│  │  │ - Theme cards│    │  /api/health       │  │   │
│  │  │ - Status UI  │    │                   │  │   │
│  │  └──────┬───────┘    │  Background Tasks  │  │   │
│  │         │            │  ┌───────────────┐ │  │   │
│  │         │  serves    │  │ MapToPoster   │ │  │   │
│  │         │  static    │  │ Engine        │ │  │   │
│  │         │  files     │  │ (OSMnx +      │ │  │   │
│  │         ◄────────────┤  │  matplotlib)  │ │  │   │
│  │                      │  └───────────────┘ │  │   │
│  │                      └─────────┬──────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                   │                  │
└───────────────────────────────────│──────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Resend API   │
                            │  (email)      │
                            └───────────────┘
```

### 6.2 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React (Vite) + shadcn/ui | Fast build, pre-built polished components, Stripe/Vercel aesthetic out of the box |
| **Backend** | FastAPI (Python) | Async support, same language as MapToPoster engine, automatic API docs |
| **Poster Engine** | OSMnx + Nominatim + matplotlib | Existing MapToPoster codebase — proven, open-source |
| **Email** | Resend API | Developer-friendly, 3,000 free emails/month, simple Python SDK |
| **Container** | Docker | Single container serves frontend + backend, portable |
| **Deployment** | Railway | Auto-scaling, usage-based pricing, GitHub CI/CD, no timeout limits |
| **Rate Limiting** | In-memory dict (upgrade to Redis if needed) | Simple, no external dependency for V1 |

### 6.3 API Endpoints

#### `POST /api/generate`

Request:
```json
{
  "city": "Tokyo",
  "country": "Japan",
  "theme": "midnight",
  "distance": 10000,
  "email": "user@example.com"
}
```

Response:
```json
{
  "job_id": "abc-123-def",
  "status": "queued",
  "estimated_seconds": 60
}
```

#### `GET /api/status/{job_id}`

Response:
```json
{
  "job_id": "abc-123-def",
  "status": "completed",
  "city": "Tokyo",
  "theme": "midnight"
}
```

Status values: `queued` → `processing` → `completed` | `failed`

#### `GET /api/themes`

Returns list of available themes with metadata for the frontend theme cards.

```json
{
  "themes": [
    {
      "id": "midnight",
      "name": "Midnight",
      "description": "Dark blue streets on black background",
      "preview_colors": ["#000000", "#1a1a2e", "#16213e", "#0f3460"]
    }
  ]
}
```

#### `GET /api/health`

Health check for Railway monitoring.

### 6.4 Background Task Processing

Poster generation takes 30–120 seconds — far too long for a synchronous HTTP request. The backend uses FastAPI's `BackgroundTasks` for V1:

1. `POST /api/generate` validates input, creates job record, returns `job_id` immediately
2. Background task picks up the job:
   - Calls the MapToPoster engine with user parameters
   - On success: sends email via Resend with PNG attachment
   - On failure: updates job status to `failed`
3. Frontend polls `GET /api/status/{job_id}` every 5 seconds until `completed` or `failed`

**V2 upgrade path:** If concurrent load requires it, swap `BackgroundTasks` for Celery + Redis worker queue. The API contract stays identical.

### 6.5 Docker Configuration

Single-stage build is not viable due to heavy geospatial dependencies. Multi-stage Dockerfile:

- **Stage 1 (build-frontend):** Node image, builds React app to static files
- **Stage 2 (runtime):** Python image with GDAL, geopandas, OSMnx, matplotlib. Copies built React files. Runs FastAPI via uvicorn.

Key dependencies requiring special handling:
- `GDAL` — system-level install via `apt-get`
- `geopandas` — depends on GDAL
- `OSMnx` — network access to Nominatim at runtime
- `matplotlib` — large install, non-interactive backend (`Agg`)

Estimated image size: ~1.5–2GB (geospatial stack is heavy)

### 6.6 Railway Configuration

- **Service:** Single web service from Docker image
- **Deploy:** Auto-deploy on push to `main` branch
- **Domain:** `cartographix.up.railway.app` (upgrade to custom subdomain later)
- **Environment variables:** `RESEND_API_KEY`, `ENVIRONMENT` (dev/prod)
- **Scaling:** Railway auto-scales CPU/memory based on load
- **Sleep:** Enable serverless mode — service sleeps after 10min of no requests, wakes on next request
- **Spend limit:** Set a monthly cap to prevent surprise bills

---

## 7. Frontend Specification

### 7.1 Design Philosophy

**Visual identity:** Light, clean, Apple-style minimalism inspired by Stripe and Vercel's marketing pages. Generous whitespace, elegant typography, restrained color palette. The posters are the art — the UI stays out of the way.

**Key principles:**
- **Spacious:** Large padding, breathing room between elements, no cramming
- **Typographic hierarchy:** Big bold headings, subtle body text, clear visual weight
- **Restrained color:** Near-white backgrounds (#FAFAFA / #F8F9FA), one accent color for CTAs, grays for secondary elements
- **Let the maps shine:** Poster previews and theme cards are the only colorful elements on the page
- **Micro-interactions:** Subtle hover effects, smooth state transitions, button feedback — polished but not distracting

### 7.2 Page Structure

**Recommended layout: Split hero → form flow**

This combines the editorial feel of Stripe/Vercel marketing pages with a functional generation tool. Single page, no routing needed.

```
┌─────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
│  Logo (left)              GitHub link · About (right)    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HERO SECTION                                            │
│                                                          │
│  "Turn any city into art."                               │
│  Subtitle: one-liner about what Cartographix does        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │   Featured poster example                          │   │
│  │   (pre-rendered, rotating between themes)          │   │
│  │   Slight shadow / float effect                     │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ↓ Scroll indicator                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GENERATOR SECTION                                       │
│                                                          │
│  Section heading: "Create your poster"                   │
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │                     │  │                          │  │
│  │  INPUT FORM         │  │  LIVE PREVIEW AREA       │  │
│  │                     │  │                          │  │
│  │  City ____________  │  │  Shows a static example  │  │
│  │  Country __________ │  │  poster matching the     │  │
│  │                     │  │  currently selected      │  │
│  │  Theme:             │  │  theme (pre-rendered)    │  │
│  │  ┌──┐┌──┐┌──┐┌──┐ │  │                          │  │
│  │  │  ││  ││  ││  │ │  │  Updates when user        │  │
│  │  └──┘└──┘└──┘└──┘ │  │  selects a new theme      │  │
│  │  ┌──┐┌──┐┌──┐┌──┐ │  │                          │  │
│  │  │  ││  ││  ││  │ │  │                          │  │
│  │  └──┘└──┘└──┘└──┘ │  │                          │  │
│  │  (more rows...)    │  │                          │  │
│  │                     │  │                          │  │
│  │  Distance ──●────── │  │                          │  │
│  │  Email ____________ │  │                          │  │
│  │                     │  │                          │  │
│  │  [ Generate Poster ]│  │                          │  │
│  │                     │  │                          │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HOW IT WORKS (optional — 3-step strip)                  │
│                                                          │
│  1. Choose a city    2. Pick a theme    3. Get it        │
│     & theme             & style            by email      │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FOOTER                                                  │
│  Open source · GitHub · Built by Radman                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Mobile layout:** Stacks vertically. Preview area moves below the form or hides. Theme grid becomes 3 per row. Full-width inputs.

### 7.3 Application States

The generator section transitions between states with smooth fade/slide animations:

| State | UI Change |
|-------|-----------|
| **Default** | Form visible, preview area shows example poster |
| **Generating** | Form fades to a centered waiting state: animated spinner or pulse, "Creating your poster of [City]...", estimated time. Preview area shows the selected theme example |
| **Complete** | Success state: checkmark animation, "Your poster of [City] is on its way! Check your email.", "Create another" button |
| **Error** | Inline error with red accent, specific message ("City not found", "Generation failed — try a smaller distance"), retry button |
| **Rate limited** | Friendly message: "You've created 3 posters today — come back tomorrow for more!", no retry button |

### 7.4 Theme Selector Design

**Color swatch cards** — 17 themes displayed in a compact, scrollable grid.

Each card:
- Fixed size: ~80px × 56px (small, so all 17 fit without scrolling on desktop)
- Shows 4 horizontal color bands representing the theme's palette (background, primary street, secondary street, accent)
- Theme name in small text below the card
- **Default state:** Subtle border (#E5E7EB), slight rounded corners (8px)
- **Hover:** Card lifts slightly (translateY -2px), subtle shadow appears, border darkens
- **Selected:** Accent-colored border (2px), subtle glow/ring effect, checkmark badge in corner

Grid layout:
- Desktop: 6 per row (3 rows fits all 17)
- Tablet: 4 per row
- Mobile: 3 per row

Color data for each theme is served by `GET /api/themes` and used to render the swatch bands dynamically.

### 7.5 Input Fields Design

Following Stripe/Vercel input field patterns:

- **Label:** Small, gray, above the field (not placeholder text — accessible)
- **Input:** Clean border (#E5E7EB), rounded (8px), generous padding (12px 16px)
- **Focus state:** Border transitions to accent color, subtle outer glow
- **Error state:** Border turns red, error message appears below in red text
- **Font:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, etc.)

**Distance slider:**
- Custom-styled range input matching the overall aesthetic
- Current value displayed in a floating label above the thumb
- Min/max labels at the ends ("1 km" / "50 km")

**Generate button:**
- Full-width within the form column
- Solid accent color background (suggest: #0A0A0A black or #2563EB blue)
- White text, medium weight
- Rounded (8px)
- Hover: slight darken + lift
- Click: press-down effect
- Disabled state while generating (grayed out, loading spinner replaces text)

### 7.6 Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Hero heading | Inter or system | 48–64px | 700 (bold) | #0A0A0A |
| Hero subtitle | Inter or system | 18–20px | 400 | #6B7280 |
| Section heading | Inter or system | 32–36px | 600 | #0A0A0A |
| Form labels | Inter or system | 14px | 500 | #6B7280 |
| Form inputs | Inter or system | 16px | 400 | #0A0A0A |
| Body text | Inter or system | 16px | 400 | #374151 |
| Small/caption | Inter or system | 12–13px | 400 | #9CA3AF |

**Note:** Use system font stack for V1 (zero network requests for fonts). Upgrade to Inter via Google Fonts if desired — it's the closest to SF Pro and matches the Stripe/Vercel feel.

### 7.7 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | #FFFFFF | Page background |
| `--bg-secondary` | #F8F9FA | Section backgrounds, cards |
| `--bg-tertiary` | #F1F3F5 | Input backgrounds, hover states |
| `--text-primary` | #0A0A0A | Headings, primary text |
| `--text-secondary` | #6B7280 | Subtitles, labels |
| `--text-tertiary` | #9CA3AF | Captions, placeholders |
| `--border` | #E5E7EB | Input borders, card borders |
| `--accent` | #0A0A0A | Primary button, selected states |
| `--accent-hover` | #1A1A1A | Button hover |
| `--success` | #10B981 | Completion state |
| `--error` | #EF4444 | Error states |

Intentionally monochromatic — the only color comes from the theme swatch cards and poster previews.

### 7.8 Micro-interactions

| Element | Interaction | Animation |
|---------|-------------|-----------|
| Theme cards | Hover | translateY(-2px), shadow fade in, 150ms ease |
| Theme cards | Select | Border color transition, scale(1.02), 200ms ease |
| Generate button | Hover | Background darken, translateY(-1px), 150ms ease |
| Generate button | Click | scale(0.98), 100ms ease, then release |
| Generate button | Loading | Text fades to spinner, 300ms transition |
| Form → Generating | State change | Form slides left / fades, waiting state slides in, 400ms ease |
| Generating → Complete | State change | Spinner morphs to checkmark, green fade in, 500ms ease |
| Input focus | Focus | Border color transition, subtle ring, 150ms ease |
| Poster preview | Theme change | Crossfade between poster images, 300ms ease |
| Scroll indicator | Idle | Gentle bounce animation, 2s infinite |

### 7.9 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥1024px) | Split layout: form left, preview right. 6 theme cards per row |
| Tablet (768–1023px) | Stacked: form above, preview below. 4 theme cards per row |
| Mobile (<768px) | Single column. Preview hidden or minimal. 3 theme cards per row. Full-width inputs |

### 7.10 Design References

- **Primary inspiration:** [QrGPT](https://www.qrgpt.io/) — same UX pattern (input → generate → receive output), clean single-page layout, minimal UI where the generated art is the star
- **Aesthetic benchmark:** Stripe and Vercel marketing pages — spacious, editorial typography, restrained color, generous whitespace
- **Component approach:** Use shadcn/ui's pre-built components rather than hand-styling every element — they already match the Stripe/Vercel look out of the box

### 7.11 Frontend Tech

- **React** via Vite (fast dev server, optimized production builds)
- **shadcn/ui** for pre-built, accessible components (inputs, buttons, sliders, cards, dialogs) — built on Radix UI primitives with Tailwind styling. Gives us the polished Stripe/Vercel aesthetic without writing custom CSS for every focus ring, hover state, and transition
- **Tailwind CSS** for utility-first styling and shadcn/ui's foundation
- **Framer Motion** for micro-interactions and state transitions (lightweight, React-native)
- **No state management library** — useState + useReducer is sufficient
- **Fetch API** for backend communication (no axios)
- **No router** — single page, state-driven UI

---

## 8. Email Specification

### 8.1 Provider: Resend

- Free tier: 3,000 emails/month (sufficient for portfolio project traffic)
- API key stored as Railway environment variable
- Python SDK: `resend` package

### 8.2 Email Content

**Subject:** `Your Cartographix poster of [City] is ready`

**Body:**
- Clean, minimal HTML template
- Preview of what was generated (city, theme, distance)
- PNG attached (not embedded — attachment ensures full resolution)
- Footer: link to Cartographix, open-source repo link
- No tracking pixels, no marketing, no unsubscribe (it's transactional, not a newsletter)

### 8.3 Attachment Limits

- Resend attachment limit: 40MB per email
- Typical poster PNG: 2–8MB depending on complexity
- If poster exceeds limit: compress or reduce DPI before sending

---

## 9. Rate Limiting Specification

| Rule | Value |
|------|-------|
| Limit per email | 3 generations per 24-hour rolling window |
| Enforcement | Server-side, keyed by email address |
| Storage | In-memory dictionary with TTL (V1), Redis (V2) |
| Response when limited | HTTP 429 with friendly JSON message |
| Reset | Rolling window — each generation expires 24 hours after it was made |

**Note:** This is a soft limit to prevent abuse, not a paywall. The goal is to stop someone from scripting 10,000 poster generations, not to restrict normal users.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nominatim rate limiting | Poster generation fails for geocoding | Respect Nominatim usage policy (1 req/sec), add retry with backoff |
| Large Docker image (~2GB) | Slow deploys, high memory on Railway | Multi-stage build, minimize layers, only install required packages |
| Poster generation timeout | User gets no poster | Set max timeout at 180s, fail gracefully with "try a smaller distance" message |
| Resend free tier exhaustion | Emails stop sending | Monitor usage, alert at 80% of monthly limit, degrade to "generation complete but email unavailable" |
| Abuse / spam generation | High Railway bills, Nominatim blocks | Rate limiting by email + IP, Railway spend cap |
| Railway cold starts (serverless) | First request after sleep takes 10–30s | Accept the tradeoff for cost savings, or disable sleep if traffic warrants |

---

## 11. Success Metrics

Since this is a portfolio project, success is measured differently than a SaaS product:

| Metric | Target |
|--------|--------|
| **Works reliably** | Any city, any theme generates a poster and delivers via email |
| **Deploy is clean** | Single `git push` → live on Railway, no manual steps |
| **Load time** | Landing page loads in < 2 seconds |
| **Generation time** | 90% of posters complete in < 90 seconds |
| **Email delivery** | 99%+ of generated posters successfully delivered |
| **Code quality** | Clean enough for open-source — README, docstrings, type hints |
| **Extensibility** | Adding a new output format requires changes in ≤ 2 files |

---

## 12. Build Phases

### Phase 1: Engine & Container (Week 1)
- Fork MapToPoster, restructure for module imports
- Dockerfile that builds and runs poster generation
- Verify all 17 themes work in container
- Local testing: script generates poster from CLI inside Docker

### Phase 2: Backend API (Week 1–2)
- FastAPI app with `/generate`, `/status`, `/themes`, `/health`
- Background task processing for poster generation
- Resend email integration with PNG attachment
- Rate limiting by email address
- Error handling and input validation

### Phase 3: Frontend (Week 2–3)
- React SPA with Vite + Tailwind
- City/country input with basic validation
- Theme selector grid with color previews
- Distance slider
- Email input
- Generate button → waiting state → completion state
- Responsive layout, dark mode

### Phase 4: Integration & Deploy (Week 3)
- Combine frontend build into Docker container
- FastAPI serves React static files + API
- Push to GitHub → Railway auto-deploys
- Environment variables configured
- Custom domain (optional): `cartographix.radman.dev` or similar
- End-to-end testing: city input → email received with poster

### Phase 5: Polish (Week 4)
- README with screenshots, architecture diagram, setup instructions
- Pre-rendered theme previews for the frontend
- Error edge cases (invalid city, network failures, large distance)
- Performance optimization (caching geocoding results, image compression)
- Open-source prep: LICENSE, CONTRIBUTING.md, issue templates

---

## 13. Open-Source Strategy

- **License:** MIT
- **Repository:** Public GitHub repo under Radman's account
- **README:** Hero screenshot, one-click Railway deploy button, local dev setup, architecture overview
- **Contributing:** Issue templates for bug reports and feature requests, contribution guide
- **Attribution:** Credit to original MapToPoster repo by Ankur Kumar

---

## 14. Future Roadmap (Post-V1)

| Priority | Feature | Effort |
|----------|---------|--------|
| High | Output format selector (wallpaper, social, print sizes) | Medium |
| High | Custom poster title text | Low |
| Medium | Live preview (low-res render before email) | High |
| Medium | Color customization (override theme colors) | Medium |
| Medium | Direct download option alongside email | Low |
| Low | Gallery of community posters | Medium |
| Low | Shareable poster links | Medium |
| Low | Public API with documentation | Medium |
| Low | Internationalization (UI in multiple languages) | Low |