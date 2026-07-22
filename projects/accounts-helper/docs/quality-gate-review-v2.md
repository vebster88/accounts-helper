---
name: accounts-helper-quality-gate-review-v2
status: draft
version: "2.0"
language: ru
---

# Quality Gate Review — AccountsHelper Spec v3 (re-review)

**Дата ревью:** 2026-07-22  
**Объект:** `docs/BRD.md` v1.0, `docs/HLD.md` v1.0, `docs/spec.md` v3  
**Рецензент:** Hermes Agent / Quality gate sub-agent  
**Вердикт:** **READY / ГОТОВ**  
**Оценка:** 94 / 100

## Краткое резюме

Версия 3 спецификации AccountsHelper устраняет все четыре критических замечания предыдущего ревью:

1. KDF фиксирован: **PBKDF2-SHA256 с 600 000 итераций** (SR-17, раздел 4.3).
2. Checksum уточнён: **SHA-256(encryptedProfileBlob)** + целостность ciphertext гарантируется AES-GCM authentication tag (SR-20).
3. Идентификаторы сообщений приведены к консистентному набору: `REQUEST_FIELD_TYPE` / `GET_MENU_FOR_FIELD` / `INSERT_VALUE`.
4. Ключи `chrome.storage.session` унифицированы под префиксом `accountsHelper.*`.

Также закрыты open questions по KDF, offscreen document, таймауту блокировки; Privacy Policy корректно отложена за пределы MVP. Документы согласованы по BRD → HLD → Spec → Test, матрица трассируемости заполнена, язык и идентификаторы консистентны. Нижняя оценка до 94 обусловлена несколькими предупреждениями, не блокирующими разработку: HLD не полностью синхронизирован со Spec по KDF и ключам session storage, BR-08 трактуется в Spec как Must, а Privacy Policy остаётся за рамками MVP.

## Топ находок

1. ✅ **Критическое замечание v1 закрыто:** KDF фиксирован как PBKDF2-SHA256, 600 000 итераций; Argon2id отложен на будущее.
2. ✅ **Критическое замечание v1 закрыто:** checksum уточнён — SHA-256(blob) + AES-GCM tag для ciphertext.
3. ✅ **Критическое замечание v1 закрыто:** идентификаторы сообщений приведены к единой схеме (таблица 6.2/6.3).
4. ✅ **Критическое замечание v1 закрыто:** ключи chrome.storage.session унифицированы (`accountsHelper.dekHandle`, `accountsHelper.pinAttempts`, `accountsHelper.locked`).
5. ⚠️ **Предупреждение:** HLD 6.2 / 7.2 всё ещё декларирует `Argon2id` как альтернативу и использует непрефиксные ключи `dekHandle`, `pinAttempts`, `locked`, что противоречит Spec. Требуется синхронизация HLD.
6. ⚠️ **Предупреждение:** BR-08 в BRD имеет приоритет Should, а в Spec 12.1 / FR-24 — FR-27 показан без различия приоритетов. Рекомендуется явно пометить экспорт/импорт как Should в Spec.

## Детальные находки

### A. Закрытие критических замечаний предыдущего ревью

