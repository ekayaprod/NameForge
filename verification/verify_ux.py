from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Load the page
    page.goto("http://localhost:8000/index.html")

    # Dismiss Welcome Modal
    try:
        welcome_btn = page.wait_for_selector("text=Use without API for now", timeout=5000)
        if welcome_btn:
            welcome_btn.click()
            print("Dismissed Welcome Modal")
            page.wait_for_timeout(500) # Wait for fade out
    except:
        print("Welcome modal not found or timed out")

    # Verify aria-pressed on Language Chips
    # We expect some chips to have aria-pressed="false"
    chips = page.locator(".chip[data-option]")
    count = chips.count()
    print(f"Found {count} chips")

    aria_pressed_found = False
    for i in range(count):
        chip = chips.nth(i)
        pressed = chip.get_attribute("aria-pressed")
        if pressed:
            print(f"Chip {chip.text_content()} has aria-pressed={pressed}")
            aria_pressed_found = True
        else:
            print(f"Chip {chip.text_content()} MISSING aria-pressed")

    if not aria_pressed_found:
        print("ERROR: No aria-pressed attributes found!")

    # Test Adding Custom Language via Enter key
    lang_input = page.locator("input[placeholder='Add a language...']")
    lang_input.fill("Elvish")
    lang_input.press("Enter")

    # Wait for toast
    try:
        page.wait_for_selector("text=Added Elvish!", timeout=2000)
        print("SUCCESS: Added Elvish via Enter key")
    except:
        print("ERROR: Toast 'Added Elvish!' not found")

    # Test Duplicate Language
    lang_input.fill("Elvish")
    lang_input.press("Enter")

    # Wait for error toast
    try:
        page.wait_for_selector("text=Language already exists.", timeout=2000)
        print("SUCCESS: Duplicate language blocked")
    except:
        print("ERROR: Toast 'Language already exists.' not found")

    # Take screenshot
    page.screenshot(path="verification/ux_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
