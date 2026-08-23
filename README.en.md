# IntraService Telegram Bot Community Edition

[Русский](README.md) | [English](README.en.md)

A self-hosted Telegram interface for IntraService. The bot displays ticket lists
and cards, creates and closes tickets, supports multi-selection, and stores
reusable solution templates in SQLite.

[![CI](https://github.com/Fifth-Ace/intraservice-telegram-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Fifth-Ace/intraservice-telegram-bot/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Fifth-Ace/intraservice-telegram-bot)](https://github.com/Fifth-Ace/intraservice-telegram-bot/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> This independent community project is not affiliated with IntraService or
> Telegram.

## Features

- numeric Telegram user allowlist;
- paginated ticket list and detailed ticket cards;
- full-width normal list and separate full-width selection mode;
- selection of up to 10 tickets, stored in SQLite for two hours;
- single and sequential batch closing;
- reusable solution templates with categories, popular templates, pagination and default work time;
- manual solution and minute entry;
- ticket creation from Telegram;
- official IntraService 5.51.x API transport with Playwright retained as a permanent fallback;
- API-primary reads, creation and confirmed closing with SQLite recovery;
- direct Telegram connection or HTTP(S) CONNECT proxy;
- systemd user service;
- offline self-tests and GitHub Actions CI.

Redis and PostgreSQL are not required. The bot uses Node.js's built-in SQLite
driver.

Optionally you can install a standalone web dashboard alongside the bot — an
admin panel with live metrics, a ticket queue with cancel, a journal and
IntraService/Telegram connection settings: see
[Admin Panel (dashboard)](https://github.com/Fifth-Ace/intraservice-admin-panel).

## Mutation safety

Choosing a template does not close a ticket. Create and close operations use this
flow:

```text
draft → preview → explicit confirmation
→ fresh ticket read → save
→ ticket re-read → result verification
```

For closing, the bot verifies the final status, exact solution text and work-time
record. An HTTP `200` response alone is not considered success. Batch operations
run sequentially and report a separate result for every ticket.

The beta transport chain is:

```text
official API → Playwright compatibility/emergency fallback
```

API closing stores durable checkpoints in SQLite, uses `Changed`, stops on
`409 Conflict`, and never blindly repeats a mutation after a timeout. See
[docs/API_BETA.md](docs/API_BETA.md) for staged opt-in and rollback instructions.

## Requirements

- Node.js 22.5 or newer;
- npm 10 or newer;
- Linux is recommended for the included systemd unit;
- an IntraService account with the required permissions;
- a Telegram bot token from [@BotFather](https://t.me/BotFather).

## Quick installation

```bash
git clone https://github.com/Fifth-Ace/intraservice-telegram-bot.git
cd intraservice-telegram-bot
npm ci
npm run setup
npx playwright install chromium
```

`npm run setup` creates local `.env`, `config.json`, `data/` and `logs/`. It does
not overwrite existing configuration files.

## Basic configuration

Fill in `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_ALLOWED_USERS=123456789
TELEGRAM_PROXY=
TELEGRAM_BOT_USERNAME=my_service_desk_bot
INTRASERVICE_LOGIN=service_bot
INTRASERVICE_PASSWORD=replace_me
CONFIG_PATH=config.json
```

Then adapt `config.json` to your IntraService installation:

- `base_url`: IntraService origin;
- `template_task_id`: generic ticket whose form is used for creation;
- `fields`: HTML field names for requester, location, cabinet and solution;
- `statuses`: open and closed status IDs;
- `list_columns`: ticket-list column indexes;
- `locations`, `executors`, `categories`: internal IDs and short Telegram keys;
- `api`: opt-in official API service/type IDs and individual mutation flags.

For an immediate rollback to `v0.1.0` behavior, set `api.enabled=false` and
restart the service. Playwright and the browser profile remain available.

All values in `config.example.json` are synthetic. Do not copy them into a live
system without checking your own forms and IDs.

The [complete English manual](docs/en/MANUAL.md) explains every parameter and how
to discover installation-specific IDs.

## Validate and start

```bash
chmod 600 .env config.json
npm run validate
npm test
npm start
```

After `connected @bot_name` appears, open the bot in Telegram and send:

```text
/menu
```

Verify ticket lists and cards first. Test creation and closing on a staging
instance or dedicated test tickets before production use.

## Main commands

```text
/menu
/id
/create Title | cabinet | location_key | category_key | executor_key
/template Name | Category | minutes | Solution text
```

The executor key in `/create` is optional.

## Run with systemd

The supplied unit expects the project at `~/intraservice-telegram-bot`:

```bash
mkdir -p ~/.config/systemd/user
cp systemd/intraservice-telegram-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now intraservice-telegram-bot.service
systemctl --user status intraservice-telegram-bot.service
```

Follow the journal:

```bash
journalctl --user -u intraservice-telegram-bot.service -f
```

## Documentation

| Document | Contents |
|---|---|
| [Complete English manual](docs/en/MANUAL.md) | Installation, configuration, ID discovery, workflows, systemd, backups and troubleshooting |
| [Полный русский мануал](docs/ru/MANUAL.md) | Полное руководство по установке и администрированию на русском языке |
| [Official API beta](docs/API_BETA.md) | Opt-in, transport safety, recovery, rollback and compatibility notes |
| [SECURITY.md](SECURITY.md) | Security policy and vulnerability reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Rules for changes and pull requests |
| [Releases](https://github.com/Fifth-Ace/intraservice-telegram-bot/releases) | Published versions and release notes |

## Updating

```bash
git pull --ff-only
npm ci
npm run ci
systemctl --user restart intraservice-telegram-bot.service
```

Never commit `.env`, `config.json`, SQLite databases, logs, cookies or browser
profiles. They may contain credentials, internal IDs and personal data.

## License

[MIT](LICENSE).