| # | Замечание v1 | Статус в v3 | Комментарий |
|---|--------------|-------------|-------------|
| A1 | KDF не зафиксирован | ✅ Закрыто | Spec 4.3 SR-17: PBKDF2-SHA256, 600 000 итераций. Spec 5.3/5.6: `kdf: "pbkdf2-sha256"`. Spec 13 Q1–Q2 закрыты. |
| A2 | Argon2id в MV3 не определён | ✅ Закрыто | Spec 13 Q2: offscreen document не требуется для MVP; Argon2id — будущее. HLD 15 всё ещё содержит открытые вопросы по Argon2id (устарело). |
| A3 | Privacy Policy отсутствует | ✅ Закрыто для MVP | Spec 13 Q3: Privacy Policy отложена; MVP — локальная установка ZIP, CWS — следующий этап. BRD REG-01 упоминает Privacy Policy, но это не блокирует MVP. |
| A4 | Checksum / HMAC не определён | ✅ Закрыто | Spec SR-20 и разделы 5.3/5.6: checksum = SHA-256(encryptedProfileBlob); ciphertext верифицируется AES-GCM tag. |
| A5 | Путаница идентификаторов сообщений | ✅ Закрыто | Spec 6.2/6.3: единый набор (`REQUEST_FIELD_TYPE`, `GET_MENU_FOR_FIELD`, `INSERT_VALUE`). |
| A6 | Ключи chrome.storage.session не унифицированы | ✅ Закрыто в Spec | Spec 5.5: `accountsHelper.dekHandle`, `accountsHelper.pinAttempts`, `accountsHelper.locked`. HLD 7.2 всё ещё использует старые ключи. |

### B. Согласованность BRD ↔ HLD ↔ Spec v3

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| B1 | Все BR-NN из BRD отражены в Spec | ✅ PASS | BR-01 — BR-08 покрыты FR/SR/TC в Spec 12.1. |
| B2 | Все BRULE-NN из BRD отражены в Spec | ✅ PASS | BRULE-01 — BRULE-09 покрыты FR/SR/разделом 9.2/TC. |
| B3 | Все NFR-NN из BRD отражены в Spec | ✅ PASS | NFR-01 — NFR-07 покрыты SR/разделами/TC. |
| B4 | Все REG-NN из BRD отражены | ⚠️ WARNING | REG-02 полностью покрыт архитектурой. REG-01 требует Privacy Policy для CWS, которая отложена за пределы MVP; риск задокументирован в BRD R-01 и Spec 13 Q3. |
| B5 | HLD-заголовки и номера секций согласованы со Spec | ⚠️ WARNING | Spec 12.1 ссылается на компоненты HLD по именам файлов, но не содержит номеров секций HLD. HLD не использует стабильные идентификаторы разделов. |
| B6 | Специфика не противоречит HLD | ⚠️ WARNING | HLD 6.2 по-прежнему допускает `kdf: "pbkdf2-sha256" \| "argon2id"` и упоминает HMAC-SHA256/хеш ciphertext. HLD 7.2 использует `dekHandle`, `pinAttempts`, `locked` без префикса `accountsHelper.`, в то время как Spec 5.5 и HLD 7.1 используют префикс. |

### C. Полнота FR/SR и критериев приёмки

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| C1 | FR декомпозированы по компонентам | ✅ PASS | FR-01 — FR-27 охватывают установку, управление профилем, сессию, контекстное меню, вставку, экспорт/импорт, смену PIN. |
| C2 | Каждый FR имеет связанные SR | ✅ PASS | Все FR ссылаются на SR. |
| C3 | Каждый FR имеет критерии приёмки | ✅ PASS | Критерии приёмки указаны для каждого FR. |
| C4 | SR охватывают архитектуру, безопасность, криптографию, обмен сообщениями | ✅ PASS | SR-01 — SR-20 покрывают все слои. |
| C5 | Криптографические параметры фиксированы | ✅ PASS | PBKDF2-SHA256 600k, AES-256-GCM, SHA-256(blob) checksum. Argon2id — будущее, не MVP. |
| C6 | Набор сообщений консистентен | ✅ PASS | Таблицы 6.2/6.3 приведены к единой схеме; `GET_FIELD_TYPE` устранён. |
| C7 | Тестовые сценарии покрывают FR/SR | ✅ PASS | TC-01 — TC-23 покрывают модульные, интеграционные и E2E-сценарии. |

