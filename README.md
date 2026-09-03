# NEXUS

NEXUS is a student-first academic coordination system that turns scattered academic information into a clear workload, priorities, and actionable plan.

## Project foundation

- [Pre-Development Architecture & UX Review](docs/pre-development-architecture-ux-review.md)
- Supabase foundation migration: `supabase/migrations/001_foundation.sql`
- Inbox migration: `supabase/migrations/002_inbox.sql`
- Tasks migration: `supabase/migrations/003_tasks.sql`
- Environment template: `.env.example`

## Local development

```bash
npm install
npm run dev
```

The current foundation includes the responsive Today shell, quick capture prototype, and Supabase-aware authentication screen. Copy `.env.example` to `.env.local` and provide Supabase project values to enable login and signup.

## Production deployment

NEXUS is a Vite single-page application and is ready for Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or newer
- Required environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

The `public/_redirects` file keeps direct navigation and refreshes working for the SPA. Add the production domain to Supabase under **Authentication → URL Configuration**:

- Site URL: the deployed NEXUS URL
- Redirect URL: the deployed NEXUS URL

Never add a Supabase `service_role` key to Cloudflare Pages or frontend environment variables.

### Release smoke test

1. Open the deployed URL and create a new account.
2. Complete onboarding with one course and one task.
3. Confirm the task appears in Today and Timeline.
4. Create a capture from Tasks using the global `+` button and verify it appears in Inbox.
5. Complete a task and verify Focus and Workload update.
6. Test an overdue task with `Jadwalkan besok`.
7. Refresh, log out, and log in again to confirm persistence.

## Final QA and live-backend checklist

1. Confirm the `.env.local` values are valid for the target Supabase project.
2. Apply the SQL in `supabase/migrations/001_foundation.sql`, `002_inbox.sql`, and `003_tasks.sql` to the project database.
3. In the Supabase dashboard, verify that the `profiles`, `courses`, `inbox_items`, and `tasks` tables exist and RLS is enabled.
4. Sign in once with a real user to confirm the auth session and live data path work end-to-end.
5. If the schema is still missing, the app will remain in demo-safe fallback mode until the migration is applied.

## Planned checks

```bash
npm run lint
npm run build
```

---

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
