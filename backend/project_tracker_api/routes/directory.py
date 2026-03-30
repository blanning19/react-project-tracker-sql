from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(tags=["directory"])


@router.get("/api/team-members", response_model=list[schemas.TeamMemberRead], summary="List team members")
def list_team_members(db: Session = Depends(get_db)):
    return crud.get_team_members(db)


@router.get("/api/managers", response_model=list[schemas.ManagerRead], summary="List managers")
def list_managers(db: Session = Depends(get_db)):
    return crud.get_managers(db)
