from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Load the page
    page.goto("http://localhost:8000/index.html")

    # Wait for the Welcome Modal and click "Use without API" to dismiss it
    # Because it blocks the Settings button
    try:
        welcome_btn = page.wait_for_selector("text=Use without API for now", timeout=5000)
        if welcome_btn:
            welcome_btn.click()
            print("Dismissed Welcome Modal")
            page.wait_for_timeout(500) # Wait for fade out
    except:
        print("Welcome modal not found or timed out")

    # Check for Settings button
    page.click("text=Settings")

    # Verify Model Dropdown options
    # We expect Gemini 1.5 Flash and Pro
    content = page.content()
    if "gemini-1.5-flash" in content:
        print("Gemini 1.5 Flash found in settings")
    else:
        print("Gemini 1.5 Flash NOT found")

    # Take screenshot of settings
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")
    page.screenshot(path="/home/jules/verification/settings.png")

    # Close settings
    page.click("text=Close")

    # Verify History Modal
    page.click("text=History")
    page.screenshot(path="/home/jules/verification/history.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
