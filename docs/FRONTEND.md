# Frontend implementation and verification

The existing React 19, TypeScript, Vite, Redux Toolkit, React Router, Tailwind and Recharts application is preserved. Strict TypeScript settings remain enabled. Authentication routes, role-specific dashboards, client provisioning, users, audit, health and account settings remain the application boundaries.

## Navigation and data consistency

Protected route content unmounts with the route rather than waiting for an exit animation. Routes are lazy-loaded, and the outlet has a route-keyed Suspense boundary. Sidebar selection updates through NavLink. User and audit requests use cancellation and request identifiers so an obsolete response cannot overwrite newer results. Loading clears the previous user/audit rows. User pagination updates actual pagination state rather than putting page numbers in ignored filter fields.

Client application secrets belong to confidential server integrations. Access tokens remain in memory, refresh credentials use the server HttpOnly cookie, and legacy browser credentials are cleared. The STOMP connection reads the current access token before reconnection and unsubscribes an existing destination before replacing its handler. A standalone legacy Socket.IO hook now delegates to that authenticated connection.

## Real data and functional controls

User details show real profile/session metadata and the most recent 20 authorized audit events. Approximate IP locations are labeled accordingly. Platform administrators have visibility; ordinary user lifecycle controls require CLIENT_ADMIN. Soft deletion retains history and revokes sessions. Unsupported password-history and MFA values are identified as unavailable instead of displayed as fabricated counts or disabled status. Fake edit/reset controls are removed from the user detail view; actual profile/password/email flows live in account settings and authentication recovery.

Audit filtering supports application, event type, IP address and dates. Application options come from the scoped backend client list. Audit details are refreshed through an authorized detail endpoint. CSV and JSON exports contain displayed records; CSV neutralizes spreadsheet formula prefixes. Aggregate cards use real retained event counts and HTTP success/failure rates. Timeline charts aggregate the returned events, with an explicit maximum of 500 recent records and no fabricated historical series. Charts support line/bar views, metric selection and export of the actual aggregate.

The shared modal uses the browser dialog element for focus containment, Escape handling and focus restoration. Other shared controls replace the pre-existing null-rendering placeholders. The design retains the specified red, cream and blue palette, visible focus styles, responsive navigation and reduced-motion rules.

## Automated checks

`npm.cmd test` uses Node 22's experimental TypeScript stripping and built-in test runner. The reducer tests bundle existing source through esbuild, which is declared explicitly as a development dependency and was already installed with Vite. Tests check the BCrypt UTF-8 byte boundary, in-memory token handling, cleanup of legacy persistent credentials, CSV formula escaping, pagination, obsolete-response rejection, session expiry and unavailable health measurements. Build and lint outcomes are recorded in VALIDATION.md after execution.

Browser launch permission was denied during this session. Browser screenshots, authenticated navigation timing, keyboard/focus behavior and responsive viewport assertions must therefore be verified manually; static inspection is not represented as a browser test.
