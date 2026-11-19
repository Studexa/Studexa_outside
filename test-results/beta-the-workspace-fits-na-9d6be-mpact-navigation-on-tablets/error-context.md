# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: beta.spec.ts >> the workspace fits narrow phones and uses compact navigation on tablets
- Location: e2e\beta.spec.ts:51:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - generic [ref=f1e5]:
    - generic [ref=f1e6]: Studexa
    - paragraph [ref=f1e32]: Every small review grows your memory — and your buddy.
    - list [ref=f1e33]:
      - listitem [ref=f1e34]: Spaced review that remembers for you
      - listitem [ref=f1e37]: Streaks, XP, and coins that make progress visible
      - listitem [ref=f1e40]: Your study data stays with your account
  - generic [ref=f1e43]:
    - generic [ref=f1e44]:
      - generic [ref=f1e45]: Studexa
      - button "Switch language" [ref=f1e50] [cursor=pointer]: ខ្មែរ
    - generic [ref=f1e51]:
      - heading "Create your account" [level=1] [ref=f1e52]
      - paragraph [ref=f1e53]: Start with a free account. Your streak begins today.
      - generic [ref=f1e54]:
        - generic [ref=f1e55]:
          - generic [ref=f1e56]: Nickname
          - textbox "Nickname" [ref=f1e57]:
            - /placeholder: e.g. Sokha
        - generic [ref=f1e58]:
          - generic [ref=f1e59]: Email
          - textbox "Email" [ref=f1e60]:
            - /placeholder: you@example.com
        - generic [ref=f1e61]:
          - generic [ref=f1e62]: Password
          - generic [ref=f1e63]:
            - textbox "Password" [ref=f1e64]:
              - /placeholder: At least 8 characters
            - button "Show password" [ref=f1e65] [cursor=pointer]
        - generic [ref=f1e66]:
          - text: Invite code
          - textbox "Invite code" [ref=f1e67]
        - generic [ref=f1e68]:
          - checkbox "I am at least 18 years old." [ref=f1e69]
          - text: I am at least 18 years old.
        - button "Create account" [ref=f1e70] [cursor=pointer]
      - paragraph [ref=f1e73]:
        - text: Already have an account?
        - link "Sign in" [ref=f1e74] [cursor=pointer]:
          - /url: /login
