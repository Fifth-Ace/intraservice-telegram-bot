# Official API beta (`v0.2.0-beta.1`)

This pre-release adds an opt-in official IntraService API transport while keeping Playwright as a permanent emergency fallback.

## Transport chain

```text
official API (primary)
→ Playwright (compatibility and emergency fallback)
```

The API is used for task lists, cards, creation, single closing, and sequential batch closing. If `api.enabled` is absent or `false`, behavior remains compatible with `v0.1.0`.

## Configuration

Add this section to the local, Git-ignored `config.json`:

```json
{
  "api": {
    "enabled": true,
    "service_id": "10",
    "task_type_id": "20",
    "timeout_ms": 15000,
    "mutations": {
      "create": true,
      "close": true,
      "batch_close": true
    }
  }
}
```

All IDs above are synthetic placeholders. Obtain the actual service and task type IDs from your own IntraService installation. Existing `fields.*` values must end in the corresponding numeric custom-field ID, for example `field1004`; the API transport converts this to `Field1004`.

Use staged opt-in if desired:

1. Set `api.enabled=true` and all mutation flags to `false` to test API reads.
2. Enable `create` and test with a dedicated synthetic task.
3. Enable `close`, then `batch_close`.
4. To roll back immediately, set `api.enabled=false` and restart the service. Playwright code and browser profile remain available.

## Mutation safety

```text
draft → preview → human confirmation
→ fresh GET → rights/status checks
→ PUT with Changed → fresh GET verification
→ expense POST with deterministic marker
→ expense GET verification → completed
```

The SQLite table `api_close_operations` checkpoints close progress. The bot does not blindly repeat a task update or expense creation after a timeout, lost response, `5xx`, or other ambiguous result.

- `409 Conflict`: stop; no retry and no fallback.
- task mutation may have applied: re-read the task before deciding.
- expense may have been written: search for the operation marker before deciding.
- expense result still ambiguous and marker absent: persist `uncertain`; require review.
- Playwright fallback starts only after persisting `legacy_attempted`.
- an HTTP success alone is insufficient; the task and expenses are read back and verified.
- the expense `Rate` field is never sent.

## Compatibility notes

The API behavior was developed against IntraService 5.51.x. Installations can differ in workflows, field rights, and response shapes. Test the pre-release on a staging instance or dedicated synthetic tasks before enabling mutations for normal work.

Playwright remains necessary for API-disabled mode and as the fallback transport. Do not remove Chromium after enabling the API.

## Verification

```bash
npm ci
npm run ci
npm audit --omit=dev
```

The API and recovery suites use a local synthetic HTTP fixture. They do not connect to an IntraService installation and do not require real credentials.
