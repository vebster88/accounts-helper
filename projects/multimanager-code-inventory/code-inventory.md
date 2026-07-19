# MultiManager — Инвентаризация кодовой базы

**Дата:** 2026-07-19
**Репозиторий:** stalckerChain/MultiManager
**Локальный путь:** /home/hermes_ai/my_agent/AI-harness/projects/multimanager-code
**Версия:** 1.3.2

## Архитектура

Core (Express + better-sqlite3 + WebSocket) + GUI (Electron + Vue).
Core запускается как отдельный процесс, управляется GUI через `core-manager.js`.

## Точка входа

- `src/index.js` — CLI: `--api-token`, `--port`, инициализация БД, backup, master key, HTTP/WebSocket сервер.

## Routing

- `src/core/app.js` — Express app, rate limit, auth, монтирование 17 роутеров.
- `src/core/websocket.js` — WebSocket `/ws` для push-уведомлений GUI.

## База данных

- `src/db/index.js` — инициализация SQLite (WAL).
- `src/db/schema.js` — 9 таблиц.
- `src/db/queries.js` — query factories.

### Таблицы

| Таблица | Назначение |
|---|---|
| `profiles` | Профили браузера |
| `proxies` | Прокси |
| `cookies` | Куки |
| `profile_logs` | Логи профилей |
| `system_config` | Системные настройки |
| `projects` | Проекты Automation Matrix |
| `project_profile_config` | Связь проект-профиль + is_enabled |
| `runs` | Запуски Automation Matrix |
| `run_tasks` | Задачи внутри run |

## Security / Crypto

- `src/api/auth.js` — Bearer token.
- `src/crypto/index.js` — AES-256-GCM, keytar, system_config key, password mode.

## Профили и браузер

- `src/api/profiles.js` — CRUD, batch import.
- `src/api/browser.js` — запуск/остановка/управление браузером, CDP, Zerion login.

## Прокси / Куки / Фингерпринт

- `src/api/proxies.js` + `src/proxy/index.js` — CRUD, парсинг, проверка, ротация.
- `src/api/cookies.js` + `src/cookie/index.js` + `src/cookie/inject.js` — импорт/экспорт, инжекция Netscape.
- `src/api/fingerprint.js` + `src/fingerprint/index.js` — генерация fingerprint.

## Automation Matrix

- `src/api/projects.js` — синхронизация проектов из `stAuto0/config/projects.py`.
- `src/api/matrix.js` — чтение активных проектов из БД, обновление matrix.
- `src/api/runs.js` — создание и запуск run.
- `src/executor/index.js` — группировка задач по профилю, параллельный запуск Python процессов.
- `src/api/internal.js` — внутренний API для выдачи профилей Python-скриптам.
- `src/api/internal-runs.js` — приём статусов задач от Python-скриптов.
- `src/config/stauto0-config.js` — парсинг Python-конфига.

## Multi-Control

- `src/multi-control/index.js` — master/slave controller.
- `src/multi-control/cdp-manager.js` — CDP WebSocket manager.
- `src/multi-control/mouse-smoothing.js` — ghost-cursor сглаживание.
- `src/api/multi-control.js` — API multi-control.
- `src/os-input/input-capture.js`, `windows-hooks.js`, `hook-worker.js`, `native-hooks/` — native hooks Windows.

## Window Arranger

- `src/api/window-arranger.js` — управление окнами, grid/cascade/focus, cross-platform.

## Extensions

- `src/api/extensions.js` — CRUD расширений, установка из Chrome Web Store, zip, local path.

## Settings / Logs / Internal

- `src/api/settings.js` — crypto status, recovery key, automation settings.
- `src/api/logs.js` — чтение core/profile логов.
- `src/api/validate.js` — Zod schemas.
- `src/logger/index.js` — pino logger.
- `src/cdp/client.js` — CDP WebSocket client.
- `src/typing/index.js` — human-like typing.

## Расхождения с документацией

| Документация | Код | Статус |
|---|---|---|
| Automation Matrix source = `stAuto0/config/projects.py` | projects.py → синхронизация → БД, runtime читает БД | Docs устарели |
| Multi-Control v0.13.0 | v0.15.0 (real scroll, activateAndFocusTarget) | Docs устарели |
| Window Arranger Windows-only | Поддержка win32/linux/darwin | Docs устарели |
| DATABASE.md 5 таблиц | 9 таблиц | Docs неполные |

## Риски

1. Crypto fields encrypted only when `hasMasterKey()` — plaintext fallback possible.
2. `setupPasswordMode` / `set-master-password` call `clearMasterKey()` before `setMasterKey()` — suspicious.
3. Cookie injection uses Netscape text file, not Chromium SQLite format.
4. RunExecutor relies on Python process exit and internal callback for success.
5. Windows-only native hooks; cross-platform behavior diverges.
6. Hardcoded Zerion extension ID, Chrome Web Store URL, ipify/ip-api.
7. Default paths Windows-centric (`~/.cloakbrowser`, `~/AI/stAuto0/venv/Scripts/python.exe`).

## Не изучено

- `gui/src/` (Electron + Vue)
- `tests/`
- CI/CD конфиги

## GUI

### Структура

- `gui/src/main/` — Electron main process
- `gui/src/preload/` — preload bridge
- `gui/src/renderer/` — Vue 3 frontend
- `gui/src/shared/` — shared utilities

### Main process

| Файл | Назначение |
|---|---|
| `main/index.js` | Entry: BrowserWindow, core launch, IPC, graceful shutdown |
| `main/core-manager.js` | Fork core process, port/token management |
| `main/browser-manager.js` | CloakBrowser CLI/binary detection and install |
| `main/keyboard-hooks.js` | Load native hooks.node, forward keys to Core |
| `main/tray.js` | System tray menu |
| `main/updater.js` | electron-updater integration |
| `main/pty.js` | IPC tail -f / PowerShell log streaming |

### Preload

| Файл | Назначение |
|---|---|
| `preload/index.js` | Exposes `window.electronAPI` to renderer |

### Renderer

| Файл | Назначение |
|---|---|
| `renderer/main.js` | Vue app init, Pinia, router, i18n |
| `renderer/App.vue` | Root layout with theme |
| `renderer/router.js` | 7 routes |
| `renderer/api/client.js` | Axios with dynamic port/token |
| `renderer/stores/app.js` | Port/token/theme/language |
| `renderer/stores/profiles.js` | Profile CRUD |
| `renderer/stores/browser.js` | Browser start/stop/clean |
| `renderer/stores/sync.js` | Multi-control sync state |
| `renderer/stores/automation.js` | Matrix/runs/projects |
| `renderer/composables/useWebSocket.js` | WS /ws with reconnect |
| `renderer/views/Profiles.vue` | Main profile table |
| `renderer/views/Proxies.vue` | Proxy management |
| `renderer/views/WindowArranger.vue` | Window grid/cascade |
| `renderer/views/Extensions.vue` | Extension manager |
| `renderer/views/Settings.vue` | Settings + crypto + automation |
| `renderer/views/AutomationMatrix.vue` | Project-profile matrix |
| `renderer/views/AutomationRuns.vue` | Active runs monitor |
| `renderer/views/AutomationHistory.vue` | Completed runs history |
| `renderer/components/Layout.vue` | App shell with menu |
| `renderer/components/BrowserDownload.vue` | CloakBrowser install modal |

## Security observations

- WebSocket `/ws` has no authentication handshake.
- `/api/settings/recovery-key` returns plaintext recovery key to any authenticated client.
- Native keyboard hooks require compiled `hooks.node` addon (Windows-only).
- GUI token is exposed to renderer and can be copied to clipboard.

