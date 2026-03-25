from datetime import date, timedelta

from .database import Base, SessionLocal, engine
from .models import Manager, Project, Task, TeamMember, UserSetting

PROJECTS = [
    {
        "ProjectUID": 1001,
        "ProjectName": "ERP Modernization",
        "ProjectManager": "Ava Patel",
        "Start": date.today() - timedelta(days=35),
        "Finish": date.today() + timedelta(days=40),
        "DurationDays": 75,
        "PercentComplete": 52,
        "Status": "On Track",
        "Priority": "High",
        "Notes": "Source fields aligned to Microsoft Project import naming.",
        "SourceFileName": "erp-modernization.mpp",
    },
    {
        "ProjectUID": 1002,
        "ProjectName": "Infrastructure Refresh",
        "ProjectManager": "Mateo Gomez",
        "Start": date.today() - timedelta(days=50),
        "Finish": date.today() - timedelta(days=4),
        "DurationDays": 46,
        "PercentComplete": 70,
        "Status": "At Risk",
        "Priority": "High",
        "Notes": "Late finish drives overdue highlighting.",
        "SourceFileName": "infra-refresh.mpp",
    },
    {
        "ProjectUID": 1003,
        "ProjectName": "Client Portal Rollout",
        "ProjectManager": "Jordan Lee",
        "Start": date.today() - timedelta(days=20),
        "Finish": date.today() + timedelta(days=15),
        "DurationDays": 35,
        "PercentComplete": 86,
        "Status": "In Progress",
        "Priority": "Medium",
        "Notes": "Final UAT workstream in progress.",
        "SourceFileName": "client-portal.mpp",
    },
    {
        "ProjectUID": 1004,
        "ProjectName": "Data Governance Launch",
        "ProjectManager": "Mateo Gomez",
        "Start": date.today() - timedelta(days=7),
        "Finish": date.today() + timedelta(days=28),
        "DurationDays": 35,
        "PercentComplete": 15,
        "Status": "Not Started",
        "Priority": "Medium",
        "Notes": "New project intentionally seeded without tasks for dashboard testing.",
        "SourceFileName": "data-governance-launch.mpp",
    },
]

TASKS = [
    {
        "TaskUID": 5001,
        "ProjectUID": 1001,
        "TaskName": "Requirements lock",
        "ResourceNames": "Ava Patel",
        "Start": date.today() - timedelta(days=35),
        "Finish": date.today() - timedelta(days=20),
        "DurationDays": 15,
        "PercentComplete": 100,
        "Status": "Completed",
        "IsMilestone": True,
        "Notes": "",
    },
    {
        "TaskUID": 5002,
        "ProjectUID": 1001,
        "TaskName": "Migration scripts",
        "ResourceNames": "Ava Patel, Sam Rivera",
        "Start": date.today() - timedelta(days=10),
        "Finish": date.today() + timedelta(days=12),
        "DurationDays": 22,
        "PercentComplete": 65,
        "Status": "On Track",
        "IsMilestone": False,
        "Notes": "",
    },
    {
        "TaskUID": 5003,
        "ProjectUID": 1002,
        "TaskName": "Server cutover",
        "ResourceNames": "Mateo Gomez",
        "Start": date.today() - timedelta(days=18),
        "Finish": date.today() - timedelta(days=2),
        "DurationDays": 16,
        "PercentComplete": 75,
        "Status": "At Risk",
        "IsMilestone": False,
        "Notes": "",
    },
    {
        "TaskUID": 5004,
        "ProjectUID": 1002,
        "TaskName": "Network validation",
        "ResourceNames": "Ava Patel",
        "Start": date.today() - timedelta(days=12),
        "Finish": date.today() + timedelta(days=3),
        "DurationDays": 15,
        "PercentComplete": 40,
        "Status": "Blocked",
        "IsMilestone": False,
        "Notes": "Awaiting vendor fix.",
    },
    {
        "TaskUID": 5005,
        "ProjectUID": 1003,
        "TaskName": "UAT signoff",
        "ResourceNames": "Jordan Lee",
        "Start": date.today() - timedelta(days=5),
        "Finish": date.today() + timedelta(days=4),
        "DurationDays": 9,
        "PercentComplete": 80,
        "Status": "In Progress",
        "IsMilestone": False,
        "Notes": "",
    },
    {
        "TaskUID": 5006,
        "ProjectUID": 1003,
        "TaskName": "Production release",
        "ResourceNames": "Ava Patel",
        "Start": date.today() + timedelta(days=8),
        "Finish": date.today() + timedelta(days=15),
        "DurationDays": 7,
        "PercentComplete": 0,
        "Status": "Not Started",
        "IsMilestone": True,
        "Notes": "",
    },
]

TEAM_MEMBERS = [
    {"member_id": 1, "display_name": "Ava Patel"},
    {"member_id": 2, "display_name": "Jordan Lee"},
    {"member_id": 3, "display_name": "Mateo Gomez"},
    {"member_id": 4, "display_name": "Sam Rivera"},
    {"member_id": 5, "display_name": "Taylor Brooks"},
]

MANAGERS = [
    {"manager_id": 1, "display_name": "Ava Patel"},
    {"manager_id": 2, "display_name": "Jordan Lee"},
    {"manager_id": 3, "display_name": "Mateo Gomez"},
    {"manager_id": 4, "display_name": "Taylor Brooks"},
]


def build_additional_projects() -> list[dict[str, object]]:
    managers = ["Ava Patel", "Jordan Lee", "Mateo Gomez", "Taylor Brooks"]
    statuses = ["Not Started", "On Track", "In Progress", "At Risk"]
    priorities = ["Low", "Medium", "High"]
    projects: list[dict[str, object]] = []

    for index in range(5, 31):
        offset = index - 5
        start = date.today() - timedelta(days=(offset % 6) * 4)
        finish = start + timedelta(days=20 + (offset % 5) * 7)
        projects.append(
            {
                "ProjectUID": 1000 + index,
                "ProjectName": f"Portfolio Expansion {index:02d}",
                "ProjectManager": managers[offset % len(managers)],
                "Start": start,
                "Finish": finish,
                "DurationDays": max(1, (finish - start).days),
                "PercentComplete": 0,
                "Status": statuses[offset % len(statuses)],
                "Priority": priorities[offset % len(priorities)],
                "Notes": "Generated seed project for home-page pagination testing.",
                "SourceFileName": f"portfolio-expansion-{index:02d}.mpp",
            }
        )

    return projects


def seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        all_projects = [*PROJECTS, *build_additional_projects()]
        session.add_all(Project(**project) for project in all_projects)
        session.add_all(Task(**task) for task in TASKS)
        session.add_all(TeamMember(**member) for member in TEAM_MEMBERS)
        session.add_all(Manager(**manager) for manager in MANAGERS)
        session.add(
            UserSetting(
                user_id="demo-user",
                current_user_name="Ava Patel",
                theme="light",
                dashboard_sort_field="Finish",
                dashboard_sort_direction="asc",
            )
        )
        session.commit()
        print("Seed data loaded.")
    finally:
        session.close()


if __name__ == "__main__":
    seed()
