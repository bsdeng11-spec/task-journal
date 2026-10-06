"""
Sample Data Seeder.
Pre-populates the 23 team members' actual SEP 16-30 records provided by the user.
Allows immediate testing and verification of the web dashboard and Master Excel Export.
"""

import database

SAMPLE_TASKS = {
    # Robel (9826)
    "Robel": [
        {"project_code": "6460-01", "task_type": "Fixing", "description": "Print all sheets", "date": "2026-09-16", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6238-01", "task_type": "EX", "description": "Comment and Model updates EX- W plan", "date": "2026-09-16", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6153-01", "task_type": "Fixing", "description": "Comment and Model updates Basement FD", "date": "2026-09-16", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates Basement-(98-99+SEC), FD & EX", "date": "2026-09-16", "hours": 5.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates Basement(99-100) & Print all sheets", "date": "2026-09-16", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates Basement(99-100) & Print all sheets", "date": "2026-09-17", "hours": 5.0, "is_special": "Work"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates Basement-(98-99+SEC), FD & EX", "date": "2026-09-17", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6460-01", "task_type": "Fixing", "description": "print 97 level by arc and 101 level A+B build and fix the publish 360", "date": "2026-09-17", "hours": 2.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates 101+103-(99-100) & 103-(101)", "date": "2026-09-17", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates 101+103-(99-100) & 103-(101)", "date": "2026-09-18", "hours": 4.0, "is_special": "Work"},
        {"project_code": "6153-01", "task_type": "Fixing", "description": "Comment and Model updates Basement-(98-100) & EX", "date": "2026-09-18", "hours": 5.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-19", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-20", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "6153-01", "task_type": "Fixing", "description": "Comment and Model updates Basement-(98-100) & EX", "date": "2026-09-21", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates Basement-(99 & 98-99-SEC)", "date": "2026-09-21", "hours": 2.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "Fixing", "description": "Comment and Model updates-103- Basement (97-100) & check TYP levels for ARCH changes", "date": "2026-09-21", "hours": 6.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "EX", "description": "Comment and Model updates-102-EX", "date": "2026-09-22", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "EX", "description": "Comment and Model updates-102-EX", "date": "2026-09-23", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates basement (99 & TRF), FD & B-109", "date": "2026-09-23", "hours": 8.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "EX", "description": "Comment and Model updates-102-EX", "date": "2026-09-24", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates basement (99 & TRF), FD & B-109", "date": "2026-09-24", "hours": 5.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "Fixing", "description": "Comment and Model updates basement (98 & 100), check TYP levels for ARCH changes", "date": "2026-09-24", "hours": 3.0, "is_special": "Work"},
        {"project_code": "6313-01", "task_type": "Fixing", "description": "Comment and Model updates basement (98 & 100), check TYP levels for ARCH changes", "date": "2026-09-25", "hours": 8.0, "is_special": "Work"},
        {"project_code": "6153-01", "task_type": "Fixing", "description": "Comment and Model updates basement-FD", "date": "2026-09-25", "hours": 1.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-26", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-27", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "6243-01", "task_type": "Fixing", "description": "Comment and Model updates Basemnt (TRF-SEC)", "date": "2026-09-28", "hours": 1.0, "is_special": "Work"},
        {"project_code": "1961-01", "task_type": "Fixing", "description": "Print all sheets", "date": "2026-09-28", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates-101 & 103- Section for TYP Floors", "date": "2026-09-28", "hours": 6.0, "is_special": "Work"},
        {"project_code": "1961-01", "task_type": "Fixing", "description": "Comment and Model Updating Basement (97-99G)", "date": "2026-09-28", "hours": 1.0, "is_special": "Work"},
        {"project_code": "1961-01", "task_type": "Fixing", "description": "Comment and Model Updating Basement (97-99G)", "date": "2026-09-29", "hours": 4.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates-101 & 103- TYP Floors", "date": "2026-09-29", "hours": 5.0, "is_special": "Work"},
        {"project_code": "6407-01", "task_type": "Fixing", "description": "Comment and Model updates-101 & 103- TYP Floors", "date": "2026-09-30", "hours": 7.0, "is_special": "Work"},
        {"project_code": "1961-01", "task_type": "Fixing", "description": "Comment and Model Updating-Basement-(97-100), FD, TRF, N-(101-102), S-(101-106) & EX", "date": "2026-09-30", "hours": 2.0, "is_special": "Work"}
    ],

    # Abebech (9790)
    "Abebech": [
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C1 level 125-Roof", "date": "2026-09-16", "hours": 4.0, "is_special": "Work"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating basement level 100", "date": "2026-09-16", "hours": 5.0, "is_special": "Work"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C2 105-110", "date": "2026-09-17", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-19", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-20", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C2 111-Roof", "date": "2026-09-18", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C3 101-115", "date": "2026-09-21", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C3 116-123", "date": "2026-09-22", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1729-01", "task_type": "Fixing", "description": "Comment updating BLD C3-124-Roof", "date": "2026-09-23", "hours": 6.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 11 Level 101-105", "date": "2026-09-23", "hours": 3.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 11 Level 106-120", "date": "2026-09-24", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD B floors 104-107", "date": "2026-09-25", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-26", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-27", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 11 roof (133)", "date": "2026-09-28", "hours": 2.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 12 -(101-105)", "date": "2026-09-28", "hours": 7.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 12 -(105-109)", "date": "2026-09-29", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1729-03", "task_type": "Fixing", "description": "Comment updating BLD 12 -(109-120)", "date": "2026-09-30", "hours": 9.0, "is_special": "Work"}
    ],

    # Habesha (9783)
    "Habesha": [
        {"project_code": "6274-01", "task_type": "Fixing", "description": "updating building 6 stair according to the new arch", "date": "2026-09-16", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1449-04", "task_type": "Fixing", "description": "Fixing stairs according to the given comments", "date": "2026-09-17", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6274-01", "task_type": "Fixing", "description": "updating building 7 and 8 stairs according to the new arch", "date": "2026-09-18", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-19", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-20", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "1449-04", "task_type": "Fixing", "description": "Fixing stair according to the given comments", "date": "2026-09-21", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6145-01", "task_type": "Geometry and rebar", "description": "working on stair plan and section geometry and rebar", "date": "2026-09-22", "hours": 4.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Geometry", "description": "working on shelter plan and section geometry", "date": "2026-09-22", "hours": 5.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Rebar", "description": "working on shelter plan and section geometry", "date": "2026-09-23", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Rebar", "description": "working on shelter 1 plan and section rebar", "date": "2026-09-24", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Geometry", "description": "working on shelter 2 plan and section geometry and rebar", "date": "2026-09-25", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-26", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-27", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "1713-01", "task_type": "Rebar", "description": "working on shelter 2 plan and section geometry and rebar", "date": "2026-09-28", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Rebar", "description": "working on shelter 3 plan and section geometry and rebar", "date": "2026-09-29", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1713-01", "task_type": "Rebar", "description": "working on shelter 3 plan and section geometry and rebar", "date": "2026-09-30", "hours": 4.0, "is_special": "Work"},
        {"project_code": "6066-01", "task_type": "Rebar", "description": "working on stair plan and section geometry and rebar", "date": "2026-09-30", "hours": 5.0, "is_special": "Work"}
    ],

    # Miki (9771)
    "Miki": [
        {"project_code": "1880-01", "task_type": "Fixing", "description": "correction for floor 94 and95", "date": "2026-09-16", "hours": 9.0, "is_special": "Work"},
        {"project_code": "1880-01", "task_type": "Fixing", "description": "correction for floor 96,97 and98", "date": "2026-09-17", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6278-01", "task_type": "Fixing", "description": "correction for floor 93,94,95,96,97,98,,99,100,102,103,104 and106", "date": "2026-09-18", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-19", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-20", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "6504-01", "task_type": "Fixing", "description": "correction for floor98,99 and 100", "date": "2026-09-21", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6049-01", "task_type": "Fixing", "description": "correction for BLD T-1 ,T-2,T-3 and T-4", "date": "2026-09-22", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6049-01", "task_type": "Fixing", "description": "correction for BLD T-1 ,T-2,T-3 and T-5", "date": "2026-09-23", "hours": 7.0, "is_special": "Work"},
        {"project_code": "1880-01", "task_type": "Fixing", "description": "Correction for floor 95 X bars and comment update for all basements", "date": "2026-09-23", "hours": 2.0, "is_special": "Work"},
        {"project_code": "6049-01", "task_type": "Fixing", "description": "correction for BLD T-1 ,T-2,T-3 and T-6", "date": "2026-09-24", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6049-01", "task_type": "Fixing", "description": "correction for BLD T-1 ,T-2,T-3 and T-7", "date": "2026-09-25", "hours": 9.0, "is_special": "Work"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-26", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "", "task_type": "", "description": "Weekend", "date": "2026-09-27", "hours": 0.0, "is_special": "Weekend"},
        {"project_code": "6087-01", "task_type": "Fixing", "description": "correction 110,111,112,113,114 and 115 like arch comment", "date": "2026-09-28", "hours": 9.0, "is_special": "Work"},
        {"project_code": "6087-01", "task_type": "Fixing", "description": "correction 110,111,112,113,114 and 115 like arch comment", "date": "2026-09-29", "hours": 8.0, "is_special": "Work"},
        {"project_code": "6504-01", "task_type": "Fixing", "description": "correction EX plan and sec", "date": "2026-09-29", "hours": 1.0, "is_special": "Work"},
        {"project_code": "6087-01", "task_type": "Fixing", "description": "correction 110,111,112,113,114 and 115 like arch comment", "date": "2026-09-30", "hours": 9.0, "is_special": "Work"}
    ]
}

def seed_data():
    database.init_db()
    members = database.get_members()
    member_map = {m['name']: m['id'] for m in members}

    for name, tasks in SAMPLE_TASKS.items():
        m_id = member_map.get(name)
        if m_id:
            database.save_member_tasks(
                member_id=m_id,
                start_date="2026-09-16",
                end_date="2026-09-30",
                tasks_data=tasks,
                period_code="SEP 16-30"
            )
            print(f"✔ Seeded {len(tasks)} records for {name}")

    print("Sample data seeded successfully!")

if __name__ == '__main__':
    seed_data()
