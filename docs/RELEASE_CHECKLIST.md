# Release checklist

- [ ] `npm ci` completes from a clean checkout
- [ ] `npm run ci` passes
- [ ] `npm audit --omit=dev` reports no high-severity issues
- [ ] examples contain placeholders only
- [ ] no `.env`, `config.json`, SQLite, logs or browser profiles are tracked
- [ ] no personal names, internal URLs, Telegram IDs or organization-specific IDs
- [ ] callback payloads stay within Telegram's 64-byte limit
- [ ] mutation paths retain preview, confirmation, fresh read and verification
- [ ] API `409 Conflict` blocks retry and legacy fallback
- [ ] ambiguous expense writes remain `uncertain` and are not blindly replayed
- [ ] Playwright remains available when API is disabled or safely falls back
- [ ] GitHub Actions passes on the public repository
