"""
Database module for Task Journal Web Application.
Supports both SQLite for local development and PostgreSQL/Supabase for deployment.
"""

import os
import sqlite3
from datetime import date, datetime, timedelta

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:  # pragma: no cover - optional dependency for cloud usage
    psycopg2 = None
    RealDictCursor = None

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'task_journal.db')
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SUPABASE_DB_URL')

DEFAULT_MEMBERS = [
    ("Robel", "9826"),
    ("Abebech", "9790"),
    ("Habesha", "9783"),
    ("Miki", "9771"),
    ("Henok", "9772"),
    ("Solomon", "9773"),
    ("Fanuel", "9827"),
    ("Tesfaye", "9784"),
    ("Etsubdink", "9787"),
    ("Abel", "9788"),
    ("Endris", "9789"),
    ("Temesgen", "9791"),
    ("Biruk/nardos", "9806"),
    ("Yemiserach", "9807"),
    ("Tekle", "9808"),
    ("Eyerusalem", "9810"),
    ("Ribka", "9813"),
    ("Alemu", "9814"),
    ("Dejen", "9816"),
    ("Yeabsira/Getnet.G", "9817"),
    ("Getnet.W", "9818"),
    ("Habtam", "9819"),
    ("Selam", "9828"),
]


def get_db_backend():
    if DATABASE_URL:
        return 'postgres'
    return 'sqlite'


def _normalize_sql(sql):
    if get_db_backend() == 'postgres':
        return sql.replace('?', '%s')
    return sql


def _get_cursor(conn):
    if get_db_backend() == 'postgres':
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()


