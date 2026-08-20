# Contributing

1. Fork the repository and create a focused branch.
2. Never use a real production helpdesk for tests.
3. Add or update deterministic self-tests.
4. Run `npm ci && npm run ci`.
5. Confirm that no credentials, internal URLs, personal data, cookies, browser
   profiles, databases or logs are present in the diff.
6. Open a pull request describing safety implications.

Mutation changes must preserve preview, explicit confirmation, fresh-card reads,
sequential execution and post-mutation verification.
