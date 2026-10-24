# Задание для разработчика БД (PostgreSQL)

Основа: фронтенд `feature/frontend` (`App.jsx`, вкладка «Инспектор СУБД» и моки). Сейчас в `db.py` временная реализация на SQLite — нужно заменить её на PostgreSQL. `main.py` менять не нужно: все функции `db.*` и формат их результатов описаны в docstring `db.py`.

## 1. Что сделать
1. Создать схему ниже (миграции, например Alembic, или один `schema.sql`).
2. Переписать функции в `db.py` под PostgreSQL (psycopg / SQLAlchemy), сохранив имена и формат результатов.
3. Строка подключения из переменной окружения `DATABASE_URL`.
4. Сидирование демо-данных уже делает `main.py` при пустой БД (`seed()` по пустой таблице `roles`) — оно должно работать на новой БД.
5. Проверка: поднять API, пройти сценарий вход → камера → событие → обработка → `/stats`.

## 2. Схема

```sql
CREATE TYPE violation_type AS ENUM ('RUNNING','DANGER_PROXIMITY','PHONE_USAGE','SMOKING_FIRE',
  'FENCE_CLIMBING','NO_HARNESS_HEIGHT','PERSON_FALL','CARGO_VIOLATION');
CREATE TYPE event_status   AS ENUM ('new','sent_to_master','confirmed','false_alarm');
CREATE TYPE severity_type  AS ENUM ('critical','warning');
CREATE TYPE camera_kind    AS ENUM ('static','dynamic');   -- dynamic = PTZ

CREATE TABLE roles (id int PRIMARY KEY, name varchar UNIQUE NOT NULL);   -- 1,2,3,7 (id задаём вручную)

CREATE TABLE users (
  id serial PRIMARY KEY,
  login varchar UNIQUE NOT NULL,
  password_hash text NOT NULL,      -- сейчас PBKDF2 в формате 'salt$hash' (по ERD — bcrypt; меняется в pw_hash/pw_check в main.py)
  role_id int NOT NULL REFERENCES roles(id),
  full_name varchar NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (token text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now());     -- желательно добавить срок жизни (expires_at) и чистку

CREATE TABLE sites (                          -- участок / цех
  id serial PRIMARY KEY,
  name varchar UNIQUE NOT NULL,
  rules jsonb,                                -- правила участка (формат свободный)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cameras (
  id serial PRIMARY KEY,
  code varchar,                               -- 'CAM-01', генерируется после вставки по id
  site_id int NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  camera_type camera_kind NOT NULL DEFAULT 'dynamic',
  pan_angle real NOT NULL DEFAULT 0,          -- -45..45
  zoom_level real NOT NULL DEFAULT 1,         -- 1..1.6
  auto_patrol boolean NOT NULL DEFAULT false,
  rtsp_url varchar,
  is_active boolean NOT NULL DEFAULT true,
  rules_vector jsonb NOT NULL,                -- массив из 8 чисел 0/1 по типам нарушений, напр. [0,1,1,0,1,0,1,0]
  map_pos jsonb,                              -- {x,y} в % на карте цеха
  zones jsonb NOT NULL DEFAULT '[]',          -- опасные/внимание/слепые зоны (см. ниже)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id serial PRIMARY KEY,
  camera_id int NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  violation violation_type NOT NULL,
  severity severity_type NOT NULL DEFAULT 'warning',   -- critical для PERSON_FALL
  frame_url text, ai_map_url text,
  ai_pos jsonb,                                         -- {x,y} в % на карте
  status event_status NOT NULL DEFAULT 'new',
  processed_by_id int REFERENCES users(id),
  processed_at timestamptz,
  confidence real,                                      -- 0..1
  description text,                                     -- комментарий оператора
  timestamp timestamptz NOT NULL DEFAULT now(),         -- время нарушения (по ERD); created_at — время записи в БД
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_events_cam_id ON events(camera_id, id DESC);
CREATE INDEX ix_events_status ON events(status, id DESC);
CREATE INDEX ix_events_ts ON events(timestamp);   -- для почасовой статистики

CREATE TABLE settings (key varchar PRIMARY KEY, value jsonb NOT NULL);
-- ключи: sirenEnabled, skudLockEnabled, enhanceFilter, stabilizeZonesOnPTZ (boolean)
```

