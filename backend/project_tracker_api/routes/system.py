from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health", summary="Health check")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