```

# Test source

```ts
  1   | import { execFileSync } from 'node:child_process'
  2   | import { randomUUID } from 'node:crypto'
  3   | import { fileURLToPath } from 'node:url'
  4   | import { expect, test, type Page } from '@playwright/test'
  5   | 
  6   | const password = 'Local-test-password-729'
  7   | const inviteScript = fileURLToPath(new URL('../../scripts/beta-invites.mjs', import.meta.url))
  8   | 
  9   | async function register(page: Page, nickname: string) {
  10  |   if (!process.env.PGDATABASE?.endsWith('_test')) throw new Error('Use a dedicated database ending in _test.')
  11  |   const email = `${randomUUID()}@example.test`
  12  |   const invite = execFileSync(process.execPath, [inviteScript, 'issue', email], { encoding: 'utf8' }).trim()
  13  |   await page.goto('/register')
  14  |   await page.locator('#nickname').fill(nickname)
  15  |   await page.locator('#email').fill(email)
  16  |   await page.locator('#password').fill(password)
  17  |   await page.getByLabel('Invite code').fill(invite)
  18  |   await page.getByRole('checkbox', { name: 'I am at least 18 years old.' }).check()
> 19  |   const registered = page.waitForResponse((response) => response.url().endsWith('/auth/register') && response.status() === 201)
      |                           ^ Error: page.waitForResponse: Test timeout of 90000ms exceeded.
  20  |   await page.getByRole('button', { name: 'Create account' }).click()
  21  |   const { accessToken } = await (await registered).json()
  22  |   await page.waitForURL('**/onboarding')
  23  |   await page.getByRole('button', { name: 'Skip' }).click()
  24  |   await expect(page).toHaveURL(/\/$/)
  25  |   return { email, accessToken }
  26  | }
  27  | 
  28  | test('the root route opens the sign-in form in a fresh browser session', async ({ page }) => {
  29  |   await page.goto('/')
  30  |   await expect(page).toHaveURL(/\/login$/)
  31  |   await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  32  |   await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  33  |   await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  34  |   await page.getByRole('button', { name: 'Show password' }).click()
  35  |   await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  36  |   await page.getByRole('button', { name: 'Hide password' }).click()
  37  |   await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
  38  | })
  39  | 
  40  | test('the study queue can recover from a failed deck request', async ({ page }) => {
  41  |   await register(page, 'Sophea')
  42  |   await page.route('**/api/v1/decks', (route) => route.fulfill({ status: 503 }))
  43  |   await page.goto('/study')
  44  |   const queue = page.getByRole('region', { name: 'Review queue' })
  45  |   await expect(queue.getByText("We couldn't load your decks.")).toBeVisible({ timeout: 15_000 })
  46  |   await page.unroute('**/api/v1/decks')
  47  |   await queue.getByRole('button', { name: 'Retry' }).click()
  48  |   await expect(queue.getByRole('link', { name: 'Create deck' })).toBeVisible()
  49  | })
  50  | 
  51  | test('the workspace fits narrow phones and uses compact navigation on tablets', async ({ page }) => {
  52  |   await register(page, 'Responsive learner')
  53  |   await page.evaluate(() => {
  54  |     localStorage.setItem('lang', 'km')
  55  |     localStorage.setItem('studexa_settings', JSON.stringify({ fontSize: 'lg' }))
  56  |   })
  57  |   await page.setViewportSize({ width: 280, height: 640 })
  58  |   await page.goto('/plan')
  59  |   await expect(page.locator('html')).toHaveAttribute('lang', 'km')
  60  |   await expect(page.locator('.study-bottom-bar')).toBeInViewport({ ratio: 1 })
  61  |   await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(280)
  62  |   await page.locator('.mobile-more summary').click()
  63  |   await expect(page.locator('.study-more-menu')).toBeInViewport({ ratio: 1 })
  64  |   await page.keyboard.press('Escape')
  65  |   await expect(page.locator('.mobile-more summary')).toBeFocused()
  66  | 
  67  |   await page.setViewportSize({ width: 820, height: 1180 })
  68  |   await page.goto('/')
  69  |   await expect(page.locator('.study-bottom-bar')).toBeHidden()
  70  |   await expect.poll(() => page.locator('.study-sidebar').evaluate((sidebar) => sidebar.clientWidth)).toBeLessThan(100)
  71  |   await expect.poll(() => page.locator('.study-dashboard-grid').evaluate((grid) =>
  72  |     getComputedStyle(grid).gridTemplateColumns.split(' ').length,
  73  |   )).toBe(2)
  74  | })
  75  | 
  76  | test('invited students can save study data, use AI samples, and switch accounts', async ({ browser, baseURL }) => {
  77  |   const mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  78  |   const desktop = await browser.newContext({ baseURL, serviceWorkers: 'block' })
  79  |   try {
  80  |     const learner = await mobile.newPage()
  81  |     const first = await register(learner, 'Dara')
  82  |     await learner.goto('/notes')
  83  |     await learner.getByRole('button', { name: 'New note' }).first().click()
  84  |     await learner.waitForURL('**/notes/*')
  85  |     const noteId = learner.url().split('/').at(-1)!
  86  |     const title = 'Private study note'
  87  |     const saved = learner.waitForResponse((response) => response.url().endsWith(`/notes/${noteId}`)
  88  |       && response.request().method() === 'PUT' && response.ok())
  89  |     await learner.getByLabel('Note title').fill(title)
  90  |     await saved
  91  |     await learner.reload()
  92  |     await expect(learner.getByLabel('Note title')).toHaveValue(title)
  93  | 
  94  |     const second = await desktop.newPage()
  95  |     await second.goto('/login')
  96  |     await second.locator('#email').fill(first.email)
  97  |     await second.locator('#password').fill(password)
  98  |     await second.getByRole('button', { name: 'Sign in' }).click()
  99  |     await expect(second).toHaveURL(/\/$/)
  100 |     await second.goto(`/notes/${noteId}`)
  101 |     await expect(second.getByLabel('Note title')).toHaveValue(title)
  102 |     await second.goto('/settings')
  103 |     await second.getByRole('button', { name: 'Sign out' }).click()
  104 |     await expect(second).toHaveURL(/\/login$/)
  105 |     const other = await register(second, 'Bopha')
  106 |     await second.goto('/notes')
  107 |     await expect(second.getByText(title)).toHaveCount(0)
  108 |     const denied = await second.request.get(`/api/v1/notes/${noteId}`, {
  109 |       headers: { Authorization: `Bearer ${other.accessToken}` },
  110 |     })
  111 |     expect(denied.status()).toBe(404)
  112 | 
  113 |     await learner.route('**/api/v1/ai/samples/tutor', async (route) => {
  114 |       expect(route.request().postDataJSON()).toEqual({ sampleId: 'water-cycle-en', promptId: 'explain' })
  115 |       await route.fulfill({
  116 |         json: { answer: 'Clouds form from liquid droplets.', references: [{ title: 'The water cycle', excerpt: 'it condenses into tiny liquid droplets that form clouds' }] },
  117 |       })
  118 |     })
  119 |     await learner.route('**/api/v1/ai/samples/generate', async (route) => {
```