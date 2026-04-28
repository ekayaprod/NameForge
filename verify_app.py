from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Route to block external fonts and tailwind CDN
    def handle_route(route):
        if any(domain in route.request.url for domain in ["fonts.googleapis.com", "fonts.gstatic.com"]):
            route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # Load the page
    page.goto("http://localhost:8000/index.html", wait_until="domcontentloaded")

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
    # We expect Gemini 2.0 Flash and Pro
    content = page.content()
    if "gemini-2.0-flash" in content:
        print("Gemini 2.0 Flash found in settings")
    else:
        print("Gemini 2.0 Flash NOT found")

    # Take screenshot of settings
    if not os.path.exists("verification"):
        os.makedirs("verification")
    page.screenshot(path="verification/settings.png")

    # Close settings
    page.click("text=Close")

    # Verify Mode Switching (Forge -> Harmonizer)
    print("Checking Forge mode...")
    assert page.is_visible("button[data-mode='forge'].active")

    print("Switching to Harmonizer mode...")
    page.click("button[data-mode='harmonizer']")

    # Verify switch
    page.wait_for_selector("button[data-mode='harmonizer'].active")
    assert page.is_visible("text=Harmonized Names")

    # Switch back to Forge mode for consistency
    print("Switching back to Forge mode...")
    page.click("button[data-mode='forge']")
    page.wait_for_selector("button[data-mode='forge'].active")

    # Verify History Modal
    page.click("text=History")
    page.screenshot(path="verification/history.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
