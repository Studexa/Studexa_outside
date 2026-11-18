import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const password = 'Local-test-password-729'
const inviteScript = fileURLToPath(new URL('../../scripts/beta-invites.mjs', import.meta.url))

async function register(page: Page, nickname: string) {
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

test('invited students can save study data, use AI samples, and switch accounts', async ({ browser, baseURL }) => {
  if (!process.env.PGDATABASE?.endsWith('_test')) throw new Error('Use a dedicated database ending in _test.')
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
    await second.goto('/login')
    await second.locator('#email').fill(first.email)
    await second.locator('#password').fill(password)
    await second.getByRole('button', { name: 'Sign in' }).click()
    await expect(second).toHaveURL(/\/$/)
    await second.goto(`/notes/${noteId}`)
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

    await learner.goto('/study/decks')
    await learner.getByRole('button', { name: 'New deck' }).click()
    await learner.getByLabel('Deck name').fill('Water cycle study deck')
    await learner.getByRole('button', { name: 'Create deck' }).click()
    await expect(learner.getByRole('heading', { name: 'Water cycle study deck' })).toBeVisible()
    await learner.getByRole('button', { name: 'Generate cards' }).click()
    const generator = learner.getByRole('dialog')
    await generator.getByRole('button', { name: 'Generate cards' }).click()
    await expect(generator.getByText('How do clouds form?')).toBeVisible()
    await generator.getByRole('button', { name: /Add.*1|Add selected/i }).click()
    await expect(learner.getByText('How do clouds form?')).toBeVisible()

    await learner.goto('/study/review')
    await learner.getByRole('button', { name: 'Flip the flashcard' }).click()
    const review = learner.waitForResponse((response) => response.url().endsWith('/review/answer') && response.ok())
    await learner.getByRole('button', { name: /^Good/ }).click()
    await review

    await learner.goto('/plan')
    await learner.getByRole('button', { name: 'Add task' }).first().click()
    const planner = learner.getByRole('dialog')
    await planner.getByLabel('Task').fill('Review the water cycle')
    await planner.getByRole('button', { name: 'Add task' }).click()
    await expect(learner.getByText('Review the water cycle')).toBeVisible()
    await learner.getByRole('button', { name: 'Add exam' }).first().click()
    const exam = learner.getByRole('dialog')
    await exam.getByLabel('Exam title').fill('Water cycle exam')
    await exam.getByRole('button', { name: 'Add exam' }).click()
    await expect(learner.getByText('Water cycle exam', { exact: true }).first()).toBeVisible()
    await learner.reload()
    await expect(learner.getByText('Review the water cycle')).toBeVisible()
    await expect(learner.getByText('Water cycle exam', { exact: true }).first()).toBeVisible()

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
