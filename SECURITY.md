# Security policy

## Reporting a vulnerability

Do not open a public issue for credentials exposure or a mutation-safety bypass.
Use GitHub private vulnerability reporting for this repository.

## Secrets

Never commit `.env`, `config.json`, browser profiles, cookies, SQLite databases,
logs or Telegram/IntraService credentials. The examples contain placeholders only.

## Mutation safety

Closing and creating tasks require an explicit preview and confirmation. A
successful HTTP response is not treated as proof: the task is read again and
its status, solution and expenses are verified.