Формат `cameras.zones` (jsonb-массив):
- прямоугольник: `{"id":"z-1","type":"danger|attention|blind","shape":"rect","label":"...","rect":{"x":54,"y":34,"w":36,"h":48}}`
- полигон: `{"id":"z-2","type":"...","shape":"polygon","label":"...","points":[[x,y],...]}`

## 3. Нюансы для реализации `db.py`
- Идентификаторы колонок приходят из белого списка в `main.py`, значения — только параметрами (никакой конкатенации).
- JSON-колонки (`rules`, `rules_vector`, `map_pos`, `zones`, `ai_pos`) в `db.py` принимаются/возвращаются как Python-объекты. В PG это `jsonb`, ручной `json.dumps` не нужен.
- Время: `created_at` / `timestamp` / `processed_at` `main.py` ожидает строкой `'YYYY-MM-DD HH:MM:SS'` (берёт `[11:19]` и `[11:13]` для часа по `timestamp`). В PG возвращайте строку в таком формате (`to_char`) в локальном времени сервера.
- Булевы поля — `bool` (или 0/1, `main.py` приводит).
- `camera_by_*`/`camera_get`/`cameras_list` возвращают также `site_name` (JOIN `sites`); `event_get`/`events_list` — `camera_code`, `site_name`, `processed_by_name` (= `users.full_name`, LEFT JOIN); `user_*` — `role_name` (JOIN `roles`).
- `events_list(status, camera_id, since_id, limit)`: фильтр `id > since_id`, сортировка `id DESC`. Используется и для опроса новых событий (оповещения на фронте).
- `events_for_stats()` — только `violation, status, site_name, timestamp`. При большом объёме лучше заменить агрегацию на SQL (`GROUP BY`) — тогда согласуйте с бэкендом изменение `/stats`.
- Каскады: удаление участка удаляет его камеры, удаление камеры — её события.
- `user_by_session` возвращает пользователя только если `is_active = true`.
- `settings_set` — upsert по `key`.

## 3a. Расхождения с ERD (roles, users, sites, cameras, events)
Таблицы и связи совпадают с ERD. Сверх ERD фронтенду нужно (без этого интерфейс не сохранит данные):
- `cameras`: `code, camera_type, pan_angle, zoom_level, auto_patrol, rules_vector, map_pos, zones` — правила 8 нарушений, PTZ, позиция на карте и зоны (вкладка «Карта и правила»).
- `events`: `ai_pos` (точка нарушения на карте), `severity` (critical для падения человека).
- Новые таблицы `sessions` (токены входа) и `settings` (переключатели цеха: сирена, СКУД, фильтры).
- `events.status` в ERD varchar, в схеме выше enum из 4 значений (`new, sent_to_master, confirmed, false_alarm`); можно оставить varchar с CHECK.
- `confidence` — `decimal` по ERD; `real` подойдёт, но `main.py` отдаёт число (float).

## 4. Вопросы к фронтенду/заказчику
- Нужен ли архив событий (хранение/очистка по сроку)? Сейчас события хранятся бессрочно.
- Нужна ли история действий над событием (кто и когда менял статус)? Сейчас хранится только последний обработчик (`processed_by_id`, `processed_at`).
- Роли 4–6 в схеме не описаны; в `roles` пока 4 записи (1, 2, 3, 7).
- Нужны ли отдельные таблицы для зон и правил вместо `jsonb`? Фронтенд работает с ними как с вложенными объектами камеры, поэтому в схеме выше они в `jsonb`.
