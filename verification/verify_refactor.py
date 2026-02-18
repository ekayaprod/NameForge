from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to app...")
    page.goto("http://localhost:8000/index.html")

    # Wait for initial load
    print("Waiting for Generate button...")
    page.wait_for_selector("button:has-text('Generate Names')")

    # Dismiss welcome modal if present
    if page.is_visible("#welcome-modal"):
        print("Dismissing welcome modal...")
        page.click("button:has-text('Use without API for now')")

    # Check if Forge mode is active (default)
    print("Checking Forge mode...")
    assert page.is_visible("button[data-mode='forge'].active")

    # Switch to Harmonizer mode
    print("Switching to Harmonizer mode...")
    page.click("button[data-mode='harmonizer']")

    # Verify switch
    page.wait_for_selector("button[data-mode='harmonizer'].active")
    assert page.is_visible("text=Harmonized Names")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/refactor_verified.png")

    browser.close()
    print("Verification complete!")

with sync_playwright() as playwright:
    run(playwright)
