from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .config import get_settings
from .database import Base

DEFAULT_USER_NAME = get_settings().default_user_name


def utc_now_naive() -> datetime:
    """Return a UTC timestamp without tzinfo to match the current DateTime column."""
    return datetime.now(UTC).replace(tzinfo=None)


class Project(Base):
    __tablename__ = "projects"

    # Let the database assign project IDs so concurrent creates cannot race on
    # application-side MAX()+1 logic.
    ProjectUID: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    ProjectName: Mapped[str] = mapped_column(String(255), nullable=False)
    ProjectManager: Mapped[str] = mapped_column(String(150), nullable=False)
    CreatedDate: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    CalendarName: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    Start: Mapped[date] = mapped_column(Date, nullable=False)
    Finish: Mapped[date] = mapped_column(Date, nullable=False)
    DurationDays: Mapped[int] = mapped_column(Integer, nullable=False)
    PercentComplete: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    Status: Mapped[str] = mapped_column(String(50), nullable=False, default="Not Started")
    Priority: Mapped[str] = mapped_column(String(30), nullable=False, default="Medium")
    Notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    SourceFileName: Mapped[str] = mapped_column(String(255), nullable=False)
    PlannerImportMetadata: Mapped[str] = mapped_column(Text, nullable=False, default="")

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Task.TaskUID"
    )


class Task(Base):
    __tablename__ = "tasks"

    # Task IDs are also database-generated for the same reason as ProjectUID:
    # the DB is the only safe coordinator when multiple writers exist.
    TaskUID: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    ProjectUID: Mapped[int] = mapped_column(
        ForeignKey("projects.ProjectUID", ondelete="CASCADE"), nullable=False, index=True
    )
    TaskName: Mapped[str] = mapped_column(String(255), nullable=False)
    OutlineLevel: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    OutlineNumber: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    WBS: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    IsSummary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    Predecessors: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ResourceNames: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    Start: Mapped[date] = mapped_column(Date, nullable=False)
    Finish: Mapped[date] = mapped_column(Date, nullable=False)
    DurationDays: Mapped[int] = mapped_column(Integer, nullable=False)
    PercentComplete: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    Status: Mapped[str] = mapped_column(String(50), nullable=False, default="Not Started")
    IsMilestone: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    Notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    BucketName: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    LabelsJson: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    ChecklistItemsJson: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    CompletedChecklistItemsJson: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    project: Mapped[Project] = relationship(back_populates="tasks")


class UserSetting(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    current_user_name: Mapped[str] = mapped_column(String(150), nullable=False, default=DEFAULT_USER_NAME)
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="light")
    dashboard_sort_field: Mapped[str] = mapped_column(String(50), nullable=False, default="Finish")
    dashboard_sort_direction: Mapped[str] = mapped_column(String(10), nullable=False, default="asc")


class TeamMember(Base):
    __tablename__ = "team_members"

    member_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)


class Manager(Base):
    __tablename__ = "managers"

    manager_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)


class ImportEvent(Base):
    __tablename__ = "import_events"

    import_event_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now_naive)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    source_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    imported_by: Mapped[str] = mapped_column(String(150), nullable=False, default="Unknown")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Succeeded")
    project_uid: Mapped[int | None] = mapped_column(
        ForeignKey("projects.ProjectUID", ondelete="SET NULL"),
        nullable=True,
    )
    project_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    task_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    failure_reason: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    technical_details: Mapped[str] = mapped_column(Text, nullable=False, default="")


class UserAccess(Base):
    __tablename__ = "user_access"

    user_name: Mapped[str] = mapped_column(String(150), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="Viewer")
    can_view_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_view_logs: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
