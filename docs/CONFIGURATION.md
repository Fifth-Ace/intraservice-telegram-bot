# Configuration guide

## `.env`

| Variable | Required | Description |
|---|---:|---|
| `TELEGRAM_BOT_TOKEN` | yes | Token issued by BotFather |
| `TELEGRAM_ALLOWED_USERS` | yes | Comma-separated numeric Telegram user IDs |
| `TELEGRAM_PROXY` | no | HTTP(S) proxy URL; may include credentials locally |
| `TELEGRAM_BOT_USERNAME` | no | Username without `@`, used for addressed commands |
| `INTRASERVICE_LOGIN` | yes | IntraService login |
| `INTRASERVICE_PASSWORD` | yes | IntraService password |
| `CONFIG_PATH` | no | Config path, defaults to `config.json` |

Keep `.env` mode `0600` and never commit it.

## Discovering form field names

IntraService installations may use different custom fields. Open a task form in
your browser developer tools and inspect the `name` attribute for:

- requester;
- location;
- cabinet/workplace;
- solution.

Put those names under `fields` in `config.json`. Example values such as
`field1001` are placeholders, not universal constants.

## Status and category IDs

Inspect the selected `<option value="…">` in the task form. Configure:

```json
"statuses": {"open": "1", "closed": "2"}
```

Categories may contain several IDs:

```json
{"key": "printers", "ids": ["2", "3"], "name": "Printers"}
```

## Creation template

`template_task_id` points to an existing task used only as the source form for
safe defaults. Creation starts with that form, replaces the explicitly
configured fields and submits it as a new task. The source task is never
modified.

Use a non-sensitive generic template task dedicated to automation.

## Task list columns

`list_columns` are zero-based indices in the IntraService task-list table. If
IDs or titles look wrong, inspect one `<tr>` and adjust these values.

## Verification

Run:

```bash
npm run validate
npm test
```

Then start the bot and perform your own staging-instance acceptance test before
using it against production. Do not use live production tasks as test fixtures.
