import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const password = 'Local-test-password-729'
const inviteScript = fileURLToPath(new URL('../../scripts/beta-invites.mjs', import.meta.url))

async function register(page: Page, nickname: string) {
  if (!process.env.PGDATABASE?.endsWith('_test')) throw new Error('Use a dedicated database ending in _test.')
  const email = `${randomUUID()}@example.test`
  const invite = execFileSync(process.execPath, [inviteScript, 'issue', email], { encoding: 'utf8' }).trim()
  await page.goto('/register')
  await page.locator('#nickname').fill(nickname)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByLabel('Invite code').fill(invite)
  await page.getByRole('checkbox', { name: 'I am at least 18 years old.' }).check()
  const registered = page.waitForResponse((response) => response.url().endsWith('/auth/register') && response.status() === 201)
  await page.getByRole('button', { name: 'Create account' }).click()
  const { accessToken } = await (await registered).json()
  await page.waitForURL('**/onboarding')
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/$/)
  return { email, accessToken }
}

test('the root route opens the sign-in form in a fresh browser session', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
})

test('the study queue can recover from a failed deck request', async ({ page }) => {
  await register(page, 'Sophea')
  await page.route('**/api/v1/decks', (route) => route.fulfill({ status: 503 }))
  await page.goto('/study')
  const queue = page.getByRole('region', { name: 'Review queue' })
  await expect(queue.getByText("We couldn't load your decks.")).toBeVisible({ timeout: 15_000 })
  await page.unroute('**/api/v1/decks')
  await queue.getByRole('button', { name: 'Retry' }).click()
  await expect(queue.getByRole('link', { name: 'Create deck' })).toBeVisible()
})

