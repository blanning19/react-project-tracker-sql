from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from defusedxml import ElementTree as ET


@dataclass
class ImportedTask:
    source_uid: int
    name: str
    outline_level: int
    outline_number: str
    wbs: str
    is_summary: bool
    predecessors: str
    start: date
    finish: date
    duration_days: int
    percent_complete: int
    status: str
    is_milestone: bool
    notes: str
    resource_names: str


@dataclass
class ImportedProject:
    name: str
    manager: str
    imported_by: str
    calendar_name: str
    start: date
    finish: date
    duration_days: int
    percent_complete: int
    status: str
    priority: str
    notes: str
    source_file_name: str
    tasks: list[ImportedTask]


def local_name(tag: str) -> str:
    return tag.split("}", 1)[-1]


def child_text(element: ET.Element, tag_name: str) -> str | None:
    for child in list(element):
        if local_name(child.tag) == tag_name and child.text is not None:
            value = child.text.strip()
            if value:
                return value
    return None


def parse_date(value: str | None) -> date | None:
    if not value:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    normalized = normalized.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue

    return None


def parse_int(value: str | None, default: int = 0) -> int:
    if value is None:
        return default

    try:
        return int(float(value.strip()))
    except ValueError:
        return default


def parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes"}


def normalize_duration_days(start: date, finish: date, duration_text: str | None) -> int:
    if start == finish:
        return 1

    if duration_text:
        duration_text = duration_text.strip().upper()
        if duration_text.startswith("P"):
            days = 0
            hours = 0
            current = ""
            in_time = False
            for character in duration_text[1:]:
                if character == "T":
                    in_time = True
                    current = ""
                    continue
                if character.isdigit() or character == ".":
                    current += character
                    continue
                if not current:
                    continue
                numeric = float(current)
                if character == "D":
                    days += int(numeric)
                elif character == "H" and in_time:
                    hours += int(numeric)
                current = ""
            if days or hours:
                return max(1, days + round(hours / 8))

    return max(1, (finish - start).days)


def infer_status(percent_complete: int, finish: date) -> str:
    if percent_complete >= 100:
        return "Completed"
    if percent_complete <= 0:
        return "Not Started"
    if finish < date.today():
        return "At Risk"
    return "In Progress"


def infer_priority(value: str | None) -> str:
    if value is None:
        return "Medium"

    normalized = value.strip()
    if not normalized:
        return "Medium"

    lowered = normalized.lower()
    if lowered in {"high", "medium", "low"}:
        return lowered.capitalize()

    numeric = parse_int(normalized, default=500)
    if numeric >= 700:
        return "High"
    if numeric <= 300:
        return "Low"
    return "Medium"


def build_resource_map(root: ET.Element) -> dict[int, str]:
    resources: dict[int, str] = {}
    for resource in root.iter():
        if local_name(resource.tag) != "Resource":
            continue
        uid = parse_int(child_text(resource, "UID"), default=0)
        name = child_text(resource, "Name")
        if uid > 0 and name:
            resources[uid] = name
    return resources


def build_assignment_map(root: ET.Element, resources: dict[int, str]) -> dict[int, list[str]]:
    assignments: dict[int, list[str]] = {}
    for assignment in root.iter():
        if local_name(assignment.tag) != "Assignment":
            continue
        task_uid = parse_int(child_text(assignment, "TaskUID"), default=0)
        resource_uid = parse_int(child_text(assignment, "ResourceUID"), default=0)
        resource_name = resources.get(resource_uid)
        if task_uid <= 0 or not resource_name:
            continue
        assignments.setdefault(task_uid, [])
        if resource_name not in assignments[task_uid]:
            assignments[task_uid].append(resource_name)
    return assignments


