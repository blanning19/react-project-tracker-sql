from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from backend.project_tracker_api import crud


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
    assert listed[0]["ProjectUID"] == created["ProjectUID"]


def test_create_project_assigns_uid_when_client_omits_it(client):
    response = client.post(
        "/api/projects",
        json={
            "ProjectName": "Server generated ID project",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-10",
            "DurationDays": 9,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ProjectUID"] > 0
    assert payload["ProjectName"] == "Server generated ID project"


def test_create_project_ignores_client_supplied_uid(client):
    first_response = client.post(
        "/api/projects",
        json={
            "ProjectUID": 1001,
            "ProjectName": "First project",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-15",
            "DurationDays": 14,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "High",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )
    second_response = client.post(
        "/api/projects",
        json={
            "ProjectUID": 1001,
            "ProjectName": "Second project",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-16",
            "Finish": "2026-03-20",
            "DurationDays": 4,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["ProjectUID"] != second_response.json()["ProjectUID"]


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
    assert import_events[0]["correlationId"]
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
    assert event["correlationId"]
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


def test_import_planner_project_uses_server_user_for_audit_and_ownership(client):
    response = client.post(
        "/api/projects/import-planner",
        params={"user_name": "Brad Lanning"},
        json={
            "ProjectName": "Planner rollout",
            "ProjectManager": "Spoofed Manager",
            "SourceFileName": "planner-export.xlsx",
            "ImportedBy": "Spoofed Importer",
            "Start": "2026-04-10",
            "Finish": "2026-04-12",
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "Imported from Planner.",
            "PlannerImportMetadata": {
                "source": "planner",
                "importedAt": "2026-04-07T10:00:00Z",
                "bucketCount": 1,
                "labelNames": ["Blue", "Red"],
            },
            "tasks": [
                {
                    "TaskName": "Draft launch plan",
                    "BucketName": "Backlog",
                    "ResourceNames": "Morgan Chen",
                    "Start": "2026-04-10",
                    "Finish": "2026-04-12",
                    "PercentComplete": 50,
                    "Status": "In Progress",
                    "Priority": "Medium",
                    "Notes": "",
                    "Labels": ["Blue", "Red"],
                    "ChecklistItems": ["Draft copy"],
                    "CompletedChecklistItems": ["Draft copy"],
                }
            ],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ProjectManager"] == "Brad Lanning"
    assert payload["PlannerImportMetadata"]["source"] == "planner"
    assert payload["tasks"][0]["BucketName"] == "Backlog"

    import_events_response = client.get("/api/admin/import-events", params={"user_name": "Brad Lanning"})
    assert import_events_response.status_code == 200
    import_event = import_events_response.json()[0]
    assert import_event["importedBy"] == "Brad Lanning"
    assert import_event["status"] == "Succeeded"

    managers_response = client.get("/api/managers")
    assert managers_response.status_code == 200
    assert any(manager["displayName"] == "Brad Lanning" for manager in managers_response.json())


def test_import_planner_project_rejects_completed_checklist_items_not_present_in_checklist(client):
    response = client.post(
        "/api/projects/import-planner",
        params={"user_name": "Brad Lanning"},
        json={
            "ProjectName": "Planner rollout",
            "ProjectManager": "Brad Lanning",
            "SourceFileName": "planner-export.xlsx",
            "ImportedBy": "Brad Lanning",
            "Start": "2026-04-10",
            "Finish": "2026-04-12",
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "Imported from Planner.",
            "PlannerImportMetadata": {
                "source": "planner",
                "importedAt": "2026-04-07T10:00:00Z",
                "bucketCount": 1,
                "labelNames": ["Blue", "Red"],
            },
            "tasks": [
                {
                    "TaskName": "Draft launch plan",
                    "BucketName": "Backlog",
                    "ResourceNames": "Morgan Chen",
                    "Start": "2026-04-10",
                    "Finish": "2026-04-12",
                    "PercentComplete": 50,
                    "Status": "In Progress",
                    "Priority": "Medium",
                    "Notes": "",
                    "Labels": ["Blue", "Blue", "Red"],
                    "ChecklistItems": ["Draft copy"],
                    "CompletedChecklistItems": ["Missing item"],
                }
            ],
        },
    )

    assert response.status_code == 422


def test_create_task_rejects_completed_checklist_items_not_present_in_checklist(client):
    project_response = client.post(
        "/api/projects",
        json={
            "ProjectName": "Checklist validation",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-15",
            "DurationDays": 14,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )
    project_uid = project_response.json()["ProjectUID"]

    create_response = client.post(
        "/api/tasks",
        json={
            "ProjectUID": project_uid,
            "TaskName": "Draft project plan",
            "OutlineLevel": 1,
            "OutlineNumber": "1",
            "WBS": "1",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-02",
            "Finish": "2026-03-05",
            "DurationDays": 3,
            "PercentComplete": 0,
            "Status": "Not Started",
            "IsMilestone": False,
            "Notes": "",
            "BucketName": "",
            "Labels": ["Blue", "Blue"],
            "ChecklistItems": ["Draft copy"],
            "CompletedChecklistItems": ["Review copy"],
            "ChecklistProgress": {
                "completedItems": 1,
                "totalItems": 1,
                "percentComplete": 100,
            },
        },
    )

    assert create_response.status_code == 422


def test_task_save_derives_duration_from_start_and_finish(client):
    project_response = client.post(
        "/api/projects",
        json={
            "ProjectName": "Duration verification",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-15",
            "DurationDays": 99,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )
    assert project_response.status_code == 201
    project_uid = project_response.json()["ProjectUID"]

    create_response = client.post(
        "/api/tasks",
        json={
            "ProjectUID": project_uid,
            "TaskName": "Draft project plan",
            "OutlineLevel": 1,
            "OutlineNumber": "1",
            "WBS": "1",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-02",
            "Finish": "2026-03-05",
            "DurationDays": 42,
            "PercentComplete": 0,
            "Status": "Not Started",
            "IsMilestone": False,
            "Notes": "",
        },
    )

    assert create_response.status_code == 201
    created_task = create_response.json()
    assert created_task["DurationDays"] == 3
    created_task_uid = created_task["TaskUID"]

    update_response = client.put(
        f"/api/tasks/{created_task_uid}",
        json={
            "ProjectUID": project_uid,
            "TaskName": "Draft project plan",
            "OutlineLevel": 1,
            "OutlineNumber": "1",
            "WBS": "1",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-02",
            "Finish": "2026-03-08",
            "DurationDays": 99,
            "PercentComplete": 15,
            "Status": "In Progress",
            "IsMilestone": False,
            "Notes": "",
        },
    )

    assert update_response.status_code == 200
    updated_task = update_response.json()
    assert updated_task["DurationDays"] == 6


def test_create_task_assigns_uid_when_client_omits_it(client):
    project_response = client.post(
        "/api/projects",
        json={
            "ProjectName": "Task ID generation",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-15",
            "DurationDays": 14,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )
    assert project_response.status_code == 201
    project_uid = project_response.json()["ProjectUID"]

    create_response = client.post(
        "/api/tasks",
        json={
            "ProjectUID": project_uid,
            "TaskName": "Server generated task",
            "OutlineLevel": 1,
            "OutlineNumber": "1",
            "WBS": "1",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-02",
            "Finish": "2026-03-05",
            "DurationDays": 3,
            "PercentComplete": 0,
            "Status": "Not Started",
            "IsMilestone": False,
            "Notes": "",
        },
    )

    assert create_response.status_code == 201
    created_task = create_response.json()
    assert created_task["TaskUID"] > 0
    assert created_task["ProjectUID"] == project_uid


def test_create_task_ignores_client_supplied_uid(client):
    project_response = client.post(
        "/api/projects",
        json={
            "ProjectName": "Ignore task ID payload",
            "ProjectManager": "Ava Patel",
            "CalendarName": "Standard",
            "Start": "2026-03-01",
            "Finish": "2026-03-15",
            "DurationDays": 14,
            "PercentComplete": 0,
            "Status": "Not Started",
            "Priority": "Medium",
            "Notes": "",
            "SourceFileName": "manual",
        },
    )
    assert project_response.status_code == 201
    project_uid = project_response.json()["ProjectUID"]

    first_response = client.post(
        "/api/tasks",
        json={
            "TaskUID": 5001,
            "ProjectUID": project_uid,
            "TaskName": "First generated task",
            "OutlineLevel": 1,
            "OutlineNumber": "1",
            "WBS": "1",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-02",
            "Finish": "2026-03-05",
            "DurationDays": 3,
            "PercentComplete": 0,
            "Status": "Not Started",
            "IsMilestone": False,
            "Notes": "",
        },
    )
    second_response = client.post(
        "/api/tasks",
        json={
            "TaskUID": 5001,
            "ProjectUID": project_uid,
            "TaskName": "Second generated task",
            "OutlineLevel": 1,
            "OutlineNumber": "2",
            "WBS": "2",
            "IsSummary": False,
            "Predecessors": "",
            "ResourceNames": "Ava Patel",
            "Start": "2026-03-06",
            "Finish": "2026-03-08",
            "DurationDays": 2,
            "PercentComplete": 0,
            "Status": "Not Started",
            "IsMilestone": False,
            "Notes": "",
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["TaskUID"] != second_response.json()["TaskUID"]


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


def test_read_log_file_with_context_prefers_matching_correlation_id(tmp_path):
    log_file = tmp_path / "project_tracker_api.log"
    log_file.write_text(
        "\n".join(
            [
                "2026-03-30 10:00:00,000 INFO [backend.project_tracker_api.main] Project Tracker API started.",
                (
                    "2026-03-30 10:01:00,000 WARNING [backend.project_tracker_api.main] "
                    "Project import rejected because the uploaded file was not XML. "
                    '| context={"correlationId":"match-123","sourceFileName":"notes.txt","userName":"Brad Lanning"}'
                ),
                (
                    "2026-03-30 10:01:01,000 WARNING [backend.project_tracker_api.main] "
                    "Project import validation failed. "
                    '| context={"correlationId":"other-456","sourceFileName":"broken.xml","userName":"Brad Lanning"}'
                ),
            ]
        ),
        encoding="utf-8",
    )

    response = crud.read_log_file_with_context(
        str(log_file),
        around_timestamp=datetime(2026, 3, 30, 10, 1, 0),
        correlation_id="match-123",
    )

    assert len(response.lines) == 1
    assert response.lines[0].correlationId == "match-123"
    assert "notes.txt" in response.lines[0].content


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
