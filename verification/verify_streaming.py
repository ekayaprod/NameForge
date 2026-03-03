from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8000/index.html")

    # Wait for initial load
    page.wait_for_timeout(1000)

    # Dismiss Welcome Modal if present
    try:
        page.click("text=Use without API for now", timeout=2000)
    except:
        pass

    # Simulate streaming markdown state via console
    page.evaluate("""async () => {
        const { appState } = await import('./js/state.js');
        const { updateResultsPanel } = await import('./js/ui/render.js');
        appState.isLoading = true;
        appState.results = [];
        appState.rawApiResponse = "```json\\n[\\n  {\\n    \\"name\\": \\"Aethelgard\\"\\n  }\\n";
        updateResultsPanel();
    }""")

    page.wait_for_timeout(500)

    # Take screenshot of the streaming state
    page.screenshot(path="verification/streaming_markdown.png")

    # Reset state
    page.evaluate("""async () => {
        const { appState } = await import('./js/state.js');
        const { updateResultsPanel } = await import('./js/ui/render.js');
        appState.isLoading = false;
        appState.rawApiResponse = null;
        updateResultsPanel();
    }""")

    browser.close()

with sync_playwright() as p:
    run(p)
