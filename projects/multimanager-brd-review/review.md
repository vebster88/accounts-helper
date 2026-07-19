# Quality Gate Review — Пакет документации MultiManager

**Дата ревью:** 2026-07-19  
**Объект:** `source_ts.md` (SRS), `brd.md`, API-документы (`API.md`, `API.en.md`, `API.zh.md`), DB-документы (`DATABASE.md`, `DATABASE.en.md`, `DATABASE.zh.md`), `DEPLOY.md`, `MULTI-CONTROL.md`.  
**Рецензент:** Quality gate sub-agent  
**Вердикт:** **NOT READY / НЕ ГОТОВ**  
**Оценка:** 62 / 100

---

## Краткое резюме

Пакет документации покрывает большинство высокоуровневых фич MultiManager v2.0.0 и внутренне непротиворечив в рамках одного языка. Однако множество междокументных противоречий, неполнота схемы БД, непоследовательность многоязычных API-документов и отсутствие сведений о runtime/deployment делают пакет непригодным в качестве единого источника истины для разработки или QA. Требуется доработка перед статусом READY.

---

## Топ-5 находок

1. **Критическое противоречие: API-документы конфликтуют с TS.md по источнику проектов Automation Matrix.**  
   `TS.md §3.3` и `§4.16` утверждают, что `/api/matrix` читает проекты из таблицы БД `projects` (только `is_active = 1`). `API.md` и `API.en.md` для `GET /api/matrix` утверждают прямо противоположное: «проекты читаются напрямую из `stAuto0/config/projects.py` … синхронизация не требуется». Эти утверждения взаимоисключающие.  
   **Влияние:** разработчик не может понять, управляется ли матрица через БД или через файл.  
   **Рекомендация:** выбрать канонический источник (БД, как в TS.md), обновить все API-документы и убрать устаревшие формулировки про `allowed_profile_ids`, если они больше не актуальны.

2. **Документация схемы БД неполна относительно TS.md / BRD.**  
   `TS.md §3.3` и `BR-05` требуют таблиц `projects`, `project_profile_config`, `runs`, `run_tasks`. DATABASE-документы (`*.md`, `*.en.md`, `*.zh.md`) описывают только `profiles`, `proxies`, `cookies`, `profile_logs`, `system_config`. Они не описывают четыре таблицы Automation Matrix, их колонки, индексы и внешние ключи. Также в диаграмме связей упоминаются `tasks` и `task_executions`, которые нигде не определены и не используются.  
   **Влияние:** схема БД в документации не соответствует реальной/требуемой схеме; риск дрейфа интеграции.  
   **Рекомендация:** добавить полные разделы для `projects`, `project_profile_config`, `runs`, `run_tasks`; удалить или определить `tasks` / `task_executions`.

3. **Дрейф версий Multi-Control и недостаточно явно документированное ограничение native hooks.**  
   `TS.md` маркирует Multi-Control как «v0.13.0», в то время как `MULTI-CONTROL.md` указывает «Current: v0.15.0». API-документы повторяют «v0.13.0». Более важно, что Windows-only характер `WH_KEYBOARD_LL` hooks объясняется в `DEPLOY.md`, но не отражается в разделах API/Multi-Control в `API.md`, `API.en.md`, `API.zh.md` за исключением общей ссылки на OS-level hooks.  
   **Влияние:** пользователи macOS/Linux могут предположить полную паритетность синхронизации клавиатуры.  
   **Рекомендация:** добавить явный блок «Platform Limitations» в раздел Multi-Control каждого API-документа, указывающий, что native hooks только для Windows, а на macOS/Linux используется CDP-only fallback.

4. **DEPLOY.md не описывает необходимые runtime-зависимости и переменные окружения.**  
   `DEPLOY.md` хорошо покрывает сборочные зависимости, но не документирует: переменную окружения `PORT` (канонический способ передачи порта Core из GUI согласно `TS.md §3.4`), семантику CLI `--api-token`, ограничения по версиям Node для Electron vs Core, настройку Python/venv для интеграции stAuto0, маппинг `STAUTO0_PATH` / `PYTHON_PATH` в настройки, процедуру restore из backup.  
   **Влияние:** dev/ops не смогут воспроизвести рабочее окружение только по документации.  
   **Рекомендация:** добавить раздел «Runtime Environment», покрывающий `PORT`, `--api-token`, совместимость ABI Node/Electron, пути stAuto0, first-run flow мастер-пароля/recovery-key.

