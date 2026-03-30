import json
from datetime import datetime, timedelta
from pathlib import Path

from . import schemas


def parse_log_level(line: str) -> str:
    upper_line = line.upper()
    for level in ("ERROR", "WARNING", "INFO", "DEBUG", "CRITICAL"):
        if f" {level} " in upper_line or upper_line.startswith(level):
            return level
    return "OTHER"


def read_log_file(log_file_path: str | None, max_lines: int = 400) -> schemas.LogFileRead:
    return read_log_file_with_context(log_file_path, max_lines=max_lines, around_timestamp=None)


def parse_log_timestamp(line: str) -> datetime | None:
    timestamp_token = line[:23]
    try:
        return datetime.strptime(timestamp_token, "%Y-%m-%d %H:%M:%S,%f")
    except ValueError:
        return None


def extract_log_context(line: str) -> dict[str, object]:
    marker = "| context="
    if marker not in line:
        return {}

    _, _, serialized_context = line.partition(marker)
    serialized_context = serialized_context.strip()
    if not serialized_context:
        return {}

    try:
        parsed_context = json.loads(serialized_context)
    except json.JSONDecodeError:
        return {}

    if isinstance(parsed_context, dict):
        return parsed_context
    return {}


def extract_correlation_id(line: str) -> str | None:
    context = extract_log_context(line)
    correlation_id = context.get("correlationId")
    if isinstance(correlation_id, str) and correlation_id:
        return correlation_id

    nested_context = context.get("context")
    if isinstance(nested_context, dict):
        nested_correlation_id = nested_context.get("correlation_id") or nested_context.get("correlationId")
        if isinstance(nested_correlation_id, str) and nested_correlation_id:
            return nested_correlation_id

    return None


def read_log_file_with_context(
    log_file_path: str | None,
    *,
    max_lines: int = 400,
    around_timestamp: datetime | None,
    correlation_id: str | None = None,
    window_seconds: int = 180,
) -> schemas.LogFileRead:
    if not log_file_path:
        return schemas.LogFileRead(filePath=None, lines=[])

    path = Path(log_file_path)
    if not path.exists():
        return schemas.LogFileRead(filePath=str(path), lines=[])

    content = path.read_text(encoding="utf-8", errors="replace").splitlines()
    tail = content[-max_lines:]
    starting_line = max(1, len(content) - len(tail) + 1)
    context_start = around_timestamp - timedelta(seconds=window_seconds) if around_timestamp else None
    context_end = around_timestamp + timedelta(seconds=window_seconds) if around_timestamp else None
    lines = []
    for index, line in enumerate(tail):
        line_timestamp = parse_log_timestamp(line)
        line_correlation_id = extract_correlation_id(line)
        is_context_match = (correlation_id is not None and line_correlation_id == correlation_id) or (
            around_timestamp is not None
            and line_timestamp is not None
            and context_start is not None
            and context_end is not None
            and context_start <= line_timestamp <= context_end
        )
        lines.append(
            schemas.LogLineRead(
                lineNumber=starting_line + index,
                level=parse_log_level(line),
                timestamp=line_timestamp,
                correlationId=line_correlation_id,
                isContextMatch=is_context_match,
                content=line,
            )
        )

    # Correlation IDs are the most precise way to isolate one import attempt, so
    # prefer them when present and fall back to the timestamp window for older rows.
    if correlation_id and any(line.correlationId == correlation_id for line in lines):
        lines = [line for line in lines if line.correlationId == correlation_id]
    elif around_timestamp and any(line.isContextMatch for line in lines):
        lines = [line for line in lines if line.isContextMatch]

    return schemas.LogFileRead(filePath=str(path), lines=lines)
