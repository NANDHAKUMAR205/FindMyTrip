# FindMyTrip

FindMyTrip is a React/Vite trip-discovery frontend and an Express/Mongoose API. It supports either destination-first planning or “Anywhere” discovery from an airport, budget, date window, trip length and traveler count. Discovery is available before login; an account is needed only to save trips, manage alerts and update a profile.

## Run locally

1. Install dependencies in `frontend` and `backend`.
2. Configure `backend/.env` with `MONGODB_URI` and `JWT_SECRET`. The backend uses MongoDB for users, searches, offers, price observations, destinations, opportunities, trips and alerts.
3. Optional provider settings are listed below. Without a provider key, the bounded sample adapters power the end-to-end flow and label their values as estimates.
4. Set `frontend/.env` `VITE_API_URL` if the API is not at `http://localhost:5000/api`.
5. From the repository root, run `npm run dev:backend` and `npm run dev:frontend` in separate terminals. Build the UI with `npm run build`.

## Provider adapters

The stable adapter contracts live in `backend/src/providers/adapters.js`:

- `FlightProvider.search(request, destination)` returns a bounded array of normalized offers with `id`, `airline`, `stops`, `price`, `currency`, and `source`.
- `HotelProvider.search(request, destination)` returns normalized stays with nightly/total prices, currency, and source confidence.
- `ActivityProvider.search`, `PlaceProvider.search`, and `WeatherProvider.forecast` return normalized destination data.

The orchestrator, cost engine, price intelligence and trip planner consume those normalized contracts rather than provider-specific response shapes. To add a provider, implement the appropriate contract and select it in the adapter registry; search UI and trip-planning calculations remain provider-independent.

Optional integrations:

| Environment variable | Adapter |
| --- | --- |
| `LITEAPI_API_KEY` (or `LITEAPI_KEY`) | LiteAPI flights and hotel discovery; failures fall back to estimates |
| `FLIGHT_PROVIDER_URL` | Flight-compatible JSON POST adapter, preferred over LiteAPI flights |
| `GOOGLE_MAPS_API_KEY` | Google Places for attractions and destination places |
| `OPENWEATHER_API_KEY` | OpenWeather forecasts when the requested date is within forecast range |
| `ALERT_WEBHOOK_URL` | Email/push delivery webhook; in-app alerts work without it |

Do not put provider credentials in frontend variables or commit them. Gemini is not used to invent fares, weather or place facts; no Gemini key is needed for this mock-first product flow.

## Product flow

- Select a destination first or choose Anywhere; exact dates or a flexible departure window are supported.
- Anywhere scans up to eight destinations, up to three dates and limited offers/stays per provider. Requests are cached, deduplicated in-flight and rate-limited to eight per user/IP per minute.
- Results rank complete estimated costs; destination details expose accommodation choices, attractions, weather confidence and nearby-airport transfer cost/time.
- Trips can be saved, edited, deleted and optimized. Optimizer suggestions are estimates and applying them updates the saved itinerary; fare changes must be revalidated with the provider.
- Price claims require at least five recent LIVE/RECENT observations. Sample/mock prices are excluded from deal claims.
- Alerts are refreshed on a 30-minute scheduler in batches of at most 50, and can also be checked manually. Email/push delivery requires a configured webhook.

FindMyTrip does not perform bookings or payments, build social features or a native app, or automate hidden-city ticketing.

## API overview

Public discovery: `POST /api/search`, `GET /api/deals`, `GET /api/prices/:origin/:destination`, `GET /api/destinations`, `GET /api/destinations/:id`, `GET /api/airports`, `GET /api/places`, `GET /api/weather`, `GET /api/nearby-airports`.

Authenticated workspace: `GET/POST /api/trips`, `GET/PUT/DELETE /api/trips/:id`, `GET/PUT /api/trips/:id/itinerary`, `POST /api/trips/:id/optimize`, `GET/POST /api/alerts`, `PUT/DELETE /api/alerts/:id`, `POST /api/alerts/:id/refresh`, and `POST /api/booking/click` (a provider handoff notice only; no booking/payment).