5. **Переводы API-документов расходятся по полноте и содержат устаревший контент.**  
   - `API.zh.md` не включает полные CRUD-ответы `/api/projects` и ответ `PUT /api/settings/automation` с `syncResult`; также отсутствуют разделы «Projects / Matrix / Runs», присутствующие в `API.md` и `API.en.md` (китайский документ обрывается на Settings, затем перескакивает на Profile Statuses).  
   - `API.zh.md` и `API.en.md` сохраняют устаревшую формулировку `allowed_profile_ids` / «read from config file» для матрицы.  
   - `API.en.md` не содержит целых разделов Projects/Matrix/Runs/Internal-runs, которые есть в `API.md`.  
   **Влияние:** не-русскоязычные потребители не могут полагаться на локализованные документы; интент BRD/TS.md не переносится.  
   **Рекомендация:** пересинхронизировать `API.en.md` и `API.zh.md` с каноническим `API.md`, обеспечив перевод каждого endpoint, статуса и ошибки.

---

## Детальные находки

### 1. Согласованность TS.md ↔ API / DATABASE / DEPLOY / MULTI-CONTROL

| Область | TS.md / BRD | Документы | Статус |
|---------|-------------|-----------|--------|
| Источник проектов Matrix | Таблица БД `projects`, `is_active=1` | API.md / API.en.md утверждают прямое чтение из файла; API.zh.md опускает раздел | ❌ Противоречие |
| `/api/projects` CRUD | `GET/POST(sync)/:name GET/PUT/DELETE` | Есть в API.md; отсутствует в API.en.md / API.zh.md | ❌ Несогласованность |
| `/api/runs` endpoints | Полный CRUD + start/cancel + callback | Есть в API.md; отсутствует в API.en.md / API.zh.md | ❌ Несогласованность |
| Таблица `task_executions` | Упоминается в диаграмме связей | Не определена нигде | ❌ Неявный артефакт |
| Передача токена | `--api-token` + env `PORT` | API-документы упоминают только `--api-token`; DEPLOY.md не упоминает `PORT` | ⚠️ Неполно |
| Порт Core | env `PORT` по `TS.md §3.4` | API-документы пишут default 3000; DEPLOY.md пишет 3000–3100; нигде не указан env | ⚠️ Неполно |
| Версия Multi-Control | TS.md: v0.13.0; MULTI-CONTROL.md: v0.15.0 | API-документы: v0.13.0 | ⚠️ Дрейф |

### 2. Полнота API-контрактов

- **Profiles:** `POST /api/profiles` пишет, что обязательны только `name` и `platform`, но `TS.md §3.2` требует `timezone` при создании. В тексте есть «timezone required», но не в списке обязательных полей — небольшое несоответствие.
- **Browser / clean:** документ пишет «only for stopped profiles» и показывает 409, но `TS.md §4.8` говорит, что мьютекс при starting/running тоже возвращает 409. Формулировка близка, но стоит явно упомянуть мьютекс.
- **Settings:** ответ `/api/settings/automation` включает `availableProjects`, но нет отдельного endpoint для их списка.
- **Internal API:** `POST /api/internal/runs/:id/task-status` задокументирован только в `API.md`/`API.en.md`; отсутствует в `API.zh.md`.
- **WebSocket:** не задокументирован ни в одном API-документе, хотя является частью архитектуры (`TS.md §1`, `§9.6`).
- **Отсутствует 503:** `TS.md §2` указывает 503, если токен не инициализирован; ни в одном API-документе код 503 не приведён.
- **Отсутствует endpoint:** `POST /api/browser/shutdown` (массовая остановка) из `TS.md §4.9` не представлен в API-документах.

### 3. Полнота схемы БД

- Отсутствуют таблицы: `projects`, `project_profile_config`, `runs`, `run_tasks`.
- Нет детализации колонок: `projects.name` PK, семантика `default_config` JSON, `run_tasks.log_file_path`, `attempts` и т.д.
- `tasks` / `task_executions` показаны в диаграмме связей, но не определены; `task_executions` не упоминается в TS.md. Похоже на устаревший или неявный артефакт, который нужно либо определить, либо удалить.
- Нет DDL внешних ключей / каскадных правил для новых таблиц.
- Все три языковые версии одинаково неполны.

### 4. Покрытие deployment / окружения

