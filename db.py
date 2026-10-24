import os
import psycopg
from psycopg.rows import dict_row


DATABASE_URL = "postgresql://linq_user:linq_password@127.0.0.1:5433/linq_db"

def _get_conn():
    """Создает подключение с фабрикой строк, возвращающей словари (аналог RealDictCursor)"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def _format_row(row):
    """Форматирует строку результата: гарантирует строковый формат времени для main.py"""
    if row is None:
        return None
    d = dict(row)
    # main.py ожидает строки 'YYYY-MM-DD HH:MM:SS' для среза [11:19]
    for k in ['created_at', 'timestamp', 'processed_at']:
        if k in d and d[k] is not None:
            # Если это объект datetime, форматируем его. Если уже строка (из to_char) - оставляем.
            if hasattr(d[k], 'strftime'):
                d[k] = d[k].strftime('%Y-%m-%d %H:%M:%S')
    return d

def _all(sql, args=()):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return [_format_row(r) for r in cur.fetchall()]

def _one(sql, args=()):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return _format_row(cur.fetchone())

def _q(sql, args=()):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            conn.commit()
            res = cur.fetchone()
            return res['id'] if res and 'id' in res else cur.rowcount

def _ins(table, d):
    """Вставка. psycopg v3 САМ преобразует dict/list в jsonb, ручная сериализация не нужна!"""
    keys = list(d.keys())
    vals = list(d.values())
    cols = ", ".join(keys)
    placeholders = ", ".join(["%s"] * len(keys))
    sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING id"
    return _q(sql, vals)

def _upd(table, id_val, d):
    """Обновление. psycopg v3 САМ преобразует dict/list в jsonb."""
    if not d:
        return
    keys = list(d.keys())
    vals = list(d.values())
    set_clause = ", ".join([f"{k} = %s" for k in keys])
    sql = f"UPDATE {table} SET {set_clause} WHERE id = %s"
    _q(sql, vals + [id_val])


# ---- роли / пользователи / сессии ----
_U = """
    SELECT u.id, u.login, u.password_hash, u.role_id, u.full_name, u.is_active,
           to_char(u.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
           r.name AS role_name
    FROM users u JOIN roles r ON r.id = u.role_id
"""

def role_create(rid, name): 
    _q("INSERT INTO roles (id, name) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING", (rid, name))

def roles_list(): 
    return _all("SELECT id, name FROM roles ORDER BY id")

def user_create(d): 
    return _ins("users", d)

def user_update(uid, d): 
    _upd("users", uid, d)

def user_get(uid): 
    return _one(_U + " WHERE u.id = %s", (uid,))

def user_by_login(login): 
    return _one(_U + " WHERE u.login = %s", (login,))

def users_list(): 
    return _all(_U + " ORDER BY u.id")

def session_create(token, uid): 
    _q("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, uid))

def user_by_session(token): 
    sql = _U + " JOIN sessions s ON s.user_id = u.id WHERE s.token = %s AND u.is_active = true"
    return _one(sql, (token,))


# ---- участки ----
_S = "SELECT id, name, rules, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM sites"

def site_create(name, rules, created_at): 
    return _ins("sites", {"name": name, "rules": rules, "created_at": created_at})

def site_update(sid, d): 
    _upd("sites", sid, d)

def site_get(sid): 
    return _one(_S + " WHERE id = %s", (sid,))

def site_by_name(name): 
    return _one(_S + " WHERE name = %s", (name,))

def sites_list(): 
    return _all(_S + " ORDER BY id")


# ---- камеры ----
_C = """
    SELECT c.id, c.code, c.site_id, s.name AS site_name, c.name, c.camera_type,
           c.pan_angle, c.zoom_level, c.auto_patrol, c.rtsp_url, c.is_active,
           c.rules_vector, c.map_pos, c.zones,
           to_char(c.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM cameras c JOIN sites s ON s.id = c.site_id
"""

def camera_create(d): 
    return _ins("cameras", d)

def camera_update(cid, d): 
    _upd("cameras", cid, d)

def camera_delete(cid): 
    _q("DELETE FROM cameras WHERE id = %s", (cid,))

def camera_get(cid): 
    return _one(_C + " WHERE c.id = %s", (cid,))

def cameras_list(): 
    return _all(_C + " ORDER BY c.id")


# ---- события ----
_E = """
    SELECT e.id, e.camera_id, c.code AS camera_code, s.name AS site_name,
           e.violation, e.severity, e.frame_url, e.ai_map_url, e.ai_pos,
           e.status, e.processed_by_id, u.full_name AS processed_by_name,
           to_char(e.processed_at, 'YYYY-MM-DD HH24:MI:SS') AS processed_at,
           e.confidence, e.description,
           to_char(e.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
           to_char(e.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM events e
    JOIN cameras c ON c.id = e.camera_id 
    JOIN sites s ON s.id = c.site_id 
    LEFT JOIN users u ON u.id = e.processed_by_id
"""

def event_create(d): 
    return _ins("events", d)

def event_update(eid, d): 
    _upd("events", eid, d)

def event_get(eid): 
    return _one(_E + " WHERE e.id = %s", (eid,))

def events_list(status=None, camera_id=None, since_id=0, limit=200):
    w, a = ["e.id > %s"], [since_id]
    if status is not None:
        w.append("e.status = %s"); a.append(status)
    if camera_id is not None:
        w.append("e.camera_id = %s"); a.append(camera_id)
    
    sql = _E + " WHERE " + " AND ".join(w) + " ORDER BY e.id DESC LIMIT %s"
    return _all(sql, a + [limit])

def events_for_stats():
    sql = """
        SELECT e.violation, e.status, s.name AS site_name,
               to_char(e.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
        FROM events e
        JOIN cameras c ON c.id = e.camera_id 
        JOIN sites s ON s.id = c.site_id
    """
    return _all(sql)


# ---- настройки ----
def settings_get(): 
    # psycopg v3 автоматически возвращает jsonb как Python dict/list!
    rows = _all("SELECT key, value FROM settings")
    return {r["key"]: r["value"] for r in rows}

def settings_set(d):
    for k, v in d.items():
        sql = """
            INSERT INTO settings (key, value) VALUES (%s, %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """
        _q(sql, (k, v)) # psycopg v3 сам превратит dict/list в jsonb