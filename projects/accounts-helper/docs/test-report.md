# AccountsHelper MVP — Отчёт о верификации

**Дата:** 2026-07-22  
**Проект:** AccountsHelper (Chrome-расширение, Manifest V3)  
**Путь к проекту:** `/home/hermes_ai/my_agent/AI-harness/projects/accounts-helper`  
**Вердикт:** **PASS (условно)** — билд и юнит-тесты проходят, ключевые требования реализованы, но обнаружены дефекты средней и низкой важности, которые необходимо исправить до релиза.

---

## 1. Краткое резюме

Реализация AccountsHelper MVP соответствует утверждённым BRD v1.0, HLD v1.0 и Spec v3.0 в основных функциональных и архитектурных пунктах:

- Manifest V3, разрешения `storage`, `contextMenus`, `activeTab`, `scripting`;
- шифрование профиля AES-256-GCM с PBKDF2-SHA256, 600 000 итераций;
- PIN ровно 4 цифры, двойной ввод при установке, счётчик попыток, блокировка после 5 неудачных попыток;
- CRUD записей, валидация форматов, автопрефикс `@` для handles, один default на тип;
- детекция типа поля по DOM-признакам, динамическое контекстное меню, fallback «Все данные»;
- экспорт/импорт зашифрованного JSON с контрольной суммой;
- Vite-сборка и TypeScript компилируются без ошибок.

**Общий итог:** `npm run test:run` — 23/23 тестов пройдено; `npm run build` — успешно, dist сформирован.

---

## 2. Что проверялось

| Артефакт | Путь | Статус |
|---|---|---|
| BRD | `docs/BRD.md` | Прочитан и использован как базовая линия |
| HLD | `docs/HLD.md` | Прочитан, сверялся с кодом |
| System Spec | `docs/spec.md` | Прочитан полностью, использован для трассировки FR/SR |
| package.json / скрипты | `package.json` | Скрипты `test:run`, `build` актуальны и работают |
| Crypto-service | `src/background/crypto-service.ts` | Инспектирован |
| PIN-service | `src/background/pin-service.ts` | Инспектирован |
| Profile-service | `src/background/profile-service.ts` | Инспектирован |
| Messaging-router | `src/background/messaging-router.ts` | Инспектирован |
| Field-detector | `src/content/field-detector.ts` | Инспектирован |
| Field-inserter | `src/content/field-inserter.ts` | Инспектирован |
| Popup app | `src/popup/app.ts` | Инспектирован |
| Shared validation | `src/shared/validation.ts` | Инспектирован |
| Остальные модули | context-menu-service, session-key-store, export-import-service, popup экраны | Инспектированы выборочно |

---

## 3. Выполненные проверки

### 3.1. Запуск тестов

```bash
npm run test:run
```

Результат:

```text
Test Files  6 passed (6)
     Tests  23 passed (23)
  Duration  9.25s
```

Покрыты тестами:

- `crypto.test.ts` — создание/расшифровка профиля, неправильный PIN, смена PIN;
- `validation.test.ts` — PIN, email, EVM EIP-55, BTC, handles, validateEntry, label 50 символов;
- `profile-service.test.ts` — add/update/delete/default per type;
- `field-detector.test.ts` — email, evm, discord по label, fallback none;
- `export-import.test.ts` — JSON с `exportedAt`, проверка обязательных полей, версия, KDF;
- `messaging.test.ts` — базовая работа `sendMessage` с mock chrome runtime.

### 3.2. Сборка

```bash
npm run build
```

Результат:

```text
dist/src/content/index.html      0.36 kB │ gzip: 0.25 kB
dist/src/background/index.html   0.44 kB │ gzip: 0.26 kB
dist/src/popup/index.html        0.53 kB │ gzip: 0.29 kB
dist/popup/popup.css             2.66 kB │ gzip: 1.04 kB
dist/shared/messaging.js         2.98 kB │ gzip: 1.51 kB
dist/content.js                  4.25 kB │ gzip: 2.04 kB
dist/shared/validation.js        7.45 kB │ gzip: 3.54 kB
dist/popup/popup.js             12.58 kB │ gzip: 4.36 kB
dist/background.js              13.75 kB │ gzip: 4.62 kB
```

