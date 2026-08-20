# IntraService Telegram Bot Community Edition

[Русский](README.md) | [English](README.en.md)

Telegram-интерфейс для IntraService, который можно развернуть на своём сервере.
Бот показывает заявки и карточки, создаёт и закрывает заявки, поддерживает выбор
нескольких заявок и хранит шаблоны решений в SQLite.

[![CI](https://github.com/Fifth-Ace/intraservice-telegram-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Fifth-Ace/intraservice-telegram-bot/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Fifth-Ace/intraservice-telegram-bot)](https://github.com/Fifth-Ace/intraservice-telegram-bot/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Независимый community-проект. Он не связан с разработчиками IntraService или
> Telegram.

## Возможности

- белый список пользователей по числовому Telegram ID;
- список заявок, пагинация и подробные карточки;
- полноширинный обычный список и отдельный режим выбора;
- выбор до 10 заявок с хранением в SQLite в течение двух часов;
- одиночное и последовательное массовое закрытие;
- шаблоны решений с рекомендуемыми трудозатратами;
- ручной ввод решения и минут;
- создание заявок через Telegram;
- подключение к IntraService через Playwright и Chromium;
- прямое подключение к Telegram или HTTP(S) CONNECT-прокси;
- пользовательский systemd-сервис;
- автономные тесты и GitHub Actions CI.

Redis и PostgreSQL не требуются. Бот использует встроенный SQLite-драйвер
Node.js.

## Безопасное изменение заявок

Выбор шаблона сам по себе ничего не закрывает. Создание и закрытие проходят так:

```text
черновик → предпросмотр → подтверждение
→ свежее чтение карточки → сохранение
→ повторное чтение → проверка результата
```

При закрытии проверяются итоговый статус, точный текст решения и трудозатраты.
Один только HTTP-ответ `200` не считается успехом. Массовая обработка выполняется
последовательно с отдельным результатом для каждой заявки.

## Требования

- Node.js 22.5 или новее;
- npm 10 или новее;
- Linux рекомендуется для готового systemd unit;
- учётная запись IntraService с нужными правами;
- Telegram-токен от [@BotFather](https://t.me/BotFather).

## Быстрая установка

```bash
git clone https://github.com/Fifth-Ace/intraservice-telegram-bot.git
cd intraservice-telegram-bot
npm ci
npm run setup
npx playwright install chromium
```

`npm run setup` создаст локальные `.env`, `config.json`, `data/` и `logs/`.
Существующие конфигурационные файлы команда не перезаписывает.

## Базовая настройка

Заполните `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_ALLOWED_USERS=123456789
TELEGRAM_PROXY=
TELEGRAM_BOT_USERNAME=my_service_desk_bot
INTRASERVICE_LOGIN=service_bot
INTRASERVICE_PASSWORD=replace_me
CONFIG_PATH=config.json
```

Затем настройте `config.json` под свою установку IntraService:

- `base_url` — адрес IntraService;
- `template_task_id` — универсальная заявка, форма которой используется при создании;
- `fields` — HTML-имена полей заявителя, местонахождения, кабинета и решения;
- `statuses` — ID открытого и закрытого статусов;
- `list_columns` — индексы колонок списка заявок;
- `locations`, `executors`, `categories` — внутренние ID и короткие Telegram-ключи.

Значения в `config.example.json` синтетические. Их нельзя без проверки переносить
в рабочую систему.

Полное описание параметров и способ поиска ID находится в
[русском руководстве](docs/ru/MANUAL.md).

## Проверка и запуск

```bash
chmod 600 .env config.json
npm run validate
npm test
npm start
```

После строки `connected @имя_бота` откройте бота в Telegram и отправьте:

```text
/menu
```

Сначала проверьте чтение списка и карточек. Создание и закрытие лучше впервые
проверять на тестовом стенде или специальных тестовых заявках.

## Основные команды

```text
/menu
/id
/create Тема | кабинет | ключ_местонахождения | ключ_категории | ключ_исполнителя
/template Название | Категория | минуты | Текст решения
```

Последний параметр исполнителя в `/create` необязателен.

## Запуск через systemd

Готовый unit предполагает установку в `~/intraservice-telegram-bot`:

```bash
mkdir -p ~/.config/systemd/user
cp systemd/intraservice-telegram-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now intraservice-telegram-bot.service
systemctl --user status intraservice-telegram-bot.service
```

Журнал:

```bash
journalctl --user -u intraservice-telegram-bot.service -f
```

## Документация

| Документ | Содержание |
|---|---|
| [Полный русский мануал](docs/ru/MANUAL.md) | Установка, конфигурация, поиск ID, сценарии, systemd, backup и решение проблем |
| [Full English manual](docs/en/MANUAL.md) | Complete English installation and administration guide |
| [SECURITY.md](SECURITY.md) | Правила безопасности и сообщение об уязвимостях |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Требования к изменениям и pull requests |
| [Releases](https://github.com/Fifth-Ace/intraservice-telegram-bot/releases) | Опубликованные версии и примечания к релизам |

## Обновление

```bash
git pull --ff-only
npm ci
npm run ci
systemctl --user restart intraservice-telegram-bot.service
```

Не добавляйте в Git `.env`, `config.json`, SQLite, логи, cookies и профиль
браузера. Эти файлы могут содержать credentials, внутренние ID и персональные
данные.

## Лицензия

[MIT](LICENSE).
