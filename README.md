# LinQ backend (под фронтенд feature/frontend)

FastAPI + SQLite. Запуск: `pip install -r requirements.txt && uvicorn main:app --reload`, Swagger: http://localhost:8000/docs
CORS открыт для всех (dev). При первом запуске создаются демо-данные из моков фронтенда: 4 роли, 4 пользователя
(`mikhalyich_ot`, `disp_smena1`, `master_ceh1`, `it_linq_admin`, пароль `linq123` или env `SEED_PASSWORD`), 3 участка и 3 камеры.

## Файлы
- `main.py` — API, права, формат ответов (ключи как в моках фронта: `cameraType`, `rulesVector`, `mapPos`, `zones`, ...).
- `db.py` — весь SQL. Для разработчика БД: заменить реализацию (PostgreSQL), контракт в docstring, `main.py` не менять.

## Права
Просмотр — роли 1,2,3,7. Участки/камеры/правила/зоны/пользователи/настройки — 1 и 7 (`canEditRules`). Реакция на события — 1,2,3.
PTZ (`panAngle`, `zoomLevel`, `autoPatrol`) может менять любой, кто видит камеры.

## API для фронтенда
- `POST /auth/login` → `{token, user}`; далее `Authorization: Bearer <token>`; `GET /me`.
- `GET /cameras`, `POST /cameras` (`site_id` или `site_name`), `PATCH /cameras/{id}` (любые поля: правила, зоны, позиция, PTZ), `DELETE`.
- `GET /events?status=&camera_id=&since_id=` (опрос новых для оповещений), `PATCH /events/{id}/process {status}` (`confirmed|sent_to_master|false_alarm`), `PATCH /events/{id}/comment {description}`.
- `GET /stats` (всего, ожидают, по статусам/типам/участкам, `hourly` по 2 часа), `GET /violation-types`, `GET /roles`, `GET /sites`, `GET/PUT /settings`, `GET/POST/PATCH /users`.
## Для AI-сервиса
`POST /events` с заголовком `X-Api-Key` (env `INGEST_KEY`, по умолчанию `dev-ingest-key`): `{camera_id, violation (RUNNING|...|CARGO_VIOLATION), confidence, ai_pos, frame_b64|frame_url, ai_map_b64|ai_map_url}`.
