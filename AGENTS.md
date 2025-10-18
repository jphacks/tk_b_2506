# Repository Guidelines

## Project Structure & Module Organization
The Vite-powered React app lives in `src/`, with routing bootstrapped from `src/Routes.jsx` and rendered via `src/index.jsx`. Feature pages (e.g., `src/pages/self-introduction-form/`) keep their local UI in a co-located `components/` folder. Shared UI primitives sit in `src/components/ui`, auth state in `src/contexts`, and Supabase helpers in `src/lib`. Static assets and the HTML shell belong to `public/`. Database schema and policies are versioned under `migration/`; include the matching SQL change whenever you touch Supabase. Tailwind tokens and build-time configuration reside in `tailwind.config.js`, `vite.config.mjs`, and `jsconfig.json`.

## Build, Test, and Development Commands
Install packages once with `npm install`. Run `npm run start` for hot-reload development. Ship-ready bundles come from `npm run build`, and `npm run serve` previews the production output locally. When working against Supabase, follow `SUPABASE_SETUP.md` and `migration/README.md`, applying SQL updates with `supabase db push` before validating in the UI.

## Coding Style & Naming Conventions
Match the existing four-space indentation and single-quote imports. Components, hooks, and contexts should be `PascalCase` (`SelfIntroductionForm.jsx`), while utilities stay `camelCase.js`. Prefer functional components with hooks and keep side effects inside `useEffect`. Tailwind classes should use design tokens defined in `tailwind.config.js`; extend colors through CSS variables rather than literals. Absolute imports from `src/` are supported via the `jsconfig.json` base URL—use them to avoid fragile relative paths.

## Testing Guidelines
React Testing Library and Jest DOM are already available. Add specs alongside components as `*.test.jsx` or under `src/__tests__/`. Aim to cover validation branches, Supabase adapters, and conditional rendering like toast states. Because a `test` script is not yet defined, include a `vitest` (or equivalent) setup and an accompanying `npm run test` command in any PR that adds tests.

## Commit & Pull Request Guidelines
Follow the bracketed prefix convention seen in history (`[add]`, `[update]`, `[fix]`), then an imperative summary (`[fix] guard missing profile`). Keep commits focused on one logical change. Pull requests must describe the feature or bugfix, list affected routes or APIs, attach screenshots/GIFs for UI updates, link relevant issues, and call out any migration or environment updates. Confirm the build and new tests pass before requesting review.

## Supabase & Environment
Copy `env.example` to `.env` and fill Supabase keys plus auth secrets before starting the dev server. Reuse the singleton client exported from `src/lib/supabase` for data access. Migrations should remain idempotent and numbered; note the latest SQL file in your PR checklist so reviewers can replay it.
