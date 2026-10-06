"""
Task Journal Web Application
Main Flask entry point with Member Timesheet and Manager Dashboard.
"""

from flask import Flask, render_template, request, jsonify, send_file
import database
import excel_exporter
from datetime import datetime, date, timedelta
import os

app = Flask(__name__)

# Initialize database on startup
database.init_db()

# Pre-defined common task types for BIM & Engineering modeling
TASK_TYPES = [
    "Fixing",
    "Modelling",
    "Rebar",
    "Geometry",
    "Geometry and rebar",
    "Excavation",
    "Preparing DWG",
    "EX",
    "Fixing Geometry",
    "Comment update",
    "Model update"
]

def get_default_period():
    """
    Computes default 15-day period based on current or sample date.
    Cycle 1: 1st to 15th
    Cycle 2: 16th to end of month
    """
    today = date.today()
    year = today.year
    month = today.month

    if today.day <= 15:
        start_d = date(year, month, 1)
        end_d = date(year, month, 15)
        period_title = f"{today.strftime('%b').upper()} 01-15"
    else:
        start_d = date(year, month, 16)
        # End of current month
        next_month = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        end_d = next_month - timedelta(days=1)
        period_title = f"{today.strftime('%b').upper()} 16-{end_d.day}"

    return {
        'start_date': start_d.strftime('%Y-%m-%d'),
        'end_date': end_d.strftime('%Y-%m-%d'),
        'period_title': period_title,
        'year_label': str(year)
    }

@app.route('/')
def index():
    members = database.get_members()
    period = get_default_period()
    return render_template('index.html', members=members, period=period, task_types=TASK_TYPES)

@app.route('/dashboard')
def dashboard():
    period = get_default_period()
    start_date = request.args.get('start_date', period['start_date'])
    end_date = request.args.get('end_date', period['end_date'])
    period_title = request.args.get('period_title', period['period_title'])
    year_label = request.args.get('year_label', period['year_label'])

    summary = database.get_period_summary(start_date, end_date)
    return render_template(
        'dashboard.html',
        summary=summary,
        period={
            'start_date': start_date,
            'end_date': end_date,
            'period_title': period_title,
            'year_label': year_label
        }
    )

@app.route('/api/members')
def api_members():
    members = database.get_members()
    return jsonify({'success': True, 'members': members})

@app.route('/api/enter-system', methods=['POST'])
def api_enter_system():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    mp_number = (data.get('mp_number') or '').strip()
    rename_id = data.get('rename_id')

    if not name:
        return jsonify({'success': False, 'error': 'Name is required'}), 400

    if rename_id:
        member = database.update_member_name(int(rename_id), name, mp_number if mp_number else None)
    else:
        member = database.add_or_get_member(name, mp_number if mp_number else None)

    if not member:
        return jsonify({'success': False, 'error': 'Failed to process member'}), 500

    return jsonify({'success': True, 'member': member})

@app.route('/api/auto-prefill', methods=['POST'])
def api_auto_prefill():
    data = request.get_json() or {}
    member_id = data.get('member_id')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    period_code = data.get('period_code')

    if not member_id or not start_date or not end_date:
        return jsonify({'success': False, 'error': 'Missing parameters'}), 400

    tasks = database.auto_prefill_member_period(int(member_id), start_date, end_date, period_code)
    return jsonify({'success': True, 'tasks': tasks})


@app.route('/api/get-tasks')
def api_get_tasks():
    member_id = request.args.get('member_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not member_id or not start_date or not end_date:
        return jsonify({'success': False, 'error': 'Missing parameters'}), 400

    tasks = database.get_tasks_for_member(member_id, start_date, end_date)
    return jsonify({'success': True, 'tasks': tasks})

@app.route('/api/save-tasks', methods=['POST'])
def api_save_tasks():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON'}), 400

    member_id = data.get('member_id')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    tasks_list = data.get('tasks', [])
    period_code = data.get('period_code', f"{start_date}_to_{end_date}")

    if not member_id or not start_date or not end_date:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    database.save_member_tasks(member_id, start_date, end_date, tasks_list, period_code)
    return jsonify({'success': True, 'message': 'Tasks saved successfully'})

@app.route('/export-excel')
def export_excel():
    period = get_default_period()
    start_date = request.args.get('start_date', period['start_date'])
    end_date = request.args.get('end_date', period['end_date'])
    period_title = request.args.get('period_title', period['period_title'])
    year_label = request.args.get('year_label', period['year_label'])

    members = database.get_members()
    all_tasks = database.get_all_tasks_for_period(start_date, end_date)

    # Group tasks by member_id
    tasks_by_member = {}
    for t in all_tasks:
        m_id = t['member_id']
        if m_id not in tasks_by_member:
            tasks_by_member[m_id] = []
        tasks_by_member[m_id].append(t)

    excel_file = excel_exporter.generate_master_excel(
        period_title=period_title,
        year_label=year_label,
        all_members=members,
        tasks_by_member=tasks_by_member
    )

    clean_filename = f"Master_Report_{period_title.replace(' ', '_')}_{year_label}.xlsx"
    return send_file(
        excel_file,
        as_attachment=True,
        download_name=clean_filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # host='0.0.0.0' allows other PCs / phones on same local network to access it!
    app.run(host='0.0.0.0', port=port, debug=False)
