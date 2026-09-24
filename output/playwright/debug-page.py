from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "playwright"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:5173/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.on("console", lambda m: print("CONSOLE", m.type, m.text))
    page.on("pageerror", lambda e: print("PAGEERROR", e))
    page.goto(URL, wait_until="networkidle", timeout=30000)
    print("TITLE", page.title())
    print("HTML", page.content()[:1500])
    page.screenshot(path=str(OUT / "debug.png"))
    browser.close()
