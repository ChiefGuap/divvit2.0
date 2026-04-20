# Divvit — Architecture & Codebase Guide

> **Divvit** is a mobile bill-splitting app built with **Expo / React Native**.
> Users scan a receipt (or enter items manually), invite friends via QR code or deep link,
> assign items to each person, add a tip, pay through Venmo or Cash App, and close the bill.

---

## Table of Contents

1. [File Tree](#file-tree)
2. [Tech Stack at a Glance](#tech-stack-at-a-glance)
3. [High-Level Architecture](#high-level-architecture)
4. [Authentication Flow](#authentication-flow)
5. [Bill Lifecycle (Core User Journey)](#bill-lifecycle-core-user-journey)
6. [Directory-by-Directory Breakdown](#directory-by-directory-breakdown)
   - [Root Config Files](#root-config-files)
   - [app/ — Screens & Navigation](#app--screens--navigation)
   - [components/](#components)
   - [context/](#context)
   - [hooks/](#hooks)
   - [lib/](#lib)
   - [services/](#services)
   - [utils/](#utils)
   - [constants/](#constants)
   - [assets/](#assets)
   - [backend/](#backend--python-fastapi)
   - [supabase/](#supabase)
7. [Database Schema (Supabase)](#database-schema-supabase)
8. [Styling System](#styling-system)
9. [Deep Linking](#deep-linking)
10. [Environment Variables](#environment-variables)
11. [How to Run Locally](#how-to-run-locally)

---

## File Tree

```
divvit2.0/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout: AuthProvider, nav guard, deep links
│   ├── index.tsx                  # Root redirect (login / setup / tabs)
│   ├── +html.tsx                  # Custom HTML shell (web only)
│   ├── +not-found.tsx             # 404 screen
│   ├── modal.tsx                  # Generic modal screen
│   ├── (auth)/                    # Auth group (unauthenticated users)
│   │   ├── _layout.tsx
│   │   ├── login.tsx              # Email / Google / Apple sign-in
│   │   ├── signup.tsx             # Email sign-up
│   │   └── setup.tsx              # Profile setup after first login
│   ├── (tabs)/                    # Main tab bar (authenticated users)
│   │   ├── _layout.tsx            # Tab bar (Home, History, Profile)
│   │   ├── index.tsx              # Home — stats, scan CTA, drafts, activity
│   │   ├── history.tsx            # History — receipt carousel + briefing panel
│   │   └── profile.tsx            # Profile — name, payment handles, logout
│   ├── bill/                      # Bill flow (not in tabs)
│   │   ├── [id].tsx               # Bill Editor — add/edit items, assign to users
│   │   ├── party.tsx              # Party Lobby — QR code, invite friends
│   │   ├── setup.tsx              # Legacy participant setup (pre-party flow)
│   │   ├── tip.tsx                # Tip selection (%, custom, no tip)
│   │   ├── checkout.tsx           # Checkout — per-user amounts, pay via Venmo/CashApp
│   │   └── history/               # Bill history detail (future)
│   ├── camera/
│   │   ├── _layout.tsx
│   │   └── capture.tsx            # Camera / gallery → Gemini AI scan
│   └── onboarding/
│       ├── _layout.tsx
│       ├── index.tsx              # Welcome screen
│       ├── personal-info.tsx      # Name, DOB, country
│       └── setup.tsx              # Username, phone, payment handles
│
├── backend/                       # Python FastAPI backend (Cloud Run)
│   ├── main.py                    # FastAPI entry point
│   ├── Dockerfile                 # Container config
│   ├── deploy.sh                  # Cloud Run deploy script
│   ├── requirements.txt           # Python deps (fastapi, google-genai, Pillow)
│   └── app/
│       ├── __init__.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── endpoints/
│       │       └── receipts.py    # POST /api/v1/scan endpoint
│       ├── core/
│       │   └── config.py          # Settings (pydantic-settings, GEMINI_API_KEY)
│       └── services/
│           └── gemini.py          # GeminiService — receipt image → structured JSON
│
├── components/                    # Shared UI components
│   ├── Button.tsx                 # Reusable button
│   ├── DigitalReceipt.tsx         # Receipt card for History carousel
│   ├── EditScreenInfo.tsx         # Dev info widget
│   ├── ExternalLink.tsx           # Open links in browser
│   ├── LoadingScreen.tsx          # Animated loading overlay
│   ├── StyledText.tsx             # Bold text wrapper
│   ├── Themed.tsx                 # Theme-aware View / Text
│   ├── useClientOnlyValue.ts      # SSR-safe value hook
│   ├── useColorScheme.ts          # Color scheme hook
│   ├── home/
│   │   ├── ScanButton.tsx         # Scan receipt CTA
│   │   ├── ManualScanButton.tsx   # Manual entry CTA
│   │   ├── MetricCard.tsx         # Stat card ($ split, mins saved)
│   │   └── BillListItem.tsx       # Recent activity row
│   └── __tests__/                 # Component tests
│
├── context/
│   └── AuthContext.tsx             # React Context: session, user, profile, signOut
│
├── hooks/
│   └── useHomeStats.ts             # Home screen data hook (bills, drafts, stats)
│
├── lib/
│   └── supabase.ts                 # Supabase client init (AsyncStorage, auto-refresh)
│
├── services/
│   └── api.ts                      # Legacy uploadReceipt() (for local dev backend)
│
├── utils/
│   ├── gemini.ts                   # Frontend → Cloud Run POST /api/v1/scan
│   ├── payments.ts                 # openVenmo(), openCashApp() deep links
│   └── url.ts                      # OAuth callback URL helpers
│
├── constants/
│   └── Colors.ts                   # Light/dark color palette (currently identical)
│
├── assets/
│   ├── fonts/
│   │   └── SpaceMono-Regular.ttf   # Fallback font
│   └── images/
│       ├── icon.png                # App icon
│       ├── adaptive-icon.png       # Android adaptive icon
│       ├── favicon.png             # Web favicon
│       └── splash-icon.png         # Splash screen icon
│
├── supabase/
│   └── migrations/                 # SQL migration files
│
├── types.ts                        # Shared types: Participant, BillStatus, colors
├── global.css                      # @tailwind directives for NativeWind
├── app.config.ts                   # Expo config (dev/prod bundle IDs, EAS)
├── tailwind.config.js              # Tailwind custom colors, fonts (NativeWind)
├── babel.config.js                 # Babel with NativeWind preset
├── metro.config.js                 # Metro bundler + NativeWind
├── tsconfig.json                   # TypeScript config
├── eas.json                        # EAS Build profiles
├── package.json                    # Dependencies & scripts
└── README.md                       # Project README
```

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| **Framework** | Expo SDK 54, React Native 0.81 |
| **Navigation** | Expo Router v6 (file-based) |
| **Styling** | NativeWind v4 (Tailwind CSS for RN) |
| **Fonts** | Google Fonts — Outfit (heading, body, medium) |
| **Icons** | lucide-react-native |
| **Auth** | Supabase Auth (Email, Google OAuth, Apple Sign-In) |
| **Database** | Supabase (PostgreSQL) — `bills`, `bill_participants`, `profiles` |
| **Backend** | Python FastAPI on Google Cloud Run |
| **AI / OCR** | Google Gemini 2.5 Flash (vision model for receipt parsing) |
| **Payments** | Venmo & Cash App deep links |
| **Animations** | react-native-reanimated v4 |
| **Gestures** | react-native-gesture-handler |
| **QR Codes** | react-native-qrcode-svg |
| **State** | React Context (AuthContext) + local component state |
| **Builds** | EAS Build (Expo Application Services) |
| **OTA Updates** | expo-updates (EAS Update) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Mobile App (Expo)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Auth     │  │  Tabs    │  │  Bill Flow       │   │
│  │  (login,  │  │  (home,  │  │  (camera→party   │   │
│  │  signup)  │  │  history,│  │   →editor→tip    │   │
│  │          │  │  profile) │  │   →checkout)     │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                 │             │
│  ┌────┴──────────────┴─────────────────┴───────┐     │
│  │             AuthContext (React Context)       │     │
│  │     session • user • profile • signOut        │     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                 │
└─────────────────────┼─────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Supabase      │     │  Cloud Run      │
│  (PostgreSQL)   │     │  (FastAPI)      │
│  • bills        │     │  POST /api/v1/  │
│  • profiles     │     │       scan      │
│  • participants │     │  Uses Gemini    │
│  • Auth         │     │  2.5 Flash      │
└─────────────────┘     └─────────────────┘
```

**Data flow:**
1. **Auth** — the app talks directly to Supabase Auth (email/password, Google OAuth via browser redirect, Apple native ID token).
2. **Receipt Scanning** — the app uploads a JPEG to the Cloud Run backend, which calls Gemini's vision model and returns structured JSON (`items`, `tax`, `tip`, `total`).
3. **Bill CRUD** — all bill data is stored in Supabase via the REST API (`/rest/v1/...`). Most queries use `fetch()` directly with the user's access token.
4. **Payments** — Venmo & Cash App are opened via deep links, not through any server-side payment API.

---

## Authentication Flow

```
User opens app
       │
       ▼
  _layout.tsx loads
  AuthProvider wraps app
       │
       ▼
  AuthContext.initializeAuth()
    → supabase.auth.getSession()
    → fetchProfile() via REST
       │
       ├─ No session → /(auth)/login
       ├─ Session but !hasOnboarded → /onboarding
       └─ Session + onboarded → /(tabs)
```

**Supported auth methods:**
- **Email/password** — `signInWithPassword()` / `signUp()`
- **Google OAuth** — `signInWithOAuth()` → opens system browser → redirect back via deep link → `setSession()` from URL tokens
- **Apple Sign-In** — native `expo-apple-authentication` → `signInWithIdToken()`

The `NavigationController` component in `_layout.tsx` listens to `[session, hasOnboarded]` and calls `router.replace()` to enforce route guards. The `DeepLinkHandler` handles OAuth callbacks and bill invite links.

---

## Bill Lifecycle (Core User Journey)

This is the most important flow in the app. Here's how a bill goes from scan to settled:

### 1. Scan / Manual Entry (Home Screen)

**Scan flow:**
- User taps "Scan Receipt" → navigates to `/camera/capture`
- Camera or gallery image is captured
- Image is uploaded to Cloud Run backend (`POST /api/v1/scan`)
- Gemini AI returns structured JSON: `{ items, tax, scanned_tip, total }`
- A new `bill` row is created in Supabase with `status: 'active'`
- Host is added as first `bill_participant`
- User is navigated to **Party Lobby**

**Manual entry flow:**
- User taps "Enter Manually" → a `bill` is created with `status: 'draft'` and empty items
- Host is added as first participant
- User is navigated to **Party Lobby**

### 2. Party Lobby (`/bill/party`)

- Shows a **QR code** and **share link** for the bill
- Other users can scan or tap the deep link → they are auto-added as participants (handled by `DeepLinkHandler` in `_layout.tsx`)
- Host can manually add **guest users** (people without the app)
- Participants appear in a live "Roll Call" list (polls every 3 seconds)
- Host taps "Start Splitting 🎉" → navigates to **Bill Editor**

### 3. Bill Editor (`/bill/[id]`)

This is the largest and most complex screen (~1000 lines). Key features:
- **Item list** — editable names and prices, swipe-to-delete
- **User avatars** — tap a user, then tap items to assign them
- **Assignments** — each item can be shared among multiple users (split evenly between assignees)
- **Tax input** — manually enter tax, distributed proportionally
- **Progress bar** — color-coded segments showing each user's share
- **Remaining counter** — animated display of unassigned amount
- **Quick actions** — Split Evenly, Randomize, Clear
- **Save as Draft** — upserts bill to Supabase with `status: 'draft'`
- **Next** → navigates to **Tip Screen**

Host has full control; guests can only select themselves and assign items to themselves.

### 4. Tip Screen (`/bill/tip`)

- Shows subtotal (passed from editor to avoid recalculation drift)
- Three percentage buttons: 15%, 18%, 20%
- Custom tip input
- "No Tip" checkbox
- If a tip was scanned from the receipt, it auto-fills and **auto-skips** to checkout after 500ms
- Tip is distributed proportionally to each item's price
- Navigates to **Checkout**

### 5. Checkout (`/bill/checkout`)

- Full-width color-coded rows for each user showing their total
- Host sees "SETTLED" badge; others see "PAY →" button
- Tapping PAY opens a payment method modal:
  - **Venmo** — opens the Venmo app with pre-filled amount and note
  - **Cash App** — opens Cash App with pre-filled amount
  - **Received Cash** — marks as paid directly
- Payment methods come from the **host's profile** (Venmo/CashApp handles)
- Once all non-host users are marked paid, "Close Bill" becomes available
- Closing the bill PATCHes the Supabase row with `status: 'settled'` and full details (items, assignments, userTotals, paidStatus)
- Navigates to **History tab**

### 6. History Tab (`/(tabs)/history`)

- **Horizontal carousel** of `DigitalReceipt` cards (rendered like physical receipts)
- **Pagination dots** below the carousel
- **Briefing panel** below shows: settled/pending badge, user avatars with amounts, activity feed
- Fetches settled/completed/closed bills from Supabase

---

## Directory-by-Directory Breakdown

### Root Config Files

| File | Purpose |
|---|---|
| `app.config.ts` | Expo config — supports `development` and `production` variants via `APP_VARIANT`. Controls bundle ID (`com.theraq17.divvit` vs `com.theraq17.divvit.dev`), deep link scheme (`divvit` vs `divvit-dev`), EAS project ID, and OTA update URL. |
| `package.json` | Defines all dependencies. Entry point is `expo-router/entry`. 57 dependencies including Supabase, Gemini AI SDK, NativeWind, reanimated, etc. |
| `tsconfig.json` | TypeScript config with strict mode. |
| `tailwind.config.js` | Custom Tailwind theme with `divvit` color namespace and Outfit font families. This is what powers all `className` usage in the app via NativeWind. |
| `babel.config.js` | Configures `babel-preset-expo` with NativeWind preset. |
| `metro.config.js` | Metro bundler config with NativeWind CSS interop. |
| `eas.json` | Three build profiles: `development` (dev client), `preview` (internal testing), `production` (App Store). |
| `types.ts` | Shared types (`Participant`, `BillStatus`), participant color palette, and helper functions `getInitials()` / `getNextColor()`. |
| `global.css` | Just `@tailwind base/components/utilities` — required by NativeWind. |

### app/ — Screens & Navigation

Expo Router uses **file-based routing**. Every `.tsx` file in `app/` becomes a route.

- **`_layout.tsx`** — The single most important file. It:
  - Wraps the entire app in `<AuthProvider>`
  - Loads Outfit fonts
  - Renders `NavigationController` (route guards based on auth state)
  - Renders `DeepLinkHandler` (OAuth callbacks + bill invite deep links)
  - Shows a loading screen while auth initializes

- **`(auth)/`** — A route group for unauthenticated screens. The parentheses mean it doesn't appear in the URL path.
  - `login.tsx` — Email/password form, Google OAuth button, Apple Sign-In (iOS only)
  - `signup.tsx` — Email sign-up form
  - `setup.tsx` — First-time profile setup (legacy, now onboarding handles this)

- **`(tabs)/`** — The main tab navigator with 3 tabs:
  - `index.tsx` (Home) — Greeting, metrics ($ split, mins saved, points), scan/manual buttons, pending drafts, promotions card, recent activity
  - `history.tsx` — Receipt carousel with `DigitalReceipt` cards, briefing panel with user split details
  - `profile.tsx` — User avatar, contact info, Venmo/CashApp handles (editable), logout

- **`bill/`** — The multi-step bill flow (described in detail above)

- **`camera/`** — Contains `capture.tsx` which handles camera permissions, photo capture, gallery pick, and triggering the AI scan

- **`onboarding/`** — Three-step first-time user setup:
  1. `index.tsx` — Welcome screen
  2. `personal-info.tsx` — First name, last name, birthday, country
  3. `setup.tsx` — Username, phone, Venmo/CashApp handles

### components/

| Component | Purpose |
|---|---|
| `Button.tsx` | Generic styled button with variants |
| `DigitalReceipt.tsx` | Renders a receipt card (looks like a real receipt) for the History carousel. Shows items, tax, tip, total. |
| `LoadingScreen.tsx` | Full-screen animated loading with purple gradient and pulsing logo |
| `home/ScanButton.tsx` | Large purple "Scan Receipt" call-to-action |
| `home/ManualScanButton.tsx` | Secondary "Enter Manually" button |
| `home/MetricCard.tsx` | Stat card with icon, value, and label |
| `home/BillListItem.tsx` | Recent activity list item (title + subtitle) |

### context/

**`AuthContext.tsx`** is the authentication brain of the app:
- Provides `session`, `user`, `profile`, `isLoading`, `hasProfile`, `hasOnboarded`, `signOut`, `refreshProfile`
- On mount: calls `supabase.auth.getSession()`, then fetches the user's `profiles` row
- Subscribes to `onAuthStateChange` for real-time auth events
- Has a 5-second timeout so the app doesn't hang if Supabase is unreachable
- Fetches profiles via raw `fetch()` to the Supabase REST API (not the JS client `from()`)

### hooks/

**`useHomeStats.ts`** — Data hook for the Home screen:
- Fetches both `completed/settled` and `draft` bills from Supabase
- Computes: points, total $ split, minutes saved (5 min per bill)
- Formats recent activity and draft cards
- Supports `refetch()` (called on screen focus) and `deleteDraft()` (optimistic update)

### lib/

**`supabase.ts`** — Initializes the Supabase client:
- Uses `AsyncStorage` for session persistence (via a custom `ExpoStorage` adapter for SSR/native/web compatibility)
- Auto-refreshes tokens when app comes to foreground (`AppState` listener)
- Handles OAuth deep link callbacks

### services/

**`api.ts`** — Legacy upload function for local dev backend. Constructs a `FormData` with the receipt image and POSTs to `localhost:8000/analyze`. Mostly superseded by `utils/gemini.ts` which targets the deployed Cloud Run backend.

### utils/

| File | Purpose |
|---|---|
| `gemini.ts` | The production receipt scanner. POSTs image to `https://divvit-backend-....run.app/api/v1/scan`. This is the function called by `capture.tsx`. |
| `payments.ts` | `openVenmo(handle, amount, note)` and `openCashApp(handle, amount)` — construct deep link URLs and open them via `Linking.openURL()`. |
| `url.ts` | `getAuthCallbackUrl()` — generates the correct OAuth redirect URI based on whether the app is running in Expo Go, dev build, or production. Uses `expo-auth-session`'s `makeRedirectUri()`. |

### constants/

**`Colors.ts`** — Defines the Divvit color palette for light/dark themes. Currently both themes use a white background with dark text and `#B54CFF` (purple) as the accent color.

### assets/

- **fonts/** — `SpaceMono-Regular.ttf` (fallback; the app primarily uses Outfit from Google Fonts loaded at runtime)
- **images/** — App icon variants and splash screen

### backend/ — Python FastAPI

The backend is a **stateless** microservice deployed to **Google Cloud Run**.

**Architecture:**
```
backend/
├── main.py              # FastAPI app, CORS, routes
├── app/
│   ├── api/endpoints/
│   │   └── receipts.py  # POST /api/v1/scan: accepts image → returns JSON
│   ├── core/
│   │   └── config.py    # pydantic-settings: GEMINI_API_KEY, PORT
│   └── services/
│       └── gemini.py    # GeminiService class
```

**How it works:**
1. Client uploads a receipt image to `POST /api/v1/scan`
2. `receipts.py` receives the file, reads bytes
3. `GeminiService.parse_receipt()` sends the image to **Gemini 2.5 Flash** with a structured prompt
4. Gemini returns JSON: `{ items: [{name, price, quantity}], subtotal, tax, total, scanned_tip }`
5. Backend returns this JSON to the client

**Deployment:** `deploy.sh` builds and pushes the Docker image to Artifact Registry, then deploys to Cloud Run with the `GEMINI_API_KEY` secret.

### supabase/

Contains SQL migration files for the Supabase database schema. These define the `bills`, `bill_participants`, and `profiles` tables (see next section).

---

## Database Schema (Supabase)

The app uses three main tables:

### `profiles`
Created automatically when a user signs up (via database trigger). Stores:
- `id` (UUID, matches `auth.users.id`)
- `username`, `first_name`, `last_name`
- `phone`, `country`, `date_of_birth`
- `venmo_handle`, `cashapp_handle` (for payment integration)
- `has_onboarded` (boolean — controls onboarding flow)
- `points` (gamification metric)

### `bills`
Each bill split session:
- `id` (UUID)
- `host_id` (UUID → `auth.users.id`) — the person who created the bill
- `total_amount` (numeric)
- `status` (text) — `'draft'`, `'active'`, `'started'`, `'settled'`, `'completed'`, `'closed'`
- `details` (JSONB) — stores items, assignments, tip, userTotals, paidStatus, closedAt
- `items` (JSONB) — denormalized item list for quick access
- `created_at` (timestamp)

### `bill_participants`
Links users to bills:
- `id` (UUID)
- `bill_id` (UUID → `bills.id`)
- `user_id` (UUID, nullable — null for guest participants)
- `name`, `initials`, `color` (display properties)
- `is_guest` (boolean)
- `created_at` (timestamp)

---

## Styling System

The app uses **NativeWind v4** — a port of Tailwind CSS to React Native:

- **Custom colors** are defined in `tailwind.config.js` under a `divvit` namespace:
  - `divvit-primary` / `divvit-secondary` → `#B54CFF` (brand purple)
  - `divvit-text` → `#111827` (near-black)
  - `divvit-muted` → `#6B7280` (gray)
  - `divvit-card` → `#F3F4F6` (light gray background)
  - `divvit-input-bg`, `divvit-input-border` → form styling

- **Custom fonts**:
  - `font-heading` → `Outfit_700Bold`
  - `font-body` → `Outfit_400Regular`
  - `font-medium` → `Outfit_500Medium`

- Usage: `className="text-divvit-text font-heading text-3xl font-bold"`

---

## Deep Linking

Divvit uses deep links for two purposes:

### 1. OAuth Callbacks
- Scheme: `divvit://auth/callback` (prod) / `divvit-dev://auth/callback` (dev)
- After Google OAuth, the browser redirects back with tokens in the URL fragment
- `DeepLinkHandler` in `_layout.tsx` extracts `access_token` + `refresh_token` and calls `supabase.auth.setSession()`

### 2. Bill Invites
- Format: `divvit://bill/{UUID}` or `exp://192.168.x.x:8081/--/bill/{UUID}` (Expo Go)
- When someone taps the link:
  - If not logged in → shown "Please Log In" alert
  - If logged in → auto-added as a `bill_participant` → navigated to Party Lobby
- Links are generated in `party.tsx` using `Linking.createURL()`
- QR codes encode the same URL using `react-native-qrcode-svg`

---

## Environment Variables

The app expects these env vars (set in `.env` at root):

| Variable | Used By | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase anonymous API key |
| `EXPO_PUBLIC_API_URL` | Frontend (optional) | Override backend URL for local dev |
| `APP_VARIANT` | Frontend | Set to `development` for dev builds |
| `GEMINI_API_KEY` | Backend | Google Gemini API key |

---

## How to Run Locally

### Frontend (Mobile App)
```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

### Backend (Receipt API)
```bash
cd backend

# Install Python deps
pip install -r requirements.txt

# Set the Gemini API key
export GEMINI_API_KEY=your_key_here

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8080
```

---

*Last updated: March 2026*
