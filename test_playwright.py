import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        errors = []
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))
        
        # Go to login
        await page.goto("http://127.0.0.1:8080/login.html")
        await page.wait_for_timeout(1000)
        
        # Login
        await page.fill("#email", "admin@mitaoe.ac.in")
        await page.fill("#password", "admin123")
        await page.click("button[type=submit]")
        
        # Wait for navigation
        await page.wait_for_timeout(2000)
        
        print("Current URL:", page.url)
        
        pages_to_test = [
            "/admin/departments.html",
            "/admin/users.html",
            "/admin/courses.html",
            "/admin/config.html",
            "/faculty/dashboard.html",
            "/faculty/attainment.html",
            "/faculty/marks.html",
            "/faculty/course_setup.html"
        ]
        
        all_errors = {}
        for p in pages_to_test:
            url = f"http://127.0.0.1:8080{p}"
            print(f"Testing {url} ...")
            errors.clear()
            await page.goto(url)
            await page.wait_for_timeout(1500)
            if errors:
                all_errors[url] = list(errors)
        
        if all_errors:
            print("\n--- PAGE ERRORS ---")
            for url, errs in all_errors.items():
                print(f"\n{url}:")
                for e in errs:
                    print(e)
        else:
            print("\nNo page errors recorded on any pages.")
            
        await browser.close()

asyncio.run(run())
