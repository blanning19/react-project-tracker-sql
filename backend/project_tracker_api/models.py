from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Project(Base):
    __tablename__ = "projects"

    ProjectUID: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Task.TaskUID"
    )


class Task(Base):
    __tablename__ = "tasks"

    TaskUID: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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

    project: Mapped[Project] = relationship(back_populates="tasks")


class UserSetting(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    current_user_name: Mapped[str] = mapped_column(String(150), nullable=False, default="Ava Patel")
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="light")
    dashboard_sort_field: Mapped[str] = mapped_column(String(50), nullable=False, default="Finish")
    dashboard_sort_direction: Mapped[str] = mapped_column(String(10), nullable=False, default="asc")


class TeamMember(Base):
    __tablename__ = "team_members"

    member_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)


class Manager(Base):
    __tablename__ = "managers"

    manager_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