def parse_tasks(root: ET.Element, project_start: date, project_finish: date) -> list[ImportedTask]:
    resources = build_resource_map(root)
    assignments = build_assignment_map(root, resources)
    tasks: list[ImportedTask] = []
    task_labels: dict[int, str] = {}

    for task in root.iter():
        if local_name(task.tag) != "Task":
            continue
        uid = parse_int(child_text(task, "UID"), default=0)
        if uid <= 0:
            continue
        task_labels[uid] = (
            child_text(task, "WBS") or child_text(task, "OutlineNumber") or child_text(task, "Name") or str(uid)
        )

    for task in root.iter():
        if local_name(task.tag) != "Task":
            continue

        uid = parse_int(child_text(task, "UID"), default=0)
        name = child_text(task, "Name")
        if uid <= 0 or not name:
            continue

        start = parse_date(child_text(task, "Start")) or parse_date(child_text(task, "StartDate")) or project_start
        finish = parse_date(child_text(task, "Finish")) or parse_date(child_text(task, "FinishDate")) or project_finish
        if finish < start:
            finish = start

        is_summary = parse_bool(child_text(task, "Summary"))
        percent_complete = max(0, min(100, parse_int(child_text(task, "PercentComplete"), default=0)))
        is_milestone = parse_bool(child_text(task, "Milestone")) or start == finish
        resource_names = ", ".join(assignments.get(uid, []))
        if not resource_names:
            resource_names = child_text(task, "ResourceNames") or ""

        predecessor_labels: list[str] = []
        for predecessor_link in list(task):
            if local_name(predecessor_link.tag) != "PredecessorLink":
                continue
            predecessor_uid = parse_int(child_text(predecessor_link, "PredecessorUID"), default=0)
            if predecessor_uid <= 0:
                continue
            predecessor_label = task_labels.get(predecessor_uid, str(predecessor_uid))
            if predecessor_label not in predecessor_labels:
                predecessor_labels.append(predecessor_label)

        imported_task = ImportedTask(
            source_uid=uid,
            name=name,
            outline_level=max(1, parse_int(child_text(task, "OutlineLevel"), default=1)),
            outline_number=child_text(task, "OutlineNumber") or "",
            wbs=child_text(task, "WBS") or "",
            is_summary=is_summary,
            predecessors=", ".join(predecessor_labels),
            start=start,
            finish=finish,
            duration_days=normalize_duration_days(start, finish, child_text(task, "Duration")),
            percent_complete=percent_complete,
            status=infer_status(percent_complete, finish),
            is_milestone=is_milestone,
            notes=child_text(task, "Notes") or "",
            resource_names=resource_names,
        )
        tasks.append(imported_task)

    return tasks


def parse_project_xml(file_bytes: bytes, source_file_name: str, imported_by: str = "Unknown") -> ImportedProject:
    try:
        root = ET.fromstring(file_bytes)
    except ET.ParseError as exc:
        raise ValueError("The uploaded file is not valid Microsoft Project XML.") from exc

    if local_name(root.tag) != "Project":
        raise ValueError("The uploaded XML file does not contain a Microsoft Project <Project> root element.")

    project_name = child_text(root, "Name") or child_text(root, "Title") or source_file_name.rsplit(".", 1)[0]
    manager = child_text(root, "Manager") or child_text(root, "Author") or "Imported Manager"
    calendar_name = ""
    calendar_uid = child_text(root, "CalendarUID")
    if calendar_uid:
        for calendar in root.iter():
            if local_name(calendar.tag) != "Calendar":
                continue
            if child_text(calendar, "UID") == calendar_uid:
                calendar_name = child_text(calendar, "Name") or ""
                break
    project_start = parse_date(child_text(root, "StartDate")) or date.today()
    project_finish = parse_date(child_text(root, "FinishDate")) or project_start

    tasks = parse_tasks(root, project_start, project_finish)
    if tasks:
        project_start = min(task.start for task in tasks)
        project_finish = max(task.finish for task in tasks)

    if project_finish < project_start:
        project_finish = project_start

    percent_complete = round(sum(task.percent_complete for task in tasks) / len(tasks)) if tasks else 0
    status = infer_status(percent_complete, project_finish)
    notes = child_text(root, "Comments") or child_text(root, "Notes") or ""

    return ImportedProject(
        name=project_name,
        manager=manager,
        imported_by=imported_by,
        calendar_name=calendar_name,
        start=project_start,
        finish=project_finish,
        duration_days=normalize_duration_days(project_start, project_finish, child_text(root, "Duration")),
        percent_complete=percent_complete,
        status=status,
        priority=infer_priority(child_text(root, "Priority")),
        notes=notes,
        source_file_name=source_file_name,
        tasks=tasks,
    )
