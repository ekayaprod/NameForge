from playwright.sync_api import sync_playwright
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    violations = []

    def handle_console(msg):
        # Filter for CSP messages
        if "Content Security Policy" in msg.text or "CSP Violation" in msg.text:
            violations.append(f"Console: {msg.text}")
        # Also catch script errors which might happen if eval is blocked
        if "EvalError" in msg.text:
             violations.append(f"Console Error: {msg.text}")

    page.on("console", handle_console)
    page.on("pageerror", lambda err: violations.append(f"PageError: {err}"))

    # Inject listener before navigation
    page.add_init_script("""
        document.addEventListener('securitypolicyviolation', (e) => {
            console.error('CSP Violation: ' + e.blockedURI + ' (' + e.violatedDirective + ')');
        });
    """)

    try:
        page.goto("http://localhost:8000/index.html")
        page.wait_for_timeout(3000)

        # Check if Tailwind applied styles
        # #app has class "min-h-screen" -> min-height: 100vh
        # We can check if min-height is not '0px'
        min_height = page.eval_on_selector("#app", "el => window.getComputedStyle(el).minHeight")
        print(f"App min-height: {min_height}")

        if min_height == "0px" or min_height == "auto":
             print("WARNING: Tailwind styles might not be applied.")

    except Exception as e:
        print(f"Error during execution: {e}")

    browser.close()

    if violations:
        print("CSP Violations Found:")
        for v in violations:
            print(v)
        sys.exit(1)
    else:
        print("No CSP Violations Found")

with sync_playwright() as playwright:
    run(playwright)