test('the workspace fits narrow phones and uses compact navigation on tablets', async ({ page }) => {
  await register(page, 'Responsive learner')
  await page.evaluate(() => {
    localStorage.setItem('lang', 'km')
    localStorage.setItem('studexa_settings', JSON.stringify({ fontSize: 'lg' }))
  })
  await page.setViewportSize({ width: 280, height: 640 })
  await page.goto('/plan')
  await expect(page.locator('html')).toHaveAttribute('lang', 'km')
  expect(await page.evaluate(async () => (await document.fonts.load('600 16px "Noto Sans Khmer"', 'ខ្មែរ')).length)).toBeGreaterThan(0)
  await expect(page.locator('.study-bottom-bar')).toBeInViewport({ ratio: 1 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(280)
  await page.locator('.mobile-more summary').click()
  await expect(page.locator('.study-more-menu')).toBeInViewport({ ratio: 1 })
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-more summary')).toBeFocused()

  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/')
  await expect(page.locator('.study-bottom-bar')).toBeHidden()
  await expect(page.locator('.study-date')).toContainText(/[ក-អ]/)
  await expect.poll(() => page.locator('.study-sidebar').evaluate((sidebar) => sidebar.clientWidth)).toBeLessThan(100)
  await expect.poll(() => page.locator('.study-dashboard-grid').evaluate((grid) =>
    getComputedStyle(grid).gridTemplateColumns.split(' ').length,
  )).toBe(2)
})

test('invited students can save study data, use AI samples, and switch accounts', async ({ browser, baseURL }) => {
  const mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  const desktop = await browser.newContext({ baseURL, serviceWorkers: 'block' })
  try {
    const learner = await mobile.newPage()
    const first = await register(learner, 'Dara')
    await learner.goto('/notes')
    await learner.getByRole('button', { name: 'New note' }).first().click()
    await learner.waitForURL('**/notes/*')
    const noteId = learner.url().split('/').at(-1)!
    const title = 'Private study note'
    const saved = learner.waitForResponse((response) => response.url().endsWith(`/notes/${noteId}`)
      && response.request().method() === 'PUT' && response.ok())
    await learner.getByLabel('Note title').fill(title)
    await saved
    await learner.reload()
    await expect(learner.getByLabel('Note title')).toHaveValue(title)

    const second = await desktop.newPage()
    await second.goto(`/notes/${noteId}`)
    await expect(second).toHaveURL(/\/login$/)
    await second.locator('#email').fill(first.email)
    await second.locator('#password').fill(password)
    await second.getByRole('button', { name: 'Sign in' }).click()
    await expect(second).toHaveURL(new RegExp('/notes/' + noteId + '$'))
    await expect(second.getByLabel('Note title')).toHaveValue(title)
    await second.goto('/settings')
    await second.getByRole('button', { name: 'Sign out' }).click()
    await expect(second).toHaveURL(/\/login$/)
    const other = await register(second, 'Bopha')
    await second.goto('/notes')
    await expect(second.getByText(title)).toHaveCount(0)
    const denied = await second.request.get(`/api/v1/notes/${noteId}`, {
      headers: { Authorization: `Bearer ${other.accessToken}` },
    })
    expect(denied.status()).toBe(404)

    await learner.route('**/api/v1/ai/samples/tutor', async (route) => {
      expect(route.request().postDataJSON()).toEqual({ sampleId: 'water-cycle-en', promptId: 'explain' })
      await route.fulfill({
        json: { answer: 'Clouds form from liquid droplets.', references: [{ title: 'The water cycle', excerpt: 'it condenses into tiny liquid droplets that form clouds' }] },
      })
    })
    await learner.route('**/api/v1/ai/samples/generate', async (route) => {
      const data = route.request().postDataJSON()
      expect(Object.keys(data).sort()).toEqual(['count', 'sampleId', 'task'])
      const quiz = data.task === 'QUIZ'
      expect(data.sampleId).toBe(quiz ? 'water-cycle-km' : 'water-cycle-en')
      await route.fulfill({
        json: {
          items: [{
            type: quiz ? 'MULTIPLE_CHOICE' : 'BASIC',
            front: quiz ? 'តើពពកកើតពីអ្វី?' : 'How do clouds form?',
            back: quiz ? 'ដំណក់ទឹក' : 'Water vapor condenses.',
            choices: quiz ? ['ដំណក់ទឹក', 'ខ្សាច់', 'ថ្ម'] : [],
            explanation: null,
            sourceTitle: quiz ? 'វដ្តទឹក' : 'The water cycle',
            sourceExcerpt: null,
          }],
        },
      })
    })

    await learner.getByRole('button', { name: 'AI tutor' }).click()
    const tutor = learner.getByRole('dialog')
    await tutor.getByRole('button', { name: 'Ask Gemini' }).click()
    await expect(tutor.getByText('Clouds form from liquid droplets.')).toBeVisible()
    await expect(tutor.locator('blockquote')).toContainText('tiny liquid droplets')
    await tutor.getByRole('button', { name: 'Close' }).click()

    await learner.goto('/')
    await learner.getByRole('link', { name: 'Create deck' }).click()
    await expect(learner.getByRole('dialog', { name: 'New deck' })).toBeVisible()
    await learner.getByLabel('Deck name').fill('Water cycle study deck')
    await learner.getByRole('button', { name: 'Create deck' }).click()
    await expect(learner.getByRole('heading', { name: 'Water cycle study deck' })).toBeVisible()
    await learner.getByRole('button', { name: 'Generate cards' }).click()
    const generator = learner.getByRole('dialog')
    await generator.getByRole('button', { name: 'Generate cards' }).click()
    await expect(generator.getByText('How do clouds form?')).toBeVisible()
    await generator.getByRole('button', { name: /Add.*1|Add selected/i }).click()
    await expect(learner.getByText('How do clouds form?')).toBeVisible()

    await learner.goto('/')
    await expect(learner.getByText('1 card due', { exact: true })).toBeVisible()
    await learner.getByRole('link', { name: 'Start review' }).click()
    await expect(learner).toHaveURL(/\/study\/review$/)
    const flashcard = learner.getByRole('button', { name: 'Flip the flashcard' })
    await expect(learner.getByRole('button', { name: /^Good/ })).toHaveCount(0)
    await flashcard.press('Space')
    await expect(flashcard).toHaveAttribute('aria-pressed', 'true')
    await expect(learner.getByText('Water vapor condenses.')).toBeVisible()
    await learner.setViewportSize({ width: 667, height: 375 })
    await expect(learner.getByRole('button', { name: /^Good/ })).toBeInViewport({ ratio: 1 })
    await expect.poll(() => learner.locator('.review-answer-content').evaluate((answer) =>
      answer.getBoundingClientRect().bottom < document.querySelector('.review-action-tray')!.getBoundingClientRect().top,
    )).toBe(true)
    await learner.setViewportSize({ width: 390, height: 844 })
    await learner.route('**/api/v1/review/answer', (route) => route.fulfill({ status: 503 }), { times: 1 })
    await learner.keyboard.press('3')
    await expect(learner.getByRole('alert')).toHaveText("We couldn't save that rating. Try again.")
    await expect(flashcard).toHaveAttribute('aria-pressed', 'true')
    const review = learner.waitForResponse((response) => response.url().endsWith('/review/answer') && response.ok())
    await learner.keyboard.press('3')
    await review
    await expect(learner.getByRole('heading', { name: 'You showed up today' })).toBeFocused()
    await expect(learner.getByText('cards reviewed', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible()
    await learner.getByRole('link', { name: 'Back to home' }).click()
    await expect(learner.getByText("You're caught up", { exact: true })).toBeVisible()
    await expect(learner.getByRole('link', { name: 'Browse decks' })).toBeVisible()
    await expect(learner.getByText(/^1 of \d+ cards$/)).toBeVisible()
    await learner.reload()
    await expect(learner.getByRole('region', { name: "Today's goal" }).getByText(/^1 of \d+ cards$/)).toBeVisible()
    await second.goto('/')
    await expect(second.getByRole('region', { name: "Today's goal" }).getByText(/^0 of \d+ cards$/)).toBeVisible()
    await learner.goto('/stats')
    await expect(learner.getByRole('heading', { name: 'Flashcards by subject' })).toBeVisible()
    await expect(learner.getByRole('listitem').filter({ hasText: 'Uncategorized' })).toContainText('1 card')

    await learner.goto('/plan')
    await expect(learner.getByText(/^1 of \d+ cards$/)).toBeVisible()
    await learner.getByRole('button', { name: 'Add task' }).first().click()
    const planner = learner.getByRole('dialog')
    await planner.getByLabel('Task').fill('Review the water cycle')
    await planner.getByRole('button', { name: 'Add task' }).click()
    await expect(learner.getByText('Review the water cycle')).toBeVisible()
    await learner.getByRole('button', { name: 'Add exam' }).first().click()
    const exam = learner.getByRole('dialog')
    await exam.getByLabel('Exam title').fill('Water cycle exam')
    const localDate = await learner.evaluate(() => {
      const now = new Date()
      return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    })
    await exam.locator('input[type="date"]').fill(localDate)
    await exam.getByRole('button', { name: 'Add exam' }).click()
    await expect(learner.getByText('Water cycle exam', { exact: true }).first()).toBeVisible()
    await learner.reload()
    await expect(learner.getByText('Review the water cycle')).toBeVisible()
    await expect(learner.getByText('Water cycle exam', { exact: true }).first()).toBeVisible()
    await learner.goto('/')
    const upcoming = learner.getByRole('region', { name: 'Upcoming exam' })
    await expect(upcoming.getByRole('heading', { name: 'Water cycle exam' })).toBeVisible()
    await expect(upcoming.getByText('Today', { exact: true })).toBeVisible()

    await learner.clock.install({ time: new Date(Date.now() - 70_000) })
    await learner.goto('/study/timer')
    await learner.getByRole('button', { name: '1 min', exact: true }).click()
    await learner.getByRole('button', { name: 'Start', exact: true }).click()
    const focus = learner.waitForResponse((response) => response.url().endsWith('/focus-sessions')
      && response.request().method() === 'POST' && response.ok())
    await learner.clock.fastForward(61_000)
    await expect(learner.getByRole('heading', { name: 'You focused' })).toBeVisible()
    await focus

    await learner.evaluate(() => localStorage.setItem('lang', 'km'))
    await learner.goto('/study/quiz')
    await expect(learner.locator('html')).toHaveAttribute('lang', 'km')
    await learner.getByLabel('អត្ថបទគំរូសម្រាប់សិក្សា').selectOption('water-cycle-km')
    await learner.getByRole('button', { name: 'បង្កើតកម្រងសំណួរដោយ AI' }).click()
    await expect(learner.getByText('តើពពកកើតពីអ្វី?')).toBeVisible()
    await learner.getByRole('button', { name: /ដំណក់ទឹក/ }).click()
    await learner.getByRole('button', { name: 'មើលលទ្ធផល' }).click()
    await expect(learner.getByRole('heading', { name: 'ធ្វើបានល្អ' })).toBeVisible()
  } finally {
    await Promise.all([mobile.close(), desktop.close()])
  }
})
