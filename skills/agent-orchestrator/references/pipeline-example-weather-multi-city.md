# Пример успешного пайплайна: weather_daily.py multi-city

Этот reference фиксирует реальный прогон пайплайна `agent-orchestrator`, который
был запущен в сессии 2026-07-18/19 для задачи: добавить поддержку нескольких
городов в скрипт `weather_daily.py`.

## Структура артефактов

| Артефакт | Путь | Автор |
|---|---|---|
| BRD / БФТ | `/home/hermes_ai/my_agent/docs/brd/weather-multi-city.md` | business-analyst sub-agent |
| HLD | `/home/hermes_ai/my_agent/docs/hld/weather-multi-city-hld.md` | architect sub-agent |
| Specification / ТЗ | `/home/hermes_ai/my_agent/docs/spec/weather-multi-city-spec.md` | system-analyst sub-agent |
| Quality Gate Review | `/home/hermes_ai/my_agent/docs/review/weather-multi-city-review.md` | quality-gate sub-agent |
| Implementation | `/home/hermes_ai/.hermes/scripts/weather_daily.py` | developer sub-agent |
| Test Report | `/home/hermes_ai/my_agent/docs/test/weather-multi-city-test-report.md` | tester sub-agent |
| Summary | `/home/hermes_ai/my_agent/docs/artifacts/weather-multi-city-artifacts-summary.md` | orchestrator |

## Ключевые уроки

### 1. delegate_task должен быть последовательным

Hermes `max_spawn_depth=1` означает, что sub-agent не может запускать своих
sub-agents. Весь пайплайн chat → analyst → architect → system analyst → quality
gate → developer → tester управляется оркестратором. Каждый шаг — отдельный
вызов `delegate_task`, результат которого передаётся в следующий.

### 2. Контекст нужно передавать явно

Каждый sub-agent получает пути к файлам предыдущих артефактов в поле `context`.
Hermes sub-agents не видят состояние чата, поэтому без явного контекста они
не знают, что делать.

### 3. Quality Gate находит дефекты ДО разработки

Quality Gate нашёл 3 замечания до начала разработки:
- кэш-ключ и языковые формы (`Moscow` vs `Москва`);
- неоднозначность exit-кодов;
- недостаточная валидация пользовательского ввода.

Разработчик закрыл их в реализации, но не все успел документировать в
спецификации. Это нормально для итеративного процесса — фиксируйте в hotfix.

### 4. Тестер находит дефекты ПОСЛЕ разработки

Тестер нашёл 3 дефекта:
- ошибку чтения JSON-массива в конфиге (`name 'item' is not defined`);
- расширенный Telegram-формат относительно ТЗ;
- отсутствие периода «Ночь» для иностранных городов.

Первый дефект был исправлен hotfix'ом. Остальные признаны некритичными.

### 5. Практический шаблон запуска sub-agent'а

```text
delegate_task(
  goal="Act as a <role>. Read <artifact> and produce <output>. Save it to <path>. Return the path and a summary.",
  context="Task: <user request>. Previous artifact: <path>. Constraints: <...>",
  toolsets=["file", "terminal", "code_exec"]
)
```

## Рекомендуемые toolsets по ролям

| Роль | Toolsets |
|---|---|
| business-analyst | `file`, `terminal`, `code_exec` |
| architect | `file`, `terminal`, `code_exec` |
| system-analyst | `file`, `terminal`, `code_exec` |
| quality-gate | `file`, `terminal` |
| developer | `file`, `terminal`, `code_exec` |
| tester | `file`, `terminal`, `code_exec` |

## Формат output-директорий

Рекомендуется складывать артефакты в:
- `<workdir>/docs/brd/`
- `<workdir>/docs/hld/`
- `<workdir>/docs/spec/`
- `<workdir>/docs/review/`
- `<workdir>/docs/test/`
- `<workdir>/docs/artifacts/`

## Статусы вердиктов

- `PASS` — нет замечаний.
- `PASS WITH FINDINGS` — есть замечания, но разработка может начаться.
- `PASS WITH DEFECTS` — основное работает, есть некритичные дефекты.
- `FAIL` — блокирует переход к следующему шагу.

### 6. Human Gate rule

После quality gate оркестратор обязан остановиться и запросить у пользователя
явное подтверждение (`yes`, `approved`, `go`, `давай`) перед запуском Developer.
Если пользователь не апрувит — pipeline останавливается, шаги Developer и Tester
не выполняются. Это защищает от реализации спецификации с незакрытыми
## Когда использовать этот reference

- Перед запуском нового пайплайна — свериться с успешным примером.
- При адаптации новых OpenCode-skills под Hermes.
- При написании сводки артефактов для пользователя.
- При проектировании Human Gate — как пример явного апрува перед разработкой.
