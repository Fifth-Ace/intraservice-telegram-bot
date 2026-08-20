# IntraService Telegram Bot — Community Edition

A self-hosted Telegram interface for IntraService. It provides safe task
creation and closing, paginated task cards, a full-width multi-selection mode,
SQLite-backed solution templates and sequential batch closing.

> This project is not affiliated with IntraService or Telegram.

## Safety model

A template button never closes a task. Every mutation follows this flow:

```text
draft → preview → explicit confirmation → fresh task read
→ mutation → task re-read → status/solution/expense verification
```

Batch closing is sequential. A failure on one task is reported and does not
silently hide the outcome of the remaining tasks.

## Features

- Telegram allowlist;
- native Telegram HTTP transport with optional HTTP(S) CONNECT proxy;
- Playwright-authenticated IntraService access;
- open-task list, pagination and task cards;
- full-width normal mode and full-width multi-selection mode;
- single and batch closing with confirmation and verification;
- structured task creation with preview and post-save verification;
- SQLite-backed solution/minute templates;
- durable 2-hour ticket selection, maximum 10 tasks;
- user-level systemd unit and GitHub Actions CI;
- no Redis or PostgreSQL requirement.

## Requirements

- Linux or another system supported by Playwright;
- Node.js 22.5 or newer;
- an IntraService account allowed to read/create/close tasks;
- a Telegram bot token from [@BotFather](https://t.me/BotFather).

## Quick start

```bash
git clone https://github.com/Fifth-Ace/intraservice-telegram-bot.git
cd intraservice-telegram-bot
npm ci
npm run setup
```

Edit `.env` and `config.json`, then run:

```bash
npm run validate
npx playwright install chromium
npm test
npm start
```

Runtime secrets and browser sessions are ignored by Git.

## Telegram commands

```text
/menu
/id
/create Title | cabinet | location_key | category_key | optional_executor_key
/template Name | Category | 15 | Solution text
```

The persistent menu exposes task lists, creation, templates and help.

## Configuration

Copying the example is handled by `npm run setup`. Important values:

- `base_url`: your IntraService origin;
- `template_task_id`: a task whose form contains the correct defaults for creation;
- `fields`: custom requester/location/cabinet/solution field names;
- `statuses`: open and closed status IDs;
- `list_columns`: zero-based task-table column positions;
- `locations`, `executors`, `categories`: organization-specific keys and IDs.

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## systemd user service

```bash
mkdir -p ~/.config/systemd/user
cp systemd/intraservice-telegram-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now intraservice-telegram-bot.service
systemctl --user status intraservice-telegram-bot.service
```

The provided unit assumes the repository is cloned to
`~/intraservice-telegram-bot`.

## Updating

```bash
git pull --ff-only
npm ci
npm run ci
systemctl --user restart intraservice-telegram-bot.service
```

## Tests

Tests never contact a live IntraService instance:

```bash
npm run ci
npm audit --omit=dev
```

## Current scope

The Community Edition intentionally excludes organization-specific mail rules,
employee directories, AI-provider configuration, production audit reports and
automatic daily ticket generation. These may be added later as generic optional
modules.

## License

MIT — see [LICENSE](LICENSE).
