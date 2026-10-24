"""Слой БД — единственное место с SQL. Сейчас временно на SQLite; разработчик БД заменяет реализацию (PostgreSQL),
main.py не меняется. Функции принимают/возвращают dict/list/None; JSON-колонки (_JSON) — уже Python-объекты.
Схема (см. SCHEMA): roles, users, sessions, sites, cameras, events, settings.
Ключи dict в *_create/*_update приходят только из белых списков в main.py (в SQL подставляются как имена колонок).
"""
import json, sqlite3

_JSON = {"rules", "rules_vector", "map_pos", "zones", "ai_pos", "value"}
_db = sqlite3.connect("app.db", check_same_thread=False)
_db.row_factory = sqlite3.Row
_db.execute("PRAGMA foreign_keys=ON")
_db.executescript("""
CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, login TEXT UNIQUE, password_hash TEXT,
  role_id INT REFERENCES roles(id), full_name TEXT, is_active INT DEFAULT 1, created_at TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS sites(id INTEGER PRIMARY KEY, name TEXT UNIQUE, rules TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS cameras(id INTEGER PRIMARY KEY, code TEXT, site_id INT REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT, camera_type TEXT, pan_angle REAL DEFAULT 0, zoom_level REAL DEFAULT 1, auto_patrol INT DEFAULT 0,
  rtsp_url TEXT, is_active INT DEFAULT 1, rules_vector TEXT, map_pos TEXT, zones TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, camera_id INT REFERENCES cameras(id) ON DELETE CASCADE,
  violation TEXT, severity TEXT, frame_url TEXT, ai_map_url TEXT, ai_pos TEXT, status TEXT DEFAULT 'new',
  processed_by_id INT REFERENCES users(id), processed_at TEXT, confidence REAL, description TEXT, timestamp TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS ix_events_cam ON events(camera_id);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
""")


def _q(sql, args=()):
    cur = _db.execute(sql, args)
    _db.commit()
    return cur


def _row(r):
    if r is None:
        return None
    d = dict(r)
    for k in _JSON & d.keys():
        if d[k] is not None:
            d[k] = json.loads(d[k])
    return d


def _all(sql, args=()): return [_row(r) for r in _q(sql, args).fetchall()]
def _one(sql, args=()): return _row(_q(sql, args).fetchone())
def _enc(k, v): return json.dumps(v) if k in _JSON else v


def _ins(t, d):
    return _q(f"INSERT INTO {t}({','.join(d)}) VALUES({','.join('?' * len(d))})", [_enc(k, v) for k, v in d.items()]).lastrowid


def _upd(t, i, d):
    if d:
        _q(f"UPDATE {t} SET {','.join(k + '=?' for k in d)} WHERE id=?", [_enc(k, v) for k, v in d.items()] + [i])


# ---- роли / пользователи / сессии ----
_U = "SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id=u.role_id"
def role_create(rid, name): _q("INSERT OR IGNORE INTO roles VALUES(?,?)", (rid, name))
def roles_list(): return _all("SELECT * FROM roles ORDER BY id")
def user_create(d): return _ins("users", d)        # login, password_hash, role_id, full_name, is_active, created_at
def user_update(uid, d): _upd("users", uid, d)
def user_get(uid): return _one(_U + " WHERE u.id=?", (uid,))
def user_by_login(login): return _one(_U + " WHERE u.login=?", (login,))
def users_list(): return _all(_U + " ORDER BY u.id")
def session_create(token, uid): _q("INSERT INTO sessions VALUES(?,?)", (token, uid))
def user_by_session(token): return _one(_U + " JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND u.is_active=1", (token,))


# ---- участки ----
def site_create(name, rules, created_at): return _ins("sites", {"name": name, "rules": rules, "created_at": created_at})
def site_update(sid, d): _upd("sites", sid, d)      # name, rules
def site_get(sid): return _one("SELECT * FROM sites WHERE id=?", (sid,))
def site_by_name(name): return _one("SELECT * FROM sites WHERE name=?", (name,))
def sites_list(): return _all("SELECT * FROM sites ORDER BY id")


# ---- камеры (в ответе есть site_name) ----
_C = "SELECT c.*, s.name AS site_name FROM cameras c JOIN sites s ON s.id=c.site_id"
def camera_create(d): return _ins("cameras", d)
def camera_update(cid, d): _upd("cameras", cid, d)
def camera_delete(cid): _q("DELETE FROM cameras WHERE id=?", (cid,))   # события удаляются каскадом
def camera_get(cid): return _one(_C + " WHERE c.id=?", (cid,))
def cameras_list(): return _all(_C + " ORDER BY c.id")


# ---- события (в ответе есть camera_code, site_name, processed_by_name) ----
_E = ("SELECT e.*, c.code AS camera_code, s.name AS site_name, u.full_name AS processed_by_name FROM events e "
      "JOIN cameras c ON c.id=e.camera_id JOIN sites s ON s.id=c.site_id LEFT JOIN users u ON u.id=e.processed_by_id")
def event_create(d): return _ins("events", d)
def event_update(eid, d): _upd("events", eid, d)
def event_get(eid): return _one(_E + " WHERE e.id=?", (eid,))


def events_list(status=None, camera_id=None, since_id=0, limit=200):  # новые первыми
    w, a = ["e.id>?"], [since_id]
    for col, v in (("e.status", status), ("e.camera_id", camera_id)):
        if v is not None:
            w.append(col + "=?"); a.append(v)
    return _all(_E + " WHERE " + " AND ".join(w) + " ORDER BY e.id DESC LIMIT ?", a + [limit])


def events_for_stats():  # [{violation, status, site_name, timestamp}]
    return _all("SELECT e.violation,e.status,s.name AS site_name,e.timestamp FROM events e "
                "JOIN cameras c ON c.id=e.camera_id JOIN sites s ON s.id=c.site_id")


# ---- настройки (sirenEnabled, skudLockEnabled, ...) ----
def settings_get(): return {r["key"]: json.loads(r["value"]) for r in _q("SELECT * FROM settings").fetchall()}
def settings_set(d):
    for k, v in d.items():
        _q("INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, json.dumps(v)))
