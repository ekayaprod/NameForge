from playwright.sync_api import sync_playwright
import os
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Create a flag to check if an alert was triggered
    alert_triggered = False
    def handle_dialog(dialog):
        nonlocal alert_triggered
        print(f"Dialog triggered: {dialog.message}")
        alert_triggered = True
        dialog.dismiss()

    page.on("dialog", handle_dialog)

    # Route to block external fonts
    def handle_route(route):
        if any(domain in route.request.url for domain in ["fonts.googleapis.com", "fonts.gstatic.com"]):
            route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # Load the page, wait only for DOMContentLoaded to avoid hanging on external resources
    print("Navigating to page...")
    page.goto("http://localhost:8000/index.html", wait_until="domcontentloaded")
    print("Page loaded.")

    # Dismiss Welcome Modal
    try:
        welcome_btn = page.wait_for_selector("text=Use without API for now", timeout=5000)
        if welcome_btn:
            welcome_btn.click()
            page.wait_for_timeout(500)
    except:
        print("Welcome modal not found.")

    # Attempt XSS via "Add a language"
    # Using a payload that should be visible in the DOM
    xss_payload = "<b>Injection</b><img src=x onerror=window.xss_executed=true>"

    print(f"Injecting payload: {xss_payload}")
    lang_input = page.wait_for_selector("input[placeholder='Add a language...']")
    lang_input.fill(xss_payload)

    add_btn = page.wait_for_selector("button:has-text('Add')")
    add_btn.click()

    # Wait a bit
    print("Waiting...")
    page.wait_for_timeout(2000)

    # Check if the payload is rendered as HTML or text
    # If it's innerHTML, <b>Injection</b> should be an element.
    # If it's textContent, the literal string "<b>Injection</b>..." should be visible.

    is_html = page.evaluate("""() => {
        const chips = Array.from(document.querySelectorAll('.chip'));
        return chips.some(c => c.querySelector('b') && c.querySelector('b').textContent === 'Injection');
    }""")

    if is_html:
        print("VULNERABILITY CONFIRMED: Payload rendered as HTML!")
    else:
        print("VULNERABILITY NOT CONFIRMED: Payload not rendered as HTML.")

    browser.close()

    if is_html:
        sys.exit(1)
    else:
        sys.exit(0)

with sync_playwright() as playwright:
    run(playwright)
