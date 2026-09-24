"""Browser smoke test for LearnBash UI."""

from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "playwright"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:5187/"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(URL, wait_until="networkidle", timeout=30000)

        # App shell rendered
        assert page.locator(".brand").inner_text() == "LearnBash"
        assert page.locator("#tree-svg").count() == 1
        assert page.locator("#pipe-svg").count() == 1

        # Type a command
        inp = page.locator(".terminal-input")
        inp.click()
        inp.fill("pwd")
        inp.press("Enter")
        page.wait_for_timeout(200)
        screen = page.locator(".terminal-screen").inner_text()
        assert "/home/learner" in screen, screen
        # Focus stays in the input
        assert page.evaluate("() => document.activeElement.classList.contains('terminal-input')")

        # History
        inp.press("ArrowUp")
        assert inp.input_value() == "pwd"
        inp.fill("")

        # Tab completes one word
        inp.fill("ech")
        inp.press("Tab")
        val = inp.input_value()
        assert val.startswith("echo") and "hello" not in val, val

        # Open levels and start one
        page.locator("#btn-levels").click()
        page.wait_for_timeout(150)
        assert page.locator(".level-row").count() > 5
        page.locator(".level-row", has_text="Where am I?").first.click()
        page.wait_for_timeout(200)
        assert "Where am I?" in page.locator("#level-title").inner_text()
        if page.locator("#modal:not(.hidden)").count():
            page.locator("#modal-close").click()
            page.wait_for_timeout(100)

        # Solve via terminal
        inp = page.locator(".terminal-input")
        inp.click()
        inp.fill("pwd")
        inp.press("Enter")
        page.wait_for_timeout(300)
        title = page.locator("#modal-title").inner_text()
        body = page.locator("#modal-body").inner_text()
        assert "complete" in title.lower() or "CLEARED" in body, (title, body)
        assert "LinkedIn" in body

        # Neon current step exists on a later level checklist
        page.locator("#modal-close").click()
        page.locator("#btn-levels").click()
        page.locator(".level-row", has_text="First pipe").first.click()
        page.wait_for_timeout(200)
        if page.locator("#modal:not(.hidden)").count():
            page.locator("#modal-close").click()
            page.wait_for_timeout(100)
        assert page.locator(".goal-list li.current").count() >= 1
        page.screenshot(path=str(OUT / "learnbash-level.png"), full_page=True)

        # Sandbox reset
        page.locator("#btn-sandbox").click()
        page.wait_for_timeout(150)
        assert "sandbox" in page.locator("#mode-label").inner_text().lower()

        page.screenshot(path=str(OUT / "learnbash-sandbox.png"), full_page=True)
        browser.close()
        print("UI SMOKE OK", OUT)


if __name__ == "__main__":
    main()
