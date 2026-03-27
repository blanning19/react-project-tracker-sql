from pathlib import Path


def test_healthcheck_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_docs_are_available(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()
    assert payload["info"]["title"] == "Project Tracker API"
    assert any(tag["name"] == "projects" for tag in payload["tags"])


def test_create_project_and_list_projects(client):
    payload = {
        "ProjectUID": 1001,
        "ProjectName": "Documentation rollout",
        "ProjectManager": "Ava Patel",
        "CalendarName": "Standard",
        "Start": "2026-03-01",
        "Finish": "2026-03-15",
        "DurationDays": 14,
        "PercentComplete": 0,
        "Status": "Not Started",
        "Priority": "High",
        "Notes": "Created during pytest coverage.",
        "SourceFileName": "manual",
    }

    create_response = client.post("/api/projects", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["ProjectName"] == payload["ProjectName"]
    assert created["ProjectManager"] == payload["ProjectManager"]

    list_response = client.get("/api/projects")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["ProjectUID"] == payload["ProjectUID"]


def test_import_project_xml_creates_project_tasks_and_people(client):
    sample_file = Path(__file__).resolve().parents[2] / "samples" / "ms-project" / "advanced-product-launch.xml"

    with sample_file.open("rb") as file_handle:
        response = client.post(
            "/api/projects/import",
            files={"file": (sample_file.name, file_handle, "application/xml")},
        )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ProjectName"] == "Advanced Product Launch"
    assert payload["CalendarName"] == "Standard"
    assert len(payload["tasks"]) > 0

    managers_response = client.get("/api/managers")
    assert managers_response.status_code == 200
    assert any(manager["displayName"] == "Jordan Lee" for manager in managers_response.json())

    team_members_response = client.get("/api/team-members")
    assert team_members_response.status_code == 200
    assert any(member["displayName"] == "Morgan Chen" for member in team_members_response.json())