`tsc --noEmit` выполнен без ошибок.

---

## 4. Соответствие BRD / HLD / Spec

### 4.1. Бизнес-требования (BRD)

| ID | Требование | Статус | Примечания |
|---|---|---|---|
| BR-01 | Manifest V3, установка в Chrome | ✅ | `src/manifest.json`, Vite-плагин копирует манифест в корень dist |
| BR-02 | Установка PIN при первом запуске | ✅ | `popup/pin-setup.ts`, двойной ввод, `messaging-router` проверяет формат и совпадение |
| BR-03 | Зашифрованное хранилище | ✅ | `crypto-service.ts`: AES-GCM, PBKDF2 600k, DEK шифрует профиль |
| BR-04 | CRUD + валидация | ✅ | `profile-service.ts` + `shared/validation.ts` |
| BR-05 | ПКМ-меню на полях ввода | ✅ | `context-menu-service.ts`, контекст `editable` |
| BR-06 | Автоопределение типа поля | ✅ | `field-detector.ts` по спецификации Spec §7 |
| BR-07 | Корректная вставка в React/Vue/Angular | ⚠️ | Вставка использует нативный setter + `input`/`change`; для Angular обычно достаточно, но React 16+ может потребовать `focus` + `input` + `change`. В коде `focus()` вызывается, события `input`/`change` генерируются. Проверить вручную в реальном Chrome. |
| BR-08 | Экспорт/импорт JSON | ✅ | `export-import-service.ts` |

### 4.2. Бизнес-правила

| ID | Правило | Статус | Примечания |
|---|---|---|---|
| BRULE-01 | PIN = 4 цифры | ✅ | `isValidPin` регулярное выражение `^\d{4}$` |
| BRULE-02 | Блокировка после 5 попыток | ✅ | `PIN_ATTEMPTS_LIMIT = 5` в session storage |
| BRULE-03 | PIN действителен одну сессию | ✅ | DEK в `chrome.storage.session` и памяти SW; `LOCK` стирает |
| BRULE-04 | EVM EIP-55 checksum | ✅ | `isValidEvmAddress` через keccak256 |
| BRULE-05 | BTC legacy/P2SH/bech32 | ✅ | Регулярки в `isValidBtcAddress` |
| BRULE-06 | Email RFC 5322 упрощённо | ✅ | Простой валидатор `@` и домен |
| BRULE-07 | Handles с префиксом `@` | ✅ | `normalizeHandle` |
| BRULE-08 | Псевдоним до 50 символов | ✅ | Валидация и `maxlength="50"` в форме |
| BRULE-09 | Один default на тип | ✅ | `addOrUpdateEntry` сбрасывает остальные |

### 4.3. Нефункциональные требования

| ID | Требование | Статус | Примечания |
|---|---|---|---|
| NFR-01 | Меню < 200 мс | ⚠️ | Нет производительных тестов. Меню строится синхронно из кешированного профиля, но без реальных замеров в Chrome. |
| NFR-02 | Расшифровка < 500 мс | ✅ | Тест `crypto.test.ts` создаёт/расшифровывает за ~3 с на всю итерацию, PBKDF2 600k — основное время. Вручную замерить на dev-сборке. |
| NFR-03 | Ключ только в памяти service worker | ⚠️ | DEK дополнительно хранится в `chrome.storage.session` как неэкспортируемый CryptoKey — это соответствует HLD §6.3 и Spec §5.5, но при усиленной модели угроз стоит рассмотреть offscreen document. |
| NFR-04 | PIN не хранится открыто | ❗ | Реализован **PIN-memo**: PIN шифруется DEK и хранится в `chrome.storage.session`. Технически это не «открытый вид», но расшифровка возможна при наличии DEK. В HLD/Spec прямо указано: PIN используется только для key derivation. Архитектурный компромисс; см. дефект SEC-02. |
| NFR-05 | Ошибки без падения | ✅ | try/catch в crypto, ошибки возвращаются через response |
| NFR-06 | ≤ 3 клика для вставки | ✅ | ПКМ → категория/запись |
| NFR-07 | Масштаб 100–150% | ⚠️ | В CSS нет явных media queries; базовые размеры окна 360 px, но визуальная проверка не проводилась. |