def get_connection():
    if get_db_backend() == 'postgres':
        if psycopg2 is None:
            raise RuntimeError('psycopg2 is required when DATABASE_URL is configured.')
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        return conn

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = _get_cursor(conn)

    if get_db_backend() == 'postgres':
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                mp_number TEXT NOT NULL,
                active INTEGER DEFAULT 1
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                member_id INTEGER NOT NULL REFERENCES members(id),
                date DATE NOT NULL,
                project_code TEXT,
                task_type TEXT,
                description TEXT,
                hours REAL,
                is_special TEXT DEFAULT 'Work',
                period_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                mp_number TEXT NOT NULL,
                active INTEGER DEFAULT 1
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                project_code TEXT,
                task_type TEXT,
                description TEXT,
                hours REAL,
                is_special TEXT DEFAULT 'Work',
                period_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (member_id) REFERENCES members(id)
            )
        ''')

    cursor.execute('SELECT COUNT(*) as count FROM members')
    count = cursor.fetchone()['count']
    if count == 0:
        if get_db_backend() == 'postgres':
            cursor.executemany(
                'INSERT INTO members (name, mp_number) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING',
                DEFAULT_MEMBERS
            )
        else:
            cursor.executemany(
                'INSERT OR IGNORE INTO members (name, mp_number) VALUES (?, ?)',
                DEFAULT_MEMBERS
            )

    conn.commit()
    conn.close()


def get_members():
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute(_normalize_sql('SELECT * FROM members WHERE active = 1 ORDER BY name ASC'))
    members = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return members


def get_member(member_id):
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute(_normalize_sql('SELECT * FROM members WHERE id = ?'), (member_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_next_mp_number():
    """Finds the next available 4-digit MP number."""
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute('SELECT mp_number FROM members')
    rows = cursor.fetchall()
    conn.close()
    max_num = 9828
    for r in rows:
        mp = r['mp_number']
        try:
            val = int(mp)
            if val > max_num:
                max_num = val
        except (ValueError, TypeError):
            pass
    return str(max_num + 1)


def add_or_get_member(name, mp_number=None):
    """
    Finds a member by name (case-insensitive) or adds a new one dynamically.
    Auto-assigns an MP number if not provided.
    """
    if not name or not str(name).strip():
        return None
    clean_name = str(name).strip()
    conn = get_connection()
    cursor = _get_cursor(conn)

    cursor.execute(_normalize_sql('SELECT * FROM members WHERE LOWER(name) = LOWER(?)'), (clean_name,))
    row = cursor.fetchone()
    if row:
        m = dict(row)
        if mp_number and str(mp_number).strip() and m['mp_number'] != str(mp_number).strip():
            cursor.execute(_normalize_sql('UPDATE members SET mp_number = ? WHERE id = ?'), (str(mp_number).strip(), m['id']))
            conn.commit()
            m['mp_number'] = str(mp_number).strip()
        conn.close()
        return m

    if not mp_number or not str(mp_number).strip():
        cursor.execute('SELECT mp_number FROM members')
        rows = cursor.fetchall()
        max_num = 9828
        for r in rows:
            try:
                val = int(r['mp_number'])
                if val > max_num:
                    max_num = val
            except (ValueError, TypeError):
                pass
        final_mp = str(max_num + 1)
    else:
        final_mp = str(mp_number).strip()

    if get_db_backend() == 'postgres':
        cursor.execute('INSERT INTO members (name, mp_number, active) VALUES (%s, %s, 1) RETURNING id', (clean_name, final_mp))
        new_id = cursor.fetchone()['id']
    else:
        cursor.execute('INSERT INTO members (name, mp_number, active) VALUES (?, ?, 1)', (clean_name, final_mp))
        new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {'id': new_id, 'name': clean_name, 'mp_number': final_mp, 'active': 1}


def update_member_name(member_id, new_name, new_mp=None):
    """
    Updates an existing member's name and optionally MP number.
    """
    if not member_id or not new_name or not str(new_name).strip():
        return None
    clean_name = str(new_name).strip()
    conn = get_connection()
    cursor = _get_cursor(conn)
    if new_mp and str(new_mp).strip():
        cursor.execute(_normalize_sql('UPDATE members SET name = ?, mp_number = ? WHERE id = ?'), (clean_name, str(new_mp).strip(), member_id))
    else:
        cursor.execute(_normalize_sql('UPDATE members SET name = ? WHERE id = ?'), (clean_name, member_id))
    conn.commit()
    cursor.execute(_normalize_sql('SELECT * FROM members WHERE id = ?'), (member_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def auto_prefill_member_period(member_id, start_date, end_date, period_code=None):
    """
    Auto-generates period days for a member if none exist yet.
    Weekdays default to 9 hours (Work), weekends are marked Weekend with '-' hours.
    """
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute(_normalize_sql('''
        SELECT COUNT(*) as count FROM tasks 
        WHERE member_id = ? AND date >= ? AND date <= ?
    '''), (member_id, start_date, end_date))
    count = cursor.fetchone()['count']
    if count > 0:
        conn.close()
        return get_tasks_for_member(member_id, start_date, end_date)

    try:
        s_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        e_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except Exception:
        conn.close()
        return []

    cur_d = s_date
    while cur_d <= e_date:
        d_str = cur_d.strftime('%Y-%m-%d')
        if cur_d.weekday() in (5, 6):
            is_special = 'Weekend'
            desc = 'Weekend'
            hours = None
            proj = ''
            task_type = ''
        else:
            is_special = 'Work'
            desc = ''
            hours = 9.0
            proj = ''
            task_type = ''

        cursor.execute(_normalize_sql('''
            INSERT INTO tasks (member_id, date, project_code, task_type, description, hours, is_special, period_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        '''), (member_id, d_str, proj, task_type, desc, hours, is_special, period_code))
        cur_d += timedelta(days=1)

    conn.commit()
    conn.close()
    return get_tasks_for_member(member_id, start_date, end_date)


def get_tasks_for_member(member_id, start_date, end_date):
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute(_normalize_sql('''
        SELECT t.*, m.name as member_name, m.mp_number
        FROM tasks t
        JOIN members m ON t.member_id = m.id
        WHERE t.member_id = ? AND t.date >= ? AND t.date <= ?
        ORDER BY t.date ASC, t.id ASC
    '''), (member_id, start_date, end_date))
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks


def save_member_tasks(member_id, start_date, end_date, tasks_data, period_code=None):
    """
    Replaces task entries for the specified member within the date range.
    """
    conn = get_connection()
    cursor = _get_cursor(conn)

    cursor.execute(_normalize_sql('''
        DELETE FROM tasks
        WHERE member_id = ? AND date >= ? AND date <= ?
    '''), (member_id, start_date, end_date))

    for item in tasks_data:
        date_value = item.get('date', '').strip()
        project_code = item.get('project_code', '').strip()
        task_type = item.get('task_type', '').strip()
        description = item.get('description', '').strip()
        hours_raw = item.get('hours', None)
        is_special = item.get('is_special', 'Work')

        hours = None
        if hours_raw not in (None, '', '-'):
            try:
                hours = float(hours_raw)
            except ValueError:
                hours = 0.0

        if not date_value:
            continue

        cursor.execute(_normalize_sql('''
            INSERT INTO tasks (member_id, date, project_code, task_type, description, hours, is_special, period_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        '''), (member_id, date_value, project_code, task_type, description, hours, is_special, period_code))

    conn.commit()
    conn.close()


def get_all_tasks_for_period(start_date, end_date):
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute(_normalize_sql('''
        SELECT t.*, m.name as member_name, m.mp_number
        FROM tasks t
        JOIN members m ON t.member_id = m.id
        WHERE t.date >= ? AND t.date <= ?
        ORDER BY m.name ASC, t.date ASC, t.id ASC
    '''), (start_date, end_date))
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks


def get_period_summary(start_date, end_date):
    """
    Returns summary statistics for each team member for the given period.
    """
    conn = get_connection()
    cursor = _get_cursor(conn)
    cursor.execute('SELECT id, name, mp_number FROM members WHERE active = 1 ORDER BY name ASC')
    members = [dict(row) for row in cursor.fetchall()]

    cursor.execute(_normalize_sql('''
        SELECT member_id,
               COALESCE(SUM(hours), 0) as total_hours,
               COUNT(*) as task_count
        FROM tasks
        WHERE date >= ? AND date <= ?
        GROUP BY member_id
    '''), (start_date, end_date))

    stats_map = {row['member_id']: dict(row) for row in cursor.fetchall()}

    summary = []
    grand_total_hours = 0.0
    for m in members:
        st = stats_map.get(m['id'], {'total_hours': 0.0, 'task_count': 0})
        tot_hrs = round(float(st['total_hours']), 2)
        grand_total_hours += tot_hrs
        summary.append({
            'member_id': m['id'],
            'name': m['name'],
            'mp_number': m['mp_number'],
            'total_hours': tot_hrs,
            'task_count': st['task_count'],
            'status': 'Complete' if tot_hrs >= 99.0 else ('In Progress' if tot_hrs > 0 else 'Not Started')
        })

    conn.close()
    return {
        'members': summary,
        'grand_total_hours': round(grand_total_hours, 2),
        'total_members': len(members),
        'completed_members': sum(1 for m in summary if m['status'] == 'Complete')
    }
