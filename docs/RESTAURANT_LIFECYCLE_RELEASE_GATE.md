# RestaurantOS restaurant lifecycle release gate

Status: **NOT VERIFIED**. Passing compilation or HTTP health checks is not proof of a working restaurant order lifecycle.

## Test environment
Use a dedicated non-production restaurant with test menu items, table QR, owner, waiter and kitchen accounts. Never run mutating tests against a live restaurant without permission. Do not store credentials in the repository; use GitHub Actions secrets or local environment variables.

## Acceptance scenarios (all mandatory before paid onboarding)

| ID | Journey | Expected result |
| --- | --- | --- |
| L01 | Platform admin creates restaurant, branch and owner | Exactly one restaurant and owner; owner can sign in |
| L02 | Owner creates menu categories, veg/egg/non-veg items, prices and availability | Guest sees accurate names, dietary indicators, prices and availability |
| L03 | Owner creates tables and QR codes | Each QR resolves to correct tenant, branch and table |
| L04 | Guest adds item, increases/decreases quantity, removes item | Totals and cart persist correctly through navigation |
| L05 | Guest submits order once | One order with server-calculated prices and a stable order reference |
| L06 | Guest double-taps submit / retries after network timeout | No duplicate orders or charges |
| L07 | Kitchen receives order over WebSocket | Exactly one actionable order; fallback reconnect refreshes authoritative state |
| L08 | Kitchen accepts, prepares and completes | Valid state transitions only, no regression or unauthorized changes |
| L09 | Waiter views assigned orders and guest service requests | Updates arrive once; appropriate role permissions enforced |
| L10 | Guest tracks status, closes and reopens tab | Status and authorized history are restored from server |
| L11 | Owner reviews order totals, settlements and reports | Values reconcile with actual orders, refunds and payment state |
| L12 | Guest request cleaning/help | Staff can acknowledge and resolve; customer sees correct status |
| L13 | Disconnect guest, kitchen and waiter in turn | Reconnect and catch-up without dropped/duplicated events |
| L14 | Two separate restaurant tenants | No cross-tenant read/write or WebSocket subscriptions |
| L15 | Expired/invalid JWT and lower-privilege accounts | 401/403 for protected actions; no data leaked |
| L16 | Mobile small viewport, slow network and Render cold start | Loading/error/retry UI; no silent order loss |
| L17 | Restaurant onboarding validation and repeated submission | Invalid inputs rejected; no duplicate tenants or orphan accounts |
| L18 | Payment and order settlement (when enabled) | No client-side payment confirmation; verified server-side provider webhook |

## Evidence required
Record per scenario: environment and deployed commit SHA, timestamp, account role, request/order ID (not personal data), steps, expected vs actual, screenshots or sanitized logs, PASS/FAIL, and linked bug fix. Re-run failed scenarios and regression tests after fixes.

## Release policy
- Block paid onboarding on any failed L01-L16 scenario.
- Do not claim payment support until L18 is tested for the chosen provider.
- Smoke checks in `scripts/launch-smoke.mjs` are read-only availability/security checks, **not** L01-L18 lifecycle tests.
- Keep subscription emails disabled until SMTP is tested with rotated credentials.
- Maintain a rollback point and database backup before schema-changing releases.
