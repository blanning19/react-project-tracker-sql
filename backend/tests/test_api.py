from pathlib import Path
from unittest.mock import patch


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


def test_import_project_xml_creates_project_tasks_people_and_event(client):
    sample_file = Path(__file__).resolve().parents[2] / "samples" / "ms-project" / "advanced-product-launch.xml"

    with sample_file.open("rb") as file_handle:
        response = client.post(
            "/api/projects/import",
            params={"user_name": "Brad Lanning"},
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

    import_events_response = client.get("/api/admin/import-events", params={"user_name": "Brad Lanning"})
    assert import_events_response.status_code == 200
    import_events = import_events_response.json()
    assert len(import_events) == 1
    assert import_events[0]["status"] == "Succeeded"
    assert import_events[0]["importedBy"] == "Brad Lanning"
    assert import_events[0]["sourceFileName"] == sample_file.name
    assert import_events[0]["failureReason"] == ""


def test_import_project_still_succeeds_when_import_event_recording_fails(client):
    sample_file = Path(__file__).resolve().parents[2] / "samples" / "ms-project" / "advanced-product-launch.xml"

    with patch("backend.project_tracker_api.crud.record_import_event", side_effect=Exception("audit failed")):
        with sample_file.open("rb") as file_handle:
            response = client.post(
                "/api/projects/import",
                params={"user_name": "Brad Lanning"},
                files={"file": (sample_file.name, file_handle, "application/xml")},
            )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ProjectName"] == "Advanced Product Launch"


def test_create_project_rejects_duplicate_project_uid(client):
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

    first_response = client.post("/api/projects", json=payload)
    duplicate_response = client.post("/api/projects", json=payload)

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == "ProjectUID already exists."


def test_import_project_rejects_non_xml_upload_and_records_failure(client):
    response = client.post(
        "/api/projects/import",
        params={"user_name": "Brad Lanning"},
        files={"file": ("notes.txt", b"not xml", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Upload a Microsoft Project XML export (.xml)."

    summary_response = client.get("/api/admin/import-events/summary", params={"user_name": "Brad Lanning"})
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["failedImports"] == 1
    assert summary["lastFailureMessage"] == "Upload a Microsoft Project XML export (.xml)."

    events_response = client.get("/api/admin/import-events", params={"user_name": "Brad Lanning"})
    event = events_response.json()[0]
    assert event["failureReason"] == "Upload was not an XML file."
    assert event["technicalDetails"] == "Expected a file with the .xml extension."


def test_import_project_rejects_empty_upload(client):
    response = client.post(
        "/api/projects/import",
        params={"user_name": "Brad Lanning"},
        files={"file": ("empty.xml", b"", "application/xml")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "The uploaded file is empty."


def test_settings_update_rejects_user_mismatch(client):
    response = client.put(
        "/api/settings/demo-user",
        json={
            "userId": "different-user",
            "currentUserName": "Brad Lanning",
            "theme": "light",
            "dashboardSortField": "Finish",
            "dashboardSortDirection": "asc",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "User id mismatch."


def test_current_log_rejects_non_admin_user(client):
    response = client.get("/api/logs/current", params={"user_name": "Morgan Chen"})

    assert response.status_code == 403
    assert response.json()["detail"] == "You are not allowed to access admin tools."


def test_current_log_rejects_invalid_context_timestamp(client):
    response = client.get(
        "/api/logs/current",
        params={"user_name": "Brad Lanning", "around_timestamp": "not-a-real-timestamp"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "around_timestamp must be a valid ISO timestamp."


def test_admin_environment_and_access_list_require_admin(client):
    environment_response = client.get("/api/admin/environment", params={"user_name": "Morgan Chen"})
    access_response = client.get("/api/admin/access", params={"user_name": "Morgan Chen"})

    assert environment_response.status_code == 403
    assert access_response.status_code == 403


def test_admin_access_me_returns_seeded_permissions(client):
    response = client.get("/api/admin/access/me", params={"user_name": "Brad Lanning"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["userName"] == "Brad Lanning"
    assert payload["canViewAdmin"] is True
    assert payload["canViewLogs"] is True


def test_admin_can_update_user_access(client):
    response = client.put(
        "/api/admin/access/Mateo Gomez",
        params={"user_name": "Brad Lanning"},
        json={
            "role": "Manager",
            "canViewAdmin": True,
            "canViewLogs": False,
            "notes": "Promoted for import oversight.",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["userName"] == "Mateo Gomez"
    assert payload["role"] == "Manager"
    assert payload["canViewAdmin"] is True
    assert payload["canViewLogs"] is False
    assert payload["notes"] == "Promoted for import oversight."


def test_admin_environment_summary_returns_safe_runtime_details(client):
    response = client.get("/api/admin/environment", params={"user_name": "Brad Lanning"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["appVersion"] == "0.1.0"
    assert payload["swaggerDocsUrl"].endswith("/docs")
    assert payload["openapiJsonUrl"].endswith("/openapi.json")
    assert payload["healthUrl"].endswith("/health")
