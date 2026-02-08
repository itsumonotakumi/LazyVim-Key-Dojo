# LazyVim Key-Dojo

Japanese README: [README.ja.md](README.ja.md)

LazyVim Key-Dojo is a typing game focused on mastering LazyVim keybindings through repetition.
It keeps the rules simple so you can build muscle memory fast.

## Features

- Practice and Time Attack modes
- Category filtering for keybinding groups
- Token-based input feedback with per-key accuracy
- Scoring with streak bonus and accuracy multiplier
- Optional sound feedback
- Local high score storage
- English and Japanese UI
- 90+ prompts across file, window, buffer, LSP, terminal, git, search, UI, and diagnostics

## Modes

- **Practice:** No timer, retry the current token after mistakes.
- **Time Attack:** Fixed time; mistakes advance to the next prompt immediately.

## Controls

- `Space` maps to `<leader>`
- `Escape` resets the current prompt

## Data

Keybinding prompts are defined in [src/data/questions.ts](src/data/questions.ts).
UI strings live in [src/data/i18n.ts](src/data/i18n.ts).

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run lint
npm run build
npm run test
npm run test:run
npm run test:ui
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:ui
```

## Testing

- Unit/Integration: Vitest + React Testing Library
- E2E: Playwright (Chromium)

To run everything:

```bash
npm run test:run
npm run test:e2e:install
npm run test:e2e
```

## Spec

- Japanese: [lazyvim_key_dojo_spec.md](../lazyvim_key_dojo_spec.md)
- English: [lazyvim_key_dojo_spec.en.md](../lazyvim_key_dojo_spec.en.md)