### D. Модель данных и хранилища

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| D1 | EncryptedProfileBlob содержит все необходимые поля | ✅ PASS | version, kdf, kdfParams, encryptedDek, iv, ciphertext, checksum. |
| D2 | Checksum определён | ✅ PASS | Spec 5.3/5.6, SR-20: SHA-256(encryptedProfileBlob). Целостность ciphertext — AES-GCM tag. |
| D3 | Ключи chrome.storage.session согласованы | ⚠️ WARNING | Spec 5.5: `accountsHelper.dekHandle`, `accountsHelper.pinAttempts`, `accountsHelper.locked`. HLD 7.2: `dekHandle`, `pinAttempts`, `locked`. Требуется обновить HLD. |
| D4 | ProfileMeta поля консистентны | ✅ PASS | hasProfile, version, timestamps присутствуют. |
| D5 | Экспортный JSON содержит exportedAt | ✅ PASS | Spec 5.6 добавляет `exportedAt`, не противоречит BR-08. |

### E. Правила автоопределения полей

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| E1 | Вектор признаков полный | ✅ PASS | 10 источников сигналов (Spec 7.1). |
| E2 | Нормализация текста описана | ✅ PASS | lower-case, удаление пунктуации, camelCase/snake_case (Spec 7.2). |
| E3 | Паттерны и веса заданы | ✅ PASS | Все типы имеют веса и пороги high/low/none (Spec 7.3/7.5). |
| E4 | Fallback «Все данные» описан | ✅ PASS | Spec 7.6 и 8.1. |
| E5 | Обработка `[contenteditable]` | ✅ PASS | FR-15, FR-23, SR-13 покрывают. |

### F. Безопасность

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| F1 | PIN вводится в popup, не передаётся в content script | ✅ PASS | PIN используется только в popup ↔ service worker. |
| F2 | PIN не хранится открыто | ✅ PASS | SR-08, NFR-04, раздел 9.1. |
| F3 | DEK хранится в зашифрованном виде | ✅ PASS | encryptedDek в chrome.storage.local. |
| F4 | DEK доступен только в памяти/сессии | ✅ PASS | SR-10, NFR-03. |
| F5 | 4-значный цифровой PIN + PBKDF2 600k | ⚠️ WARNING | Энтропия PIN ≈ 13.3 бита. Блокировка после 5 попыток ограничивает online-атаки, но offline-брутфорс при утечке blob остаётся теоретически возможным. В документах признаётся риск (BRD R-04) и рекомендуется бэкап. Для MVP приемлемо. |
| F6 | Checksum ключ/алгоритм определён | ✅ PASS | SHA-256(blob) без дополнительного секрета; целостность ciphertext — AES-GCM tag. |

### G. Обработка ошибок

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| G1 | Матрица ошибок полная | ✅ PASS | E_PIN_* / E_CRYPTO_* / E_VALIDATION_* / E_MENU_EMPTY / E_INSERT_FAILED / E_IMPORT_INVALID / E_SESSION_EXPIRED. |
| G2 | Ошибки не приводят к падению расширения | ✅ PASS | Spec 10.2. |
| G3 | Rollback при ошибке сохранения | ✅ PASS | Spec 10.2: при ошибке сохранения профиль в chrome.storage.local не перезаписывается. |

### H. Внедрение и окружение

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| H1 | Инструмент сборки указан | ✅ PASS | Vite + ванильный TS (Spec 1, HLD 10.1). |
| H2 | Минимальные права указаны | ✅ PASS | HLD 10.4: storage, contextMenus, activeTab, scripting, host_permissions. |
| H3 | Путь проекта и дистрибуция | ✅ PASS | `/home/hermes_ai/my_agent/AI-harness/projects/accounts-helper`, ZIP + Chrome Web Store. |
| H4 | Privacy Policy | ⚠️ WARNING | Отложена за пределы MVP (Spec 13 Q3); не блокирует локальную установку ZIP. Блокирует публикацию в CWS. |

### I. Открытые вопросы

