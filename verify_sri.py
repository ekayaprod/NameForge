from playwright.sync_api import sync_playwright
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console messages
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # Capture request failures
    failed_requests = []
    page.on("requestfailed", lambda request: failed_requests.append(request.url))

    try:
        # Load the page
        page.goto("http://localhost:8000/index.html")
        page.wait_for_load_state("networkidle")

        # Check if Tailwind is loaded by checking computed style of body or an element
        app_element = page.locator("#app")
        computed_style = app_element.evaluate("el => window.getComputedStyle(el).padding")

        if computed_style == "0px" or computed_style == "":
            print("FAILURE: Tailwind CSS styles not applied (padding is 0px).")
            # Print console errors for diagnosis
            if console_errors:
                print("Console Errors:")
                for err in console_errors:
                    print(f"- {err}")
            if failed_requests:
                print("Failed Requests:")
                for url in failed_requests:
                    print(f"- {url}")
            sys.exit(1)
        else:
            print(f"SUCCESS: Tailwind CSS styles applied. Padding: {computed_style}")

        # Check for the script tag
        script_handle = page.query_selector('script[src="js/tailwindcss.js"]')
        if not script_handle:
            print("FAILURE: Local Tailwind script tag not found.")
            sys.exit(1)
        else:
            print("SUCCESS: Found local Tailwind script: js/tailwindcss.js")

        # Ensure no external Tailwind script
        external_script = page.query_selector('script[src*="cdn.tailwindcss.com"]')
        if external_script:
            print("FAILURE: Found external Tailwind script (should be removed).")
            sys.exit(1)
        else:
            print("SUCCESS: No external Tailwind script found.")

        # Check for console errors related to integrity
        sri_errors = [msg for msg in console_errors if "integrity" in msg.lower() or "subresource" in msg.lower()]
        if sri_errors:
            print("FAILURE: Console errors related to SRI found:")
            for err in sri_errors:
                print(f"- {err}")
            sys.exit(1)

        print("Verification passed!")

    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
