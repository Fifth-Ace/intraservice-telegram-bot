# v0.2.0-beta.1

> GitHub pre-release. Stable `v0.1.0` remains the recommended release for users who do not want to test the official API transport.

## Highlights

- opt-in official IntraService API transport for lists and task cards;
- API-primary creation with fresh-read verification;
- API-primary single and sequential batch closing;
- optimistic concurrency using `Changed` and strict `409 Conflict` handling;
- durable SQLite checkpoints for the task-update plus expense-write close operation;
- deterministic expense marker and idempotent recovery after lost responses;
- Playwright retained as a permanent compatibility and emergency fallback;
- API transport audit records contain operation/result metadata, not task or custom-field contents;
- synthetic offline API, conflict, idempotency, and timeout-recovery test suites.

## Upgrade

```bash
git fetch --tags
git switch --detach v0.2.0-beta.1
npm ci
npm run ci
```

Back up local `.env`, `config.json`, SQLite, and browser profile before upgrading. Do not commit these files.

Add the opt-in `api` section described in [`docs/API_BETA.md`](docs/API_BETA.md). Existing installations without `api.enabled=true` continue through Playwright.

## Important beta limitations

- developed against IntraService 5.51.x; custom workflows and permissions may behave differently;
- test mutations on dedicated synthetic tasks first;
- an `uncertain` close checkpoint intentionally blocks automatic replay and requires operator review;
- Playwright/Chromium remains a runtime dependency;
- this pre-release does not replace stable `v0.1.0` as GitHub Latest.

## Verification included in the tag

```text
npm run check
npm test
npm run validate -- --examples
npm audit --omit=dev
```

All example IDs, names, addresses, and credentials are synthetic placeholders.