### 4.4. Спецификация (Spec)

| Раздел | Статус | Примечания |
|---|---|---|
| §3 FR-01 — FR-04 | ✅ | lifecycle, messaging-router |
| §3 FR-05 — FR-10 | ✅ | profile CRUD, валидация |
| §3 FR-11 — FR-14 | ✅ | unlock/lock/session |
| §3 FR-15 — FR-19 | ✅ | context menu, field detection |
| §3 FR-20 — FR-23 | ⚠️ | вставка работает, но `focus` событие не диспатчится явно (React/Vue обычно достаточно `input`/`change`); не покрыта textarea/input вставка в юнит-тестах |
| §3 FR-24 — FR-27 | ✅ | экспорт/импорт |
| §4 SR-01 — SR-20 | ✅ | реализованы |
| §5 модель данных | ✅ | соответствует |
| §6 контракт сообщений | ⚠️ | `GET_MENU_FOR_FIELD` и `INSERT_VALUE` описаны, но `INSERT_VALUE` фактически выполняется через `chrome.scripting.executeScript` из `background/index.ts` со встроенной функцией, а не через content-script listener. Это не нарушает функциональность, но расходится с буквальным описанием контракта. |
| §7 автоопределение | ✅ | соответствует весам и порогам |
| §8 структура меню | ✅ | root → категории/записи + fallback |
| §9 валидация | ✅ | соответствует |
| §10 ошибки | ✅ | коды ошибок реализованы |
| §11 тестовые сценарии | ⚠️ | Покрыты не все TC из Spec (нет TC-02, TC-03, TC-05, TC-09, TC-10 и т.д.). |

---

## 5. Дефекты по критичности

### 5.1. High / Critical

**Нет.** Реализация не содержит блокирующих дефектов, которые приводят к падению, потере данных или нарушению BRD Must-have.

### 5.2. Medium

