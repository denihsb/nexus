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
