from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8000/index.html")

    # Wait for initial load
    page.wait_for_timeout(1000)

    print("Dismissing welcome modal...")
    # Dismiss Welcome Modal if present
    try:
        page.click("text=Use without API for now", timeout=2000)
    except:
        print("Welcome modal not found or already dismissed")

    print("Simulating loading state...")
    # Simulate loading state via console
    page.evaluate("""async () => {
        const { appState } = await import('./js/state.js');
        const { updateResultsPanel } = await import('./js/ui/render.js');
        appState.isLoading = true;
        appState.results = [];
        updateResultsPanel();
    }""")

    page.wait_for_timeout(500)

    # Check for loading skeleton
    loader = page.query_selector("#initial-loader")
    if loader:
        print("SUCCESS: Initial loader found")

        # Check for pulse animation class
        pulse_text = page.query_selector(".animate-pulse")
        if pulse_text:
            print("SUCCESS: Pulse animation class found")
        else:
            print("ERROR: Pulse animation class NOT found")

        # Check for spinner
        spinner = page.query_selector(".spinner")
        if spinner:
            print("SUCCESS: Spinner found")
        else:
            print("ERROR: Spinner NOT found")

    else:
        print("ERROR: Initial loader NOT found")

    # Take screenshot
    page.screenshot(path="verification/polish_verification.png")

    # Reset state
    page.evaluate("""async () => {
        const { appState } = await import('./js/state.js');
        const { updateResultsPanel } = await import('./js/ui/render.js');
        appState.isLoading = false;
        updateResultsPanel();
    }""")

    browser.close()

with sync_playwright() as p:
    run(p)
