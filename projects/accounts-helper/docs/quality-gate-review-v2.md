---
name: accounts-helper-quality-gate-review-v2
status: review
version: "1.0"
language: ru
---

# Quality Gate Review v2 — AccountsHelper

**Дата ревью:** 2026-07-22  
**Объект:** `docs/BRD.md`, `docs/HLD.md`, `docs/spec.md`  
**Версии:** BRD v1.0, HLD v1.0, Spec v3.0  
**Рецензент:** Hermes Agent / Quality gate sub-agent  
**Вердикт:** **APPROVE / ГОТОВ К РАЗРАБОТКЕ**  
**Оценка:** 94 / 100

## Краткое резюме

Повторная проверка спецификации AccountsHelper v3 показала, что все 3 критических риска, выявленных в первом ревью, закрыты:

- KDF зафиксирован: **PBKDF2-SHA256 с 600 000 итераций**.
- Checksum уточнён: **SHA-256(encryptedProfileBlob)** для быстрой проверки + **AES-GCM authentication tag** для ciphertext.
- Идентификаторы сообщений унифицированы; путаница `GET_FIELD_TYPE` / `REQUEST_FIELD_TYPE` устранена.
- Chrome storage keys для session хранилища унифицированы под префикс `accountsHelper.*`.

Спецификация содержит полную декомпозицию BRD/HLD в функциональные и системные требования, модель данных, контракты сообщений, правила автоопределения полей, структуру контекстного меню, валидацию, обработку ошибок, тестовые сценарии и матрицу трассируемости.

Остаётся одно условное замечание: Privacy Policy не создана, но вынесена из MVP (локальная установка через `.zip`). Публикация в Chrome Web Store — следующий этап.

## Проверка закрытия критических рисков v1

| # | Риск v1 | Статус | Комментарий |
|---|---|---|---|
| 1 | KDF не выбран / параметры не зафиксированы | ✅ Закрыто | Spec 4.3 SR-17: PBKDF2-SHA256, 600 000 итераций. Argon2id отложен в roadmap. |
| 2 | Argon2id в MV3 требует offscreen document | ✅ Закрыто | Argon2id исключён из MVP; Web Crypto API достаточно для PBKDF2. |
| 3 | Privacy Policy отсутствует | ⚠️ Условно | Вынесена из MVP; не блокирует разработку локального расширения. |
| 4 | Низкая энтропия 4-значного PIN | ✅ Принято | Риск R-04 задокументирован; PBKDF2 600k + счётчик попыток + сессионный ключ. |
| 5 | Путаница идентификаторов сообщений | ✅ Закрыто | Унифицировано до `REQUEST_FIELD_TYPE` и `GET_MENU_FOR_FIELD`. |
| 6 | Не унифицированы ключи `chrome.storage.session` | ✅ Закрыто | Все ключи с префиксом `accountsHelper.*`. |
| 7 | Алгоритм checksum не определён | ✅ Закрыто | `checksum = SHA-256(encryptedProfileBlob)`; ciphertext защищён AES-GCM tag. |

## Детальные проверки

### A. Согласованность BRD ↔ HLD ↔ Spec

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| A1 | Все BR-NN из BRD отражены в Spec | ✅ PASS | BR-01 — BR-08 покрыты FR/SR и тестами. |
| A2 | Все BRULE-NN из BRD отражены в Spec | ✅ PASS | BRULE-01 — BRULE-09 покрыты. |
| A3 | Все NFR-NN из BRD отражены в Spec | ✅ PASS | NFR-01 — NFR-07 покрыты. |
| A4 | REG-NN отражены, Privacy Policy отложена | ⚠️ WARNING | REG-01, REG-02 упомянуты; Privacy Policy — за пределами MVP. |
| A5 | HLD-заголовки и номера секций согласованы | ✅ PASS | Spec ссылается на компоненты HLD; minor: добавить якорные ссылки v4. |
| A6 | Спецификация не противоречит HLD | ✅ PASS | Ключи session storage унифицированы. |

