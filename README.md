# Ticketly Web (Next.js)

Modern web version of the Ticketly mobile app, built with **Next.js App Router**, **Tailwind CSS**, and **Zustand**.  
It mirrors the core features of the Expo/React Native app: authentication, event discovery, explore/search, event creation, profile dashboard, tickets, and organizer views.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** for client state
- **Axios** for API integration

## Folder Structure

- `app/` – App Router pages and layouts
  - `page.tsx` – Discover / home (featured + upcoming events)
  - `login/` – Authentication (login, signup, OTP)
  - `explore/` – Event search
  - `create-event/` – Event creation form
  - `events/[id]/` – Event details + register + user tickets
  - `tickets/[id]/` – Ticket details view
  - `profile/` – Profile dashboard (created, joined, liked events)
  - `settings/` – Profile + security settings
  - `created-events/[id]/` – Organizer view with ticket breakdown
- `components/` – Reusable UI (e.g. `EventCard`)
- `lib/`
  - `config.ts` – Web API base URL config
  - `api/` – API clients for `auth`, `events`, `tickets`, thin wrappers over the same backend as mobile
- `store/` – `useAppStore` Zustand store (user, events, auth state)

This web app **does not modify** the existing mobile app – it only adds a new `web` folder.

## API Configuration

The web app uses the same backend as the mobile app.

- Configure the API base URL via environment variable:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com/api
```

If not set, it defaults to:

```bash
http://localhost:5001/api
```

## Setup & Installation

From the project root (same level as the mobile app):

```bash
cd web
npm install
```

## Running the Web App

### Development

```bash
cd web
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Production Build

```bash
cd web
npm run build
npm start
```

This creates an optimized production build and starts the Next.js server.

## Feature Mapping (Mobile → Web)

- **Auth**
  - `/login` replicates email/password login, signup, and OTP verification flow.
  - Tokens are stored in `localStorage` with automatic refresh, mirroring mobile behaviour.
- **Home / Discover**
  - `app/page.tsx` lists featured and upcoming events using `eventsAPI.getApprovedEvents`.
- **Explore**
  - `/explore` provides search by title/description/location (same logic as mobile explore screen).
- **Create Event**
  - `/create-event` mirrors the create-event form and calls `eventsAPI.createEvent`, then redirects to organizer details.
- **Profile**
  - `/profile` shows created, joined, and liked events; links to event details and organizer views.
- **Settings**
  - `/settings` allows updating name, email, and password using `authAPI.updateUser`.
- **Event Details**
  - `/events/[id]` shows full event information + registration + user tickets section, using `ticketsAPI` and `authAPI`.
- **Organizer Event Details**
  - `/created-events/[id]` shows ticket breakdown by status for organizers (similar to mobile `created-event-details`).
- **Ticket View**
  - `/tickets/[id]` shows ticket details, QR/access key, and status.

## Responsive Design

- Layout and components are designed for:
  - Mobile: stacked layout, full-width cards, single-column views.
  - Tablet/Desktop: centered content up to `max-w-5xl/4xl`, grid layout for events, persistent top nav.
- Tailwind’s responsive utilities (`sm:`, `md:`) are used throughout.

## Notes

- The web app shares the same backend API contracts as the mobile app but uses a browser-oriented client (`localStorage` instead of `AsyncStorage`).
- If you add new backend endpoints, update both the mobile `lib/api` and the web `web/lib/api` modules accordingly.


