import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const km = JSON.parse(readFileSync(new URL('../src/locales/km.json', import.meta.url), 'utf8')) as typeof import('../src/locales/km.json')

test.skip(process.env.STUDEXA_E2E_GUEST !== 'true', 'Requires a local preview with VITE_BETA_ENABLED=false.')

async function enterGuest(page: Page) {
  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }))
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue in Demo / Offline Mode' }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
}

test('guest pets and Khmer starter content work through a solo quiz', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await enterGuest(page)

  const pets = page.getByRole('region', { name: 'Pet Gallery' })
  await expect(pets.locator('.pet-tile')).toHaveCount(4)
  await pets.getByRole('button', { name: 'View all pets' }).click()
  await expect(pets.locator('.pet-tile')).toHaveCount(Object.keys(km.pets.names).length)
  const cowboy = pets.getByRole('button', { name: 'Cowboy cat' })
  await cowboy.scrollIntoViewIfNeeded()
  const motion = () => cowboy.locator('.pet-body').evaluate((body) => getComputedStyle(body).animationName)
  await expect.poll(motion).toBe('pet-breathe')
  await cowboy.press('Enter')
  await expect(cowboy.locator('.pet-reaction')).toHaveCount(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(motion).toBe('none')

  const language = page.locator('.language-selector')
  await language.selectOption('km')
  await expect(page.getByRole('region', { name: km.pets.title })).toBeVisible()
  await page.goto('/notes/note-algebra')
  await expect(page.getByRole('heading', { name: 'សន្លឹករូបមន្តពិជគណិត' })).toBeVisible()
  await page.getByRole('button', { name: km.notes.editOriginal }).click()
  const title = page.getByRole('textbox', { name: km.notes.titlePlaceholder })
  await expect(title).toHaveValue('Algebra formula sheet')
  await title.fill('My edited algebra notes')
  await expect(page.getByRole('status').filter({ hasText: km.notes.saved })).toBeVisible()
  await page.reload()
  await expect(title).toHaveValue('My edited algebra notes')

  await page.goto('/study/quiz')
  await expect(language).toHaveValue('km')
  await language.selectOption('en')
  await page.getByRole('button', { name: 'Let’s start' }).click()
  await page.locator('#quiz-deck').selectOption('deck-algebra')
  await page.getByRole('button', { name: 'Practise saved cards' }).click()

  const solutions: Record<string, string> = {
    'Solve: 2x + 6 = 18': 'x = 6',
    'Slope of the line y = 3x + 2': '3',
    'Factor x² − 9': '(x − 3)(x + 3)',
    'Area of a circle': 'πr²',
    'Solve: x² = 49': 'x = ±7',
    'Value of π to 2 decimal places': '3.14',
  }
  const xp = () => page.evaluate(() => JSON.parse(localStorage.getItem('studexa_v1')!).state.xp as number)
  const initialXp = await xp()
  const total = Object.keys(solutions).length
  const prompt = page.locator('#quiz-question')
  const card = page.locator('#solo-quiz-card-content')
  const flashcards = page.getByRole('button', { name: 'Study as flashcards' })
  const flip = page.getByRole('button', { name: 'Flip card' })
  const nextCard = page.getByRole('button', { name: 'Next card' })
  const order: string[] = []

  await flashcards.click()
  await expect(page.getByRole('timer')).toHaveCount(0)
  for (let index = 0; index < total; index++) {
    const question = await card.innerText()
    order.push(question)
    if (index === 0) {
      await flip.focus()
      await flip.press('Enter')
      await expect(card.locator('strong')).toHaveText(solutions[question])
      await expect(card.locator('span')).not.toBeEmpty()
      await expect(page.locator('.solo-quiz-flip-face')).toHaveCSS('animation-name', 'none')
    }
    if (index + 1 < total) {
      await nextCard.click()
      await expect(flip).toHaveAttribute('aria-pressed', 'false')
    }
  }
  await expect(await xp()).toBe(initialXp)
  await page.getByRole('button', { name: 'Start quiz' }).click()
  await expect(page.getByRole('timer')).toHaveCount(0)

  const choices = page.locator('.solo-quiz-choice')
  for (const [index, question] of order.entries()) {
    await expect(prompt).toHaveText(question)
    const answer = page.getByText(solutions[question], { exact: true })
    const right = choices.filter({ has: answer })
    await expect(choices).toHaveCount(4)
    if (index === 0) {
      await language.selectOption('km')
      await expect(prompt).not.toHaveText(question)
      await expect(choices).toHaveCount(4)
      await language.selectOption('en')
      await choices.filter({ hasNot: answer }).first().click()
      await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
    } else {
      await right.click()
      await expect(page.getByText('Correct!', { exact: true })).toBeVisible()
    }
    await expect(right).toHaveAttribute('data-tone', 'correct')
    await expect(right).toBeDisabled()
    const next = page.getByRole('button', { name: index + 1 === total ? 'See results' : 'Next question' })
    if (index + 1 === total) {
      await next.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
    } else {
      await next.click()
    }
  }
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible()
  await expect(page.getByText('+20', { exact: true })).toBeVisible()
  expect(await xp() - initialXp).toBe(20)
  await page.locator('.solo-quiz-review summary').first().click()
  await expect(page.locator('.solo-quiz-review-detail').first()).toContainText(solutions[order[0]])
  await flashcards.click()
  for (const [index, question] of order.entries()) {
    await expect(card).toHaveText(question)
    if (index + 1 < total) await nextCard.click()
  }
  await page.getByRole('button', { name: 'Back to score' }).click()
  expect(await xp() - initialXp).toBe(20)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Build a fresh quiz' })).toBeVisible()
  await expect(page.locator('#quiz-deck')).toHaveValue('deck-algebra')
})

test('the optional timer closes each question and rejects answers at its deadline', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 })
  await enterGuest(page)
  await page.goto('/study/quiz')
  await page.getByRole('button', { name: 'Let’s start' }).click()
  await page.getByRole('checkbox', { name: '40 seconds per question' }).check()
  await page.getByRole('button', { name: 'Practise saved cards' }).click()
  await page.clock.install()
  await page.getByRole('button', { name: 'Start quiz' }).click()
  await expect(page.getByRole('timer')).toContainText('40s left')
  await page.clock.fastForward(40_100)
  await expect(page.getByText('Time’s up', { exact: true })).toBeVisible()
  await expect(page.locator('.solo-quiz-choice').first()).toBeDisabled()
  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByRole('timer')).toContainText('40s left')

  // Advance the wall clock without running the interval so the click handles expiry.
  const now = await page.evaluate(() => Date.now())
  await page.clock.setSystemTime(now + 40_100)
  await page.locator('.solo-quiz-choice').first().evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.getByText('Time’s up', { exact: true })).toBeVisible()
  await expect(page.locator('.solo-quiz-choice[data-chosen=true]')).toHaveCount(0)
  await expect(page.getByRole('timer')).toHaveCount(0)
})
