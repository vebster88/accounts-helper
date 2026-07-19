# MoM: Интеграция remindb в пайплайн Hermes

- **Date:** 2026-07-20
- **Participants:** Yuriy (user), Hermes Agent
- **Recording:** —

## Discussed

- Проблема: ранее контекст проектов терялся между сессиями или дублировался в `~/.hermes/memories/`.
- Решение: использовать `remindb` как primary memory provider.
- Согласовали формат `MemoryWrite`: краткие Russian summaries (250–500 tokens), source files как canonical source.

## Decisions

- Все pipeline-артефакты сохранять в `AI-harness/projects/<project>/` + commit/push.
- Для фактов и контекста сначала `MemorySearch`, потом файлы/терминал.
- При создании задач с датой/временем — всегда делать cron-напоминание и Notion-задачу.

## Action Items

| # | Task | Owner | Deadline | Status |
|---|------|-------|----------|--------|
| 1 | Проверить, что все новые skills синхронизированы в AI-harness | Hermes | 2026-07-20 | done |
| 2 | Обновить agent-orchestrator с учётом context gathering | Hermes | 2026-07-20 | done |

## Notes

- MoM generated via docgen skill as a test.
