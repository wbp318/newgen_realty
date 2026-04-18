"""UI-test-only fixtures: verify the Next.js dev server is serving before tests run."""

import time

import httpx
import pytest


@pytest.fixture(scope="session", autouse=True)
def _wait_for_frontend(web_url: str) -> None:
    deadline = time.time() + 30
    last_err: Exception | None = None
    while time.time() < deadline:
        try:
            r = httpx.get(web_url, timeout=3.0, follow_redirects=True)
            if r.status_code < 500:
                return
        except Exception as e:  # noqa: BLE001 — readiness poll
            last_err = e
        time.sleep(0.5)
    pytest.exit(
        f"Frontend not reachable at {web_url} after 30s (last error: {last_err!r}). "
        "Run `npm run dev` in frontend/ first.",
        returncode=2,
    )


@pytest.fixture(autouse=True)
def _fail_on_console_errors(page, request):
    """Catch any unhandled frontend console errors during a UI test.

    Each test starts with a fresh page, so we can attach a listener and surface
    collected errors in the test's teardown. Tests that legitimately expect
    errors can opt out by requesting the `allow_console_errors` marker.
    """
    if request.node.get_closest_marker("allow_console_errors"):
        yield
        return

    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None,
    )
    yield
    # Filter out known-noisy messages (e.g., Next.js hydration warnings in dev).
    noisy = ("Hydration failed", "Download the React DevTools")
    real = [e for e in errors if not any(n in e for n in noisy)]
    assert not real, "console errors during test:\n  " + "\n  ".join(real)


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "allow_console_errors: opt out of the autouse console-error guard",
    )
