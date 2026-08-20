# IntraService Telegram Bot Community Edition

[Home](../../README.en.md) | [Русский мануал](../ru/MANUAL.md)

A self-hosted Telegram interface for IntraService. The bot lets a service desk
view tickets, open ticket cards, create tickets, close one or several tickets,
and maintain reusable solution templates without exposing IntraService directly
to Telegram users.

The project is designed for cautious production use. Choosing a template does
not change a ticket. Every create or close operation has a preview, requires an
explicit confirmation, reads the ticket immediately before the change, and
reads it again after saving to verify the result.

> This community project is not affiliated with IntraService or Telegram.

## Contents

- [What the bot can do](#what-the-bot-can-do)
- [How changes are protected](#how-changes-are-protected)
- [Requirements](#requirements)
- [Installation](#installation)
- [Creating a Telegram bot](#creating-a-telegram-bot)
- [Environment configuration](#environment-configuration)
- [IntraService configuration](#intraservice-configuration)
- [Finding your IntraService IDs and field names](#finding-your-intraservice-ids-and-field-names)
- [First run](#first-run)
- [Telegram commands and workflows](#telegram-commands-and-workflows)
- [Running with systemd](#running-with-systemd)
- [Updating](#updating)
- [Data and backups](#data-and-backups)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Current limitations](#current-limitations)

## What the bot can do

- restrict access to an explicit Telegram user allowlist;
- connect to Telegram directly or through an HTTP(S) CONNECT proxy;
- authenticate in IntraService with Playwright and a persistent Chromium profile;
- display open tickets with pagination;
- display ticket cards with status, description, location, cabinet, executor,
  category and solution;
- switch between a normal full-width ticket list and a full-width selection mode;
- preserve the current selection in SQLite for two hours;
- select up to 10 tickets;
- close one ticket or process a batch sequentially;
- use reusable solution templates with default work time;
- enter a solution and work time manually;
- create tickets from a structured Telegram command;
- keep templates, selections and a compact operation audit in SQLite;
- run as a systemd user service;
- test configuration and core logic without contacting a live helpdesk.

Redis and PostgreSQL are not required. Node.js uses its built-in SQLite driver.

## How changes are protected

Creating and closing tickets use the following sequence:

```text
draft
→ preview
→ explicit user confirmation
→ fresh read from IntraService
→ save
→ read the ticket again
→ verify the saved result
```

For a close operation, the bot checks the final status, exact solution text and
work-time record. An HTTP `200` response alone is not considered success.

Batch closing processes tickets one at a time. Each ticket receives its own
result in the final report. A failed ticket is reported as failed instead of
being silently marked as completed.

A solution template only fills the draft solution and minutes. It never closes
a ticket by itself.

## Requirements

- Linux is recommended. Other operating systems may work if Playwright supports
  them, but the included service unit targets systemd user services.
- Node.js 22.5 or newer. Node.js 22 LTS is recommended.
- npm 10 or newer.
- Chromium installed through Playwright.
- An IntraService account allowed to view, create and close tickets.
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- Numeric Telegram IDs of every person allowed to use the bot.

Check the installed versions:

```bash
node --version
npm --version
```

## Installation

Clone the public repository and install the locked dependencies:

```bash
git clone https://github.com/Fifth-Ace/intraservice-telegram-bot.git
cd intraservice-telegram-bot
npm ci
npm run setup
```

`npm run setup` creates local files from the safe examples:

```text
.env.example       → .env
config.example.json → config.json
```

It also creates `data/` and `logs/`. Existing `.env` and `config.json` files are
left untouched.

Install Chromium:

```bash
npx playwright install chromium
```

If the machine is missing Chromium system libraries and you have administrator
access, Playwright can install them too:

```bash
npx playwright install --with-deps chromium
```

Do not run the bot yet. Configure `.env` and `config.json` first.

## Creating a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow its prompts.
3. Store the issued token in `TELEGRAM_BOT_TOKEN` inside `.env`.
4. Start a private chat with the new bot and press **Start**.
5. Add your numeric Telegram user ID to `TELEGRAM_ALLOWED_USERS`.

If you do not know your numeric ID, use a trusted ID lookup bot temporarily or
start this bot after initial configuration and send `/id` from an already
allowed account. Do not use a Telegram username in the allowlist; the bot
expects numeric IDs.

## Environment configuration

Edit `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_ALLOWED_USERS=123456789,987654321
TELEGRAM_PROXY=
TELEGRAM_BOT_USERNAME=my_service_desk_bot
INTRASERVICE_LOGIN=service_bot
INTRASERVICE_PASSWORD=replace_with_a_strong_password
CONFIG_PATH=config.json
```

| Variable | Required | Meaning |
|---|---:|---|
| `TELEGRAM_BOT_TOKEN` | yes | Token issued by BotFather |
| `TELEGRAM_ALLOWED_USERS` | yes | Comma-separated numeric Telegram user IDs |
| `TELEGRAM_PROXY` | no | HTTP or HTTPS proxy URL used for Telegram API calls |
| `TELEGRAM_BOT_USERNAME` | no | Bot username without `@`; used for addressed group commands |
| `INTRASERVICE_LOGIN` | yes | IntraService account login |
| `INTRASERVICE_PASSWORD` | yes | IntraService account password |
| `CONFIG_PATH` | no | Configuration path relative to the repository root |

A proxy with local credentials may use this form:

```dotenv
TELEGRAM_PROXY=http://proxy_user:proxy_password@proxy.example.com:3128
```

Protect the file:

```bash
chmod 600 .env config.json
```

Never commit `.env` or send it in an issue. It contains credentials.

## IntraService configuration

Edit `config.json`. The supplied values are synthetic placeholders and will not
match your installation automatically.

```json
{
  "base_url": "https://helpdesk.example.com",
  "headless": true,
  "browser_profile_dir": "data/browser-profile",
  "database_path": "data/community.sqlite3",
  "template_task_id": "1000",
  "task_list_pages": 20,
  "task_table_index": 2,
  "list_columns": {
    "id": 1,
    "status": 2,
    "title": 3,
    "executor": 5,
    "changed": 7
  },
  "selectors": {
    "login": "#login",
    "password": "#password",
    "login_form": "form"
  },
  "fields": {
    "requester": "field1001",
    "location": "field1002",
    "cabinet": "field1003",
    "solution": "field1004"
  },
  "statuses": {
    "open": "1",
    "closed": "2"
  },
  "defaults": {
    "requester": "Default Requester",
    "work_minutes": 15,
    "category": "workstation"
  },
  "locations": [
    {"key": "main", "id": "1", "name": "Main office"}
  ],
  "executors": [
    {
      "key": "admin",
      "telegram_user_id": "123456789",
      "intraservice_user_id": "100",
      "name": "Service Desk Admin"
    }
  ],
  "categories": [
    {"key": "workstation", "ids": ["1"], "name": "Workstation"}
  ]
}
```

### Main settings

| Key | Meaning |
|---|---|
| `base_url` | IntraService origin without a trailing task path |
| `headless` | `true` runs Chromium without a visible window |
| `browser_profile_dir` | Persistent Playwright login profile |
| `database_path` | SQLite database for templates, selections and audit rows |
| `template_task_id` | Existing generic ticket used as the source form for creation |
| `task_list_pages` | Maximum number of list pages read during one refresh |
| `task_table_index` | Zero-based table index on the IntraService list page |
| `list_columns` | Zero-based cell indexes inside each ticket row |
| `selectors` | CSS selectors used on the login page |
| `fields` | HTML `name` attributes of custom ticket fields |
| `statuses` | IntraService status IDs used when creating and closing tickets |
| `defaults` | Default requester and related creation defaults |
| `locations` | Short Telegram keys mapped to IntraService location IDs |
| `executors` | Telegram keys mapped to IntraService executor IDs |
| `categories` | Telegram keys mapped to one or more category IDs |

### Locations

Each location requires a short unique `key`, its real IntraService `id`, and a
human-readable `name`:

```json
"locations": [
  {"key": "hq", "id": "12", "name": "Head office"},
  {"key": "warehouse", "id": "19", "name": "Warehouse"}
]
```

Users type the key when creating a ticket.

### Executors

```json
"executors": [
  {
    "key": "alex",
    "telegram_user_id": "123456789",
    "intraservice_user_id": "45",
    "name": "Alex Smith"
  }
]
```

`telegram_user_id` identifies the Telegram account. `intraservice_user_id` is
the executor option value in IntraService. Keep both values as JSON strings.

### Categories

One Telegram category may map to several IntraService categories:

```json
"categories": [
  {"key": "printer", "ids": ["7", "9"], "name": "Printer and hardware"},
  {"key": "software", "ids": ["11"], "name": "Software"}
]
```

## Finding your IntraService IDs and field names

IntraService installations often use different custom fields. Values such as
`field1001` in the example are not universal.

1. Sign in to IntraService in a regular browser.
2. Open an existing ticket in edit mode.
3. Open the browser developer tools.
4. Inspect the ticket form fields.
5. Copy the HTML `name` attribute for requester, location, cabinet and solution.
6. Inspect the selected `<option value="...">` for statuses, locations,
   executors and categories.
7. Put those values in `config.json` as strings.

Example HTML:

```html
<select name="statusid">
  <option value="1" selected>Open</option>
  <option value="2">Closed</option>
</select>

<input name="field1003" value="101">
```

This example means the current status ID is `1`, the closed status ID may be
`2`, and the cabinet field name is `field1003`.

### Creation template ticket

`template_task_id` points to an existing ticket whose form supplies safe default
values. During creation, the bot reads that form, changes the configured title,
description, requester, location, cabinet, status, categories and optional
executor, then submits it as a new ticket. The source ticket is not modified.

Create a generic automation template ticket that contains no personal or
sensitive information. Test it on a staging helpdesk first.

### Ticket-list columns

`list_columns` uses zero-based column indexes. If the bot displays an executor
as a title or cannot find ticket IDs, inspect a row in the task-list table and
count its `<td>` cells starting at zero.

The bot currently recognizes common English and Russian closed-status labels in
the list. If your installation uses another language or custom wording, closed
tickets may appear in the list until the status matching is extended.

## First run

Validate the local configuration without printing secrets:

```bash
npm run validate
```

Run the deterministic self-tests:

```bash
npm test
```

Start the bot in the foreground:

```bash
npm start
```

A successful Telegram connection prints a line similar to:

```text
connected @my_service_desk_bot
```

Open the bot in Telegram, send `/menu`, and verify read-only operations first:

1. Open the ticket list.
2. Open several ticket cards.
3. Confirm that IDs, titles, locations and executors are mapped correctly.
4. Add a harmless solution template.
5. Test creation and closing on a staging instance or dedicated test tickets.
6. Install the systemd service only after those checks pass.

## Telegram commands and workflows

### Basic commands

```text
/menu
/id
```

`/menu` opens the main menu. `/id` returns the sender's numeric Telegram ID when
the sender is already allowed.

### Creating a ticket

Use the menu or send:

```text
/create Title | cabinet | location_key | category_key | optional_executor_key
```

Example with synthetic keys:

```text
/create Replace test keyboard | 101 | main | workstation | admin
```

The bot displays a preview. The ticket is created only after **Confirm
creation** is pressed. After saving, the bot reads the new ticket and verifies
its status, title, cabinet and location.

### Adding a solution template

```text
/template Name | Category | minutes | Solution text
```

Example:

```text
/template Restart print service | Printers | 15 | The print service was restarted.
```

Minutes must be an integer from 1 to 1440. Templates are stored in the local
SQLite database. They can be enabled or disabled from the Telegram template
menu.

### Closing one ticket

```text
Ticket list
→ open ticket card
→ Close
→ choose a template or enter a solution manually
→ choose or enter minutes
→ review preview
→ Confirm
```

The bot reads and verifies the ticket before reporting success.

### Closing several tickets

```text
Ticket list
→ Selection mode
→ select 2–10 full-width ticket rows
→ Close selected
→ choose one solution and work time
→ review preview
→ Confirm
```

The bot closes the selected tickets sequentially. The same solution and work
time are applied to each ticket. The final message shows the result for every
ticket.

Selection is stored in SQLite for two hours and survives pagination or a bot
restart.

## Running with systemd

The included user service assumes this repository is located at:

```text
~/intraservice-telegram-bot
```

Install and start it:

```bash
mkdir -p ~/.config/systemd/user
cp systemd/intraservice-telegram-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now intraservice-telegram-bot.service
systemctl --user status intraservice-telegram-bot.service
```

View logs:

```bash
journalctl --user -u intraservice-telegram-bot.service -f
```

Restart after a configuration change:

```bash
systemctl --user restart intraservice-telegram-bot.service
```

Stop and disable:

```bash
systemctl --user disable --now intraservice-telegram-bot.service
```

If the repository is installed elsewhere, edit `WorkingDirectory`, `ExecStart`
and `EnvironmentFile` in the copied unit.

For a user service that must start after boot without an interactive login, a
system administrator may need to enable lingering for that account:

```bash
sudo loginctl enable-linger YOUR_LINUX_USER
```

## Updating

Review release notes before updating, then run:

```bash
cd ~/intraservice-telegram-bot
git pull --ff-only
npm ci
npm run ci
systemctl --user restart intraservice-telegram-bot.service
systemctl --user status intraservice-telegram-bot.service
```

Do not overwrite `.env`, `config.json`, `data/` or the browser profile. Git
ignores them.

## Data and backups

Runtime state is stored under the paths configured in `config.json`:

- SQLite database: templates, selections and compact audit rows;
- browser profile: authenticated Chromium session;
- `.env`: Telegram and IntraService credentials;
- `config.json`: organization-specific IDs and mappings.

Stop the service before making a simple filesystem backup:

```bash
systemctl --user stop intraservice-telegram-bot.service
cp -a data data.backup
cp -a .env config.json data.backup/
systemctl --user start intraservice-telegram-bot.service
```

Store that backup in a protected location. It may contain credentials, personal
data and an authenticated browser session. Do not commit it to GitHub.

For a live SQLite backup without stopping the service, use SQLite's `.backup`
command or another SQLite-aware backup tool instead of copying an active
database file directly.

## Testing

Run all local checks:

```bash
npm run ci
npm audit --omit=dev
```

The test suite checks:

- example configuration validation;
- structured create and template parsers;
- SQLite template CRUD;
- durable selection and the 10-ticket limit;
- normal and selection-mode keyboard layouts;
- Telegram's 64-byte callback-data limit.

The tests do not contact Telegram or a live IntraService instance.

## Troubleshooting

### `TELEGRAM_BOT_TOKEN is missing`

Check that `.env` exists in the repository root and contains the real token.
When using systemd, confirm that `EnvironmentFile` points to the same file.

### `TELEGRAM_ALLOWED_USERS is empty`

Set one or more numeric IDs separated by commas:

```dotenv
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

### The bot starts, but ignores a user

The sender's numeric Telegram ID is not in the allowlist. Usernames and phone
numbers do not work as allowlist entries.

### `INTRASERVICE_LOGIN_FAILED`

Check the login, password, `base_url`, and selectors under `selectors`. Delete
the local browser profile only if you intentionally want to discard its saved
session:

```bash
systemctl --user stop intraservice-telegram-bot.service
mv data/browser-profile data/browser-profile.old
systemctl --user start intraservice-telegram-bot.service
```

Do not publish the old profile. Remove it after confirming the new login works.

### Chromium does not start

Install the browser and required system libraries:

```bash
npx playwright install chromium
npx playwright install --with-deps chromium
```

The second command may require administrator privileges.

### Ticket list columns are mixed up

Adjust `task_table_index` and `list_columns`. Both table and column indexes start
at zero.

### `CREATE_TEMPLATE_NOT_FOUND`

Check `template_task_id`. The configured ticket must exist and its page must
contain an editable form for the automation account.

### `TASK_NOT_FOUND`

The ticket does not exist, the account cannot access it, or the IntraService
page structure differs from the supported layout.

### `CREATE_VERIFY_FAILED`

The save request returned, but the new ticket did not contain the expected
status, title, cabinet or location. Check field names, status IDs and template
form defaults. The bot refuses to claim success in this case.

### `CLOSE_VERIFY_FAILED`

The ticket was re-read after saving, but status, exact solution text or work time
did not match. Check `statuses.closed`, `fields.solution`, executor permissions
and the expense fields used by your IntraService installation.

### Telegram requests time out

Check outbound access to `api.telegram.org`. If your network requires a proxy,
set `TELEGRAM_PROXY`. The current client supports HTTP and HTTPS CONNECT proxies
for HTTPS Telegram requests.

### systemd service repeatedly restarts

Inspect the recent journal:

```bash
journalctl --user -u intraservice-telegram-bot.service -n 200 --no-pager
```

Then run `npm run validate` from the repository directory. Common causes are an
invalid working directory, missing `.env`, missing Chromium or incorrect file
permissions.

## Security notes

- Use a dedicated IntraService account with only the permissions the bot needs.
- Keep the Telegram allowlist small.
- Set `.env` and `config.json` to mode `0600`.
- Do not commit credentials, `data/`, SQLite files, cookies, browser profiles or
  logs.
- Do not paste real credentials into GitHub issues or CI variables for this
  public repository.
- Test every organization-specific mapping on staging before production use.
- Keep preview, confirmation, fresh reads and post-save verification when
  modifying the code.
- Treat the browser profile as a credential because it contains an authenticated
  session.

Report sensitive vulnerabilities through GitHub private vulnerability reporting,
not a public issue. See [SECURITY.md](../../SECURITY.md).

## Current limitations

Version 0.1.0 is a generic community core. It does not include:

- organization-specific mail processing rules;
- automatic daily ticket generation or approval schedules;
- employee directories bundled with the source;
- AI-provider integrations;
- Docker packaging;
- a web administration panel;
- automatic discovery of custom IntraService field IDs;
- automated integration tests against every IntraService version.

IntraService installations can customize forms and table layouts, so initial
mapping and a staging acceptance test are required.

## Project files

```text
src/app.mjs                  Telegram workflows and confirmations
src/intraservice_client.mjs  Playwright IntraService adapter
src/telegram_client.mjs      Telegram HTTP transport
src/storage.mjs              SQLite templates, selection and audit
src/config.mjs               Configuration loading and validation
src/ui.mjs                   Telegram keyboards and ticket cards
config.example.json          Synthetic IntraService configuration
.env.example                 Environment variable template
systemd/                     User service example
test/                        Offline deterministic self-tests
```

## Contributing and license

Issues and pull requests are welcome. Mutation changes must preserve preview,
explicit confirmation, fresh reads, sequential batch execution and post-save
verification. See [CONTRIBUTING.md](../../CONTRIBUTING.md).

Released under the [MIT License](../../LICENSE).
