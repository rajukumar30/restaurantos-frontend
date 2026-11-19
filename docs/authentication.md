# Frontend authentication

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to the backend URL.

- `/login` signs in through `POST /api/v1/auth/login`.
- The returned access token and basic profile are stored in browser local storage for this initial development milestone.
- Platform administrators are redirected to `/admin/restaurants/new`.
- The onboarding page calls `POST /api/v1/platform/restaurants` with the bearer token.
- The backend enforces platform-admin authorization. Client-side route checks are only a navigation convenience.

For production, move authentication to secure, HTTP-only cookies via a same-origin backend-for-frontend, add session refresh and logout/revocation, and apply a stricter content security policy. Do not treat local-storage tokens as the final production session design.
