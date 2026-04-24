from pathlib import Path
from subprocess import DEVNULL, CalledProcessError, check_output


REPO_ROOT = Path(__file__).resolve().parents[2]
PACKAGE_VERSION_FALLBACK = "0.1.0"


def _run_git_command(*args: str) -> str:
    return check_output(
        ["git", *args],
        cwd=REPO_ROOT,
        text=True,
        stderr=DEVNULL,
    ).strip()


def get_repo_version() -> str:
    try:
        return _run_git_command("describe", "--tags", "--abbrev=0")
    except CalledProcessError:
        try:
            return f"dev-{_run_git_command('rev-parse', '--short', 'HEAD')}"
        except CalledProcessError:
            return PACKAGE_VERSION_FALLBACK


def get_backend_version() -> str:
    return get_repo_version()