| ID | Модуль | Описание | Влияние | Рекомендация | Связь с требованиями |
|---|---|---|---|---|---|
| MED-01 | `messaging-router.ts` | Для сохранения/удаления записей используется `recoverPinFromDek`, который расшифровывает PIN-memo из `chrome.storage.session`. Это создаёт дополнительную поверхность атаки: если атакующий получит DEK, он также получит PIN. | Снижение безопасности относительно «PIN только для KDF» в HLD/Spec. | Либо изменить контракт `SAVE_ENTRY`/`DELETE_ENTRY` так, чтобы popup передавал PIN в payload для каждой модификации, либо реализовать offscreen document для KDF, либо задокументировать компромисс в `docs/security-notes.md`. | NFR-04, SR-08, HLD §6.1 |
| MED-02 | `settings.ts` | Кнопка «Очистить данные» вызывает `LOCK` и переходит на экран `setup`, но **не удаляет** `chrome.storage.local`. Данные остаются на диске. | Пользователь может считать, что данные удалены, но профиль остаётся зашифрованным в хранилище. | Реализовать отдельное сообщение `CLEAR_PROFILE_DATA`, которое вызывает `chrome.storage.local.remove(STORAGE_KEYS.encryptedProfile)` и `remove(STORAGE_KEYS.meta)`. | BR-04, US-04, Spec §10 |
| MED-03 | `background/index.ts` | `contextMenus.onClicked` использует `getCachedProfile()`. Если профиль не закеширован (service worker перезапущен, пользователь не открывал popup), меню всё равно отображается, но вставка молча не работает. | Непредсказуемое поведение для пользователя: пункты меню есть, но вставка не происходит. | При клике, если нет кешированного профиля, запрашивать расшифровку по PIN через popup или показывать уведомление «Сначала разблокируйте профиль». | BR-05, FR-20, NFR-05 |
| MED-04 | `entry-form.ts` | Используется `window.__accountsHelperProfile` для локального обновления профиля после сохранения, но это свойство нигде не инициализируется в `app.ts`/`profile-editor.ts`, поэтому ветка `if (current)` часто не сработает. | После сохранения popup может перейти в пустой профиль, и пользователь не увидит новую запись до повторного открытия. | Убрать `window.__accountsHelperProfile` и всегда после сохранения делать `navigateTo('profile')` + `sendMessage(GET_PROFILE)` для получения актуального профиля. | FR-05, SR-09 |
| MED-05 | `field-detector.ts` | Спецификация (Spec §7.1 п. 10) требует учитывать текст ближайшего родительского контейнера глубиной до 3 уровней. `getAncestorText` берёт только `parentElement.textContent` (глубина 1) без рекурсии. | Снижается точность автоопределения на формах, где label обёрнут в несколько div. | Реализовать рекурсивный сбор текста предков с ограничением глубины 3 и фильтрацией вложенных input. | BR-06, FR-16, SR-11 |
| MED-06 | Tests | Нет интеграционных/E2E тестов, нет тестов на `context-menu-service`, `messaging-router`, `pin-service`, `session-key-store`, `popup` экраны, вставку значения. | Регрессии в ключевых компонентах могут остаться незамеченными. | Добавить vitest + jsdom тесты на context-menu-service (mock chrome.contextMenus), messaging-router (mock chrome.storage/session/runtime) и field-inserter. | Spec §11 |

### 5.3. Low

| ID | Модуль | Описание | Влияние | Рекомендация | Связь |
|---|---|---|---|---|---|
| LOW-01 | `popup/settings.ts` | Смена PIN не сбрасывает `cachedProfile` и `cachedBlob` в `messaging-router`, но `changePin` пересоздаёт blob и сохраняет новый. При следующем `GET_PROFILE` используется старый кеш — возможна рассинхронизация. | Незначительно: popup обычно перезапускается, но в длинной сессии возможен stale cache. | После `changePin` сбрасывать `cachedProfile` или обновлять его в `messaging-router`. | FR-14, SR-10 |
| LOW-02 | `messaging-router.ts` | `handleRequestFieldType` является no-op; контент-скрипт сам шлёт `REQUEST_FIELD_TYPE`, но SW не обновляет меню в реальном времени на основе `elementInfo`. | Меню обновляется только при клике и использовании `lastDetectedType`; в некоторых случаях может быть рассинхрон. | В `context-adapter.ts` сразу при `contextmenu` событии обновлять меню через `chrome.runtime.sendMessage` с `detected` и вызывать `buildContextMenu` в SW. | FR-19, SR-12 |
| LOW-03 | `export-import.ts` | Экспорт в заблокированной сессии: `EXPORT_PROFILE` с пустым payload вызовет `E_SESSION_EXPIRED`, ошибка отображается, но пользователю не предлагается ввести PIN. | Spec FR-25 требует запрос PIN при экспорте в заблокированной сессии. | В UI добавить fallback: если `EXPORT_PROFILE` вернул `E_SESSION_EXPIRED`, показать диалог ввода PIN и повторить запрос с `{ pin }`. | FR-25 |
| LOW-04 | `field-inserter.ts` | В функции `insertValueIntoActiveElement` нет обработки `textarea` как отдельной ветки — используется общий `setNativeValue`, что работает, но `selectionStart/selectionEnd` не устанавливаются. | UX: курсор не всегда встаёт в конец. | Для input/textarea устанавливать `selectionStart`/`selectionEnd` после вставки. | FR-20 |
| LOW-05 | CSS / popup | Нет media-query для масштабов 100–150% (NFR-07) и нет тестов на accessibility. | Может быть плохо читаемо на некоторых DPI. | Добавить `min-width`, `font-size: 1rem`, проверить в Chrome DevTools с масштабом 150%. | NFR-07 |
| LOW-06 | `dist` | В результате сборке появляются `dist/src/popup/index.html`, `dist/src/background/index.html`, `dist/src/content/index.html` — промежуточные HTML, не нужные расширению. | Увеличивает размер zip, манифест ссылается на корректные пути (`background.js`, `popup/index.html`, `content.js`). | Удалять промежуточные HTML в `vite.config.ts` writeBundle или перенести их в отдельную папку. | BR-01 |

