# AccountsHelper

Chrome-расширение (Manifest V3) для автозаполнения форм из зашифрованного профиля. Профиль разблокируется 4-значным PIN на одну сессию браузера.

## Возможности

- Хранение email, EVM- и BTC-адресов, Discord/Telegram/X-handle'ов, телефона, имени, фамилии и nickname.
- Правый клик на поле ввода → автоматическое определение типа поля → вставка нужного значения.
- Fallback-меню «Все данные», если тип поля определить не удалось.
- Защита профиля: AES-256-GCM + PBKDF2-SHA256 600 000 итераций.
- PIN только из 4 цифр, действителен одну сессию браузера.
- Блокировка после 5 неудачных попыток ввода PIN до перезапуска Chrome.
- Экспорт/импорт зашифрованного профиля в JSON.

## Установка для тестирования

1. Скачайте архив со страницы [Releases](https://github.com/vebster88/accounts-helper/releases/latest) и распакуйте.
2. Откройте Chrome → `chrome://extensions/`.
3. Включите «Режим разработчика» (Developer mode).
4. Нажмите «Загрузить распакованное расширение» (Load unpacked).
5. Выберите распакованную папку.

## Сборка из исходников

```bash
npm install
npm run test:run   # 23/23 unit-тестов
npm run build      # production-сборка в dist/
```

## Архитектура

- `src/background/` — service worker: криптография, хранение, контекстное меню, маршрутизация сообщений.
- `src/content/` — content script: детекция типа поля и вставка значения.
- `src/popup/` — интерфейс popup: установка PIN, разблокировка, CRUD записей, настройки, экспорт/импорт.
- `src/shared/` — константы, типы, валидация, messaging helpers.
- `tests/` — unit-тесты Vitest.

## Документация

- `docs/BRD.md` — Business Requirements Document
- `docs/HLD.md` — High-Level Design
- `docs/spec.md` — System Specification

Внутренние QA-артефакты (test-report, quality-gate reviews) не публикуются в открытой репе.

## Безопасность

- Профиль хранится только в `chrome.storage.local` в зашифрованном виде.
- DEK (ключ расшифровки) держится в памяти service worker и `chrome.storage.session`; стирается при блокировке или закрытии Chrome.
- PIN не сохраняется нигде; используется только для KDF.
- Экспорт включает SHA-256 checksum blob для проверки целостности.

## Статус

MVP v1.0.0 — Quality Gate 2 **PASS**. Расширение готово к ручному тестированию в Chrome. Публикация в Chrome Web Store и подготовка Privacy Policy — следующие шаги.

## Лицензия

MIT