- Хорошо описаны шаги сборки Windows NSIS, macOS DMG, Linux AppImage.
- Отсутствуют: first-run конфигурация, как GUI fork'ает Core, env `PORT`, `--api-token` regeneration, настройка master-key, интеграция stAuto0, layout директории логов, процедура restore из backup.
- Есть troubleshooting ABI-mismatch native-модулей, но нет указания по pin-у Electron Node ABI или использованию `electron-rebuild` в CI.

### 5. Cross-platform ограничение Multi-Control

- `DEPLOY.md §6` и `§7` корректно отмечают, что `hooks.node` только Windows, а на macOS/Linux fallback к CDP-only.
- `MULTI-CONTROL.md` детально описывает native C++ addon и double-dispatch.
- `API.md`/`.en.md`/`.zh.md` в разделах Multi-Control **не содержат** явного предупреждения об ограничении; можно предположить, что native hooks работают везде.

### 6. Пробелы, противоречия, неявные артефакты

- **BRD vs TS.md по передаче порта:** `BRD §6` пишет, что GUI передаёт порт через env `PORT` — это соответствует `TS.md §3.4`. Но в `BRD §6` также написано «token передаётся через env PORT» — это опечатка (токен передаётся через CLI `--api-token`).
- **Cookie drag-and-drop:** помечен как «partial» в TS.md/BRD, но в API-документах не упоминается вовсе.
- **Window Arranger группировка:** endpoint'ы задокументированы, но в TS.md/BRD помечены как не реализованные (cross-platform группировка). API-документы не содержат caveat.
- **`profiles.number` формат:** Internal API `range=001-010` подразумевает 3-значный zero-padded номер, но в схеме `INTEGER`; правило нумерации не определено.
- **`MULTI-CONTROL.md` extraction artifact:** кешированный результат был JSON-escaped blob; сам файл читается корректно, но содержит очень длинные строки. Контент полный и пригодный.

---

## Распределение оценки

| Критерий | Вес | Балл | Примечание |
|-----------|--------|-------|-------|
| Внутренняя согласованность (TS ↔ документы) | 25 % | 11 / 25 | Крупные противоречия по источнику матрицы, дрейф версий, отсутствие shutdown endpoint. |
| Полнота API-контрактов | 20 % | 11 / 20 | Основные endpoint'ы есть; отсутствуют WebSocket, 503, массовый shutdown, internal callback в zh. |
| Полнота схемы БД | 20 % | 8 / 20 | Четыре таблицы отсутствуют; устаревшие ссылки tasks/task_executions. |
| Покрытие deployment / окружения | 15 % | 9 / 15 | Сборка покрыта; runtime env, токен, порт, настройка stAuto0 отсутствуют. |
| Многоязычный паритет | 10 % | 4 / 10 | EN и ZH API-документы неполные/устаревшие по сравнению с русским каноном. |
| Ясность ограничений Multi-Control | 10 % | 6 / 10 | Ясно в DEPLOY/MULTI-CONTROL; отсутствует в API-документах. |
| **Итого** | **100 %** | **62 / 100** | |

---

## Обязательные действия перед повторным ревью

1. Унифицировать источник проектов Automation Matrix: обновить все API-документы в соответствии с `TS.md` (управляется через БД, `is_active=1`).
2. Добавить в DATABASE-документы определения таблиц `projects`, `project_profile_config`, `runs`, `run_tasks` на всех языках; удалить или определить `tasks` / `task_executions`.
3. Пересинхронизировать `API.en.md` и `API.zh.md` с `API.md` (Projects, Matrix, Runs, Internal callback, Settings syncResult).
4. Добавить callout «Platform Limitations» в раздел Multi-Control каждого API-документа (native hooks только Windows).
5. Добавить в `DEPLOY.md` раздел «Runtime Environment», покрывающий `PORT`, `--api-token`, ABI Node/Electron, пути stAuto0, backup restore.
6. Добавить отсутствующие endpoint'ы/статусы: `POST /api/browser/shutdown`, 503, краткое описание WebSocket-событий.
7. Исправить опечатку в `BRD §6`: токен передаётся через `--api-token`, порт через env `PORT`.

---

## Вердикт

**NOT READY / НЕ ГОТОВ** — Пакет документации требует доработки, сфокусированной на междокументной согласованности, полноте схемы БД, паритете локализаций и ясности deployment/runtime, прежде чем он сможет служить основой для системных требований или QA.