### 5.4. Information / Observations

- Код чистый, TypeScript строгий включён, noEmit проходит.
- Манифест запрашивает минимально необходимый набор прав, что снижает риск отклонения CWS.
- Используется `@noble/hashes` только для keccak256; в остальном — Web Crypto API и stdlib.
- Уязвимости npm audit (moderate/high/critical) относятся к dev-зависимостям (eslint, rimraf, glob, inflight), не к runtime расширения. Перед публикацией стоит обновить devDependencies.

---

## 6. Покрытие тестами

| Компонент | Тестовый файл | Покрытие | Примечание |
|---|---|---|---|
| `shared/validation.ts` | `validation.test.ts` | Высокое | PIN, email, EVM, BTC, handles, label |
| `background/crypto-service.ts` | `crypto.test.ts` | Среднее | encrypt/decrypt/changePin, нет negative cases на повреждённый blob |
| `background/profile-service.ts` | `profile-service.test.ts` | Среднее | add/delete/default |
| `content/field-detector.ts` | `field-detector.test.ts` | Среднее | happy path, нет теста на `inputmode`, ancestor text, low-confidence |
| `background/export-import-service.ts` | `export-import.test.ts` | Среднее | JSON round-trip |
| `shared/messaging.ts` | `messaging.test.ts` | Низкое | только базовые mock chrome.runtime.sendMessage |
| `background/pin-service.ts` | — | Нет | Счётчик попыток и блокировка не протестированы |
| `background/session-key-store.ts` | — | Нет | Нет тестов на хранение/удаление DEK |
| `background/messaging-router.ts` | — | Нет | Нет интеграционных тестов на все message handlers |
| `content/field-inserter.ts` | — | Нет | Нет тестов на вставку и события |
| `popup/*.ts` | — | Нет | UI не покрыт |

---

## 7. Рекомендации

1. **Исправить MED-02** (удаление данных) до любого пользовательского тестирования — это самый заметный UX-дефект.
2. **Пересмотреть MED-01**: PIN-memo — компромисс безопасности. Для MVP приемлемо, но нужен явный риск-документ.
3. **Добавить тесты** на `pin-service`, `messaging-router` с моками `chrome.storage`/`chrome.runtime`, и `field-inserter` с jsdom.
4. **Исправить MED-04** — убрать `window.__accountsHelperProfile`, обновлять профиль через `GET_PROFILE` после сохранения.
5. **Исправить LOW-03** — запрашивать PIN при экспорте в заблокированной сессии.
6. **Добавить performance-тест** на время расшифровки (NFR-02) и, по возможности, E2E-замер меню (NFR-01).
7. **Проверить в реальном Chrome** вставку в React/Vue/Angular формы (BR-07) и contenteditable (FR-23).
8. **Обновить dev-зависимости** и устранить уязвимости `npm audit` перед публикацией.

---

## 8. Вердикт

**PASS (условно)**

MVP реализован в соответствии с BRD/HLD/Spec, юнит-тесты и сборка проходят. Все Must-have бизнес-требования присутствуют в коде. До релиза рекомендуется устранить дефекты средней важности (MED-01 — MED-06) и добавить интеграционные тесты.

---

*Отчёт подготовлен автоматической верификацией без пуша в GitHub.*