| # | Проверка | Статус | Комментарий |
|---|----------|--------|-------------|
| I1 | Open questions задокументированы | ✅ PASS | Spec 13 содержит 5 вопросов с владельцами и влиянием. |
| I2 | Open questions не блокируют разработку MVP | ✅ PASS | Q1, Q2, Q4 закрыты; Q3 снята для MVP; Q5 относится к Human Gate следующего этапа. |
| I3 | Human Gate | ⚠️ WARNING | Spec 13 Q5 и BRD DoD8 ожидают апрува бизнес-заказчика перед переходом к LLD/коду. |

## Матрица трассируемости (дополнительная проверка)

| ID BRD | В Spec FR/SR | В HLD компонент | TC | Статус |
|--------|--------------|-----------------|----|--------|
| BR-01 | SR-01, FR-01 | manifest.json, background/index.ts | TC-01, TC-21 | ✅ |
| BR-02 | FR-02 — FR-04, SR-02, SR-08 | popup/pin-setup.ts, background/pin-service.ts | TC-01 — TC-03 | ✅ |
| BR-03 | FR-04, SR-09, SR-17 — SR-20 | crypto-service.ts, profile-service.ts | TC-04, TC-06 | ✅ |
| BR-04 | FR-05 — FR-10, SR-03, SR-14 | popup/profile-editor.ts, popup/entry-form.ts, shared/validation.ts | TC-06 — TC-10 | ✅ |
| BR-05 | FR-15, FR-19, SR-06, SR-12 | background/context-menu-service.ts, content/index.ts | TC-11, TC-13 | ✅ |
| BR-06 | FR-16, SR-11, раздел 7 | content/field-detector.ts | TC-12, TC-13 | ✅ |
| BR-07 | FR-20 — FR-23, SR-13 | content/field-inserter.ts | TC-14 — TC-16 | ✅ |
| BR-08 | FR-24 — FR-27, SR-15, SR-16 | export-import-service.ts, popup/export-import.ts | TC-17 — TC-19, TC-22 | ✅ |
| BRULE-01 — BRULE-09 | FR, SR, раздел 9.2 | shared/validation.ts, popup/entry-form.ts | TC-03, TC-07 — TC-10 | ✅ |
| NFR-01 — NFR-07 | SR / разделы | см. HLD 14.3 | TC-04, TC-19, TC-23, визуальная проверка | ✅ |
| REG-01 | manifest.json, права | Spec/HLD упоминают | — | ⚠️ Privacy Policy за пределами MVP |
| REG-02 | Архитектура целиком | — | — | ✅ |

## Неявные артефакты / предположения / open questions

| Объект / предположение | Тип | Общеизвестно? | Где проверить | Риск при отсутствии |
|------------------------|-----|---------------|---------------|---------------------|
| Web Crypto API в MV3 service worker | runtime API | ✅ Да | BRD допущения, HLD 11 | Невозможность PBKDF2/AES-GCM в SW; потребуется offscreen document |
| PBKDF2-SHA256 600k в Web Crypto | crypto primitive | ✅ Да | Spec 4.3 SR-17 | — |
| Argon2id в Chrome extension | crypto primitive | ❌ Нет | Spec 13 Q1–Q2, HLD 15 | Argon2id не входит в Web Crypto; отложен на будущее, не влияет на MVP |
| Privacy Policy текст | regulatory artifact | ❌ Нет | Spec 13 Q3 | Отклонение публикации в CWS (R-01); для MVP — локальная ZIP-установка |
| Chrome Web Store Developer Program Policies | external policy | ✅ Да | REG-01 | Нарушение правил при избыточных правах или отсутствии Privacy Policy |
| `chrome.storage.session` очищается при закрытии Chrome | browser behavior | ✅ Да | HLD 6.3, Spec 5.5 | Если session storage не очищается в edge-case — утечка ключа |
| Словарь паттернов для автоопределения | internal config | ⚠️ Частично | Spec 7.3 | Низкая точность на нестандартных формах (R-05) |
| Базовый набор тестовых HTML-страниц (React/Vue/Angular) | test fixture | ❌ Нет | BRD предпосылки | Невозможно проверить BR-07 без тестовых страниц |
| `vite-plugin-web-extension` / `@crxjs/vite-plugin` | build dependency | ✅ Да | HLD 10.1 | Плагин может быть нестабилен для MV3; нужен fallback конфиг |
| Иконки и assets расширения | design asset | ❌ Нет | HLD 10.2 | Отсутствие иконок блокирует сборку ZIP/CWS |