### B. Полнота FR/SR и критериев приёмки

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| B1 | FR декомпозированы по компонентам | ✅ PASS | FR-01 — FR-27. |
| B2 | Каждый FR имеет связанные SR | ✅ PASS | |
| B3 | Каждый FR имеет критерии приёмки | ✅ PASS | |
| B4 | SR охватывают архитектуру, безопасность, криптографию, messaging | ✅ PASS | SR-01 — SR-20. |
| B5 | Криптографические параметры фиксированы | ✅ PASS | PBKDF2-SHA256 600k. |
| B6 | Набор сообщений консистентен | ✅ PASS | `REQUEST_FIELD_TYPE`, `GET_MENU_FOR_FIELD`, `INSERT_VALUE`. |
| B7 | Тестовые сценарии покрывают FR/SR | ✅ PASS | TC-01 — TC-23. |

### C. Модель данных и хранилища

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| C1 | EncryptedProfileBlob содержит все необходимые поля | ✅ PASS | |
| C2 | Checksum определён | ✅ PASS | SHA-256(blob) + AES-GCM tag. |
| C3 | Ключи chrome.storage.session согласованы | ✅ PASS | `accountsHelper.*`. |
| C4 | ProfileMeta поля консистентны | ✅ PASS | |
| C5 | Экспортный JSON содержит exportedAt | ✅ PASS | |

### D. Правила автоопределения полей

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| D1 — D5 | Полный вектор, нормализация, паттерны, fallback, contenteditable | ✅ PASS | Раздел 7 Spec. |

### E. Безопасность

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| E1 — E4 | PIN в popup, PIN не хранится открыто, DEK зашифрован, DEK в памяти | ✅ PASS | |
| E5 | 4-значный PIN | ⚠️ WARNING | Энтропия 13.3 бита; принято с осознанием риска (BRD R-04). Рекомендуется запретить простые PIN (0000, 1234). |
| E6 | Checksum/key определён | ✅ PASS | |

### F. Обработка ошибок

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| F1 — F3 | Матрица ошибок, не падение, rollback | ✅ PASS | |

### G. Внедрение и окружение

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| G1 — G3 | Сборка, права, путь проекта | ✅ PASS | |
| G4 | Privacy Policy | ⚠️ WARNING | Не создана; не блокирует MVP. |

### H. Открытые вопросы

| # | Проверка | Статус | Комментарий |
|---|---|---|---|
| H1 | Open questions задокументированы | ✅ PASS | |
| H2 | Блокирующие вопросы закрыты | ✅ PASS | KDF, offscreen document, auto-lock закрыты. Privacy Policy — вне MVP. |
| H3 | Human Gate | ✅ PASS | Текущий этап. |

## Матрица трассируемости (краткая проверка)

| ID BRD | В Spec FR/SR | В HLD компонент | TC | Статус |
|---|---|---|---|---|
| BR-01 | SR-01, FR-01 | manifest.json, background/index.ts | TC-01, TC-21 | ✅ |
| BR-02 | FR-02 — FR-04, SR-02, SR-08 | popup/pin-setup.ts, background/pin-service.ts | TC-01 — TC-03 | ✅ |
| BR-03 | FR-04, SR-09, SR-17 — SR-20 | crypto-service.ts, profile-service.ts | TC-04, TC-06 | ✅ |
| BR-04 | FR-05 — FR-10, SR-03, SR-14 | popup/profile-editor.ts, shared/validation.ts | TC-06 — TC-10 | ✅ |
| BR-05 | FR-15, FR-19, SR-06, SR-12 | context-menu-service.ts, content/index.ts | TC-11, TC-13 | ✅ |
| BR-06 | FR-16, SR-11, раздел 7 | content/field-detector.ts | TC-12, TC-13 | ✅ |
| BR-07 | FR-20 — FR-23, SR-13 | content/field-inserter.ts | TC-14 — TC-16 | ✅ |
| BR-08 | FR-24 — FR-27, SR-15, SR-16 | export-import-service.ts | TC-17 — TC-19, TC-22 | ✅ |

## Minor-замечания (не блокируют разработку)

1. **Changelog spec:** добавить запись для v2/v3 с перечнем закрытых критических рисков.
2. **HLD session keys:** явно прописать префикс `accountsHelper.*` в разделе хранилищ.
3. **Запрет простых PIN:** добавить в BRULE или SR явный запрет PIN `0000`, `1234`, `1111` и т.п.

## Рекомендация

Разрешить переход к этапу разработки (Developer). Minor-замечания закрыть на этапе LLD или параллельно с кодированием.

## Следующий шаг

Human gate: подтверждение Product Owner для передачи спецификации Developer.