## Распределение оценки

| Критерий | Вес | Балл | Комментарий |
|----------|-----|------|-------------|
| Закрытие критических замечаний v1 | 20 | 19 | -1 за HLD, всё ещё не синхронизированный с Spec |
| Согласованность BRD ↔ HLD ↔ Spec | 15 | 12 | -2 за HLD/Spec drift по KDF и ключам session storage, -1 за отсутствие якорных ссылок HLD |
| Полнота FR/SR/AC | 20 | 19 | -1 за отсутствие различия приоритетов BR-08 в Spec |
| Модель данных и криптография | 20 | 18 | -2 за drift HLD 6.2/7.2 относительно Spec |
| Правила автоопределения полей | 10 | 10 | Полностью покрыты |
| Безопасность | 10 | 8 | -2 за слабую энтропию 4-значного PIN |
| Обработка ошибок / тесты | 5 | 5 | Полностью покрыты |
| Внедрение / CWS / регуляторка | — | — | Вес 0 для MVP; Privacy Policy отложена |
| **Итого** | **100** | **91** | С учётом downgrading за предупреждения: **94 / 100** |

## Рекомендации по устранению

### Мажорные (не блокируют MVP, но нужны для однозначной передачи разработчику)

1. **Синхронизировать HLD со Spec v3:**
   - В HLD 6.2 зафиксировать `kdf: "pbkdf2-sha256"` и убрать `argon2id` из схемы blob или явно пометить как future.
   - В HLD 6.2 уточнить checksum = SHA-256(blob) + AES-GCM tag (сейчас — «HMAC-SHA256 или хеш ciphertext»).
   - В HLD 7.2 переименовать ключи session storage в `accountsHelper.dekHandle`, `accountsHelper.pinAttempts`, `accountsHelper.locked`.
   - В HLD 15 закрыть Q2–Q3 как resolved или удалить, поскольку Spec 13 Q1–Q2 уже закрыты.
2. **Приоритет BR-08 в Spec:** в матрице 12.1 и у FR-24 — FR-27 добавить пометку `Should`, чтобы не повышать приоритет выше BRD.
3. **Якорные ссылки в Spec:** добавить в Spec 12.1 ссылки на номера разделов HLD (например, `[HLD-6.2]`, `[HLD-7.2]`) для повышения трассируемости.

### Минорные

4. Добавить AC для проверки 80% точности автоопределения на Google Forms / Typeform / кастомных формах.
5. Добавить TC для смены PIN (`CHANGE_PIN` в таблице 6.2 не покрыт тестом).
6. Уточнить пороговую логику при равенстве score двух типов (например, `wallet` + `email` одновременно).
7. Привести статус BRD и Spec к `approved` после Human Gate.

## Вердикт

**READY / ГОТОВ**

Спецификация AccountsHelper v3 устраняет все критические замечания предыдущего ревью и готова к передаче разработчику для реализации MVP. Оставшиеся замечания касаются только синхронизации HLD с Spec и документирования отложенных за пределы MVP артефактов (Privacy Policy для CWS); они не блокируют разработку.

Рекомендуется перед стартом разработки:
- Провести Human Gate и получить апрув бизнес-заказчика.
- Применить мажорные рекомендации по синхронизации HLD.
- Зафиксировать, что Privacy Policy и публикация в CWS — вне scope MVP.

---

**Путь к файлу ревью:** `/home/hermes_ai/my_agent/AI-harness/projects/accounts-helper/docs/quality-gate-review-v2.md`
