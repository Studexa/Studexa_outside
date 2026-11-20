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

test('a stalled session request still lets Chrome reach sign-in', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', () => {
    // Leave the request pending to simulate a backend that accepted the connection.
  })
  await page.goto('/')
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Loading' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({ timeout: 15_000 })
})

test('offline reviews sync from Home with an explicit retry and no duplicate rewards', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { accessToken } = await register(page, 'Offline learner')
  const headers = { Authorization: 'Bearer ' + accessToken }
  const deck = await page.request.post('/api/v1/decks', { headers, data: { title: 'Offline practice deck' } })
  expect(deck.ok()).toBeTruthy()
  const { id: deckId } = await deck.json()
  const cards = new Map<string, string>()
  for (const front of ['First prompt', 'Second prompt', 'Third prompt']) {
    const result = await page.request.post(`/api/v1/decks/${deckId}/cards`, {
      headers, data: { type: 'BASIC', front, back: 'Answer' },
    })
    expect(result.ok()).toBeTruthy()
    cards.set(front, (await result.json()).id)
  }

  await page.goto('/study/review')
  const flashcard = page.getByRole('button', { name: 'Flip the flashcard' })
  let committedReviewId: string | undefined
  await page.route('**/api/v1/review/answer', async (route) => {
    committedReviewId = route.request().postDataJSON().clientReviewId
    const saved = await route.fetch()
    expect(saved.ok()).toBeTruthy()
    await route.abort()
  }, { times: 1 })
  await flashcard.click()
  await page.getByRole('button', { name: /^Good/ }).click()
  await expect(page.getByText('1 answer waiting to sync.')).toBeVisible()
  await expect(page.locator('.review-position')).toHaveText(/2.*3/)
  const missingCard = cards.get(await flashcard.locator('.review-card-text').innerText())
  expect(missingCard).toBeDefined()

  await context.setOffline(true)
  for (const count of [2, 3]) {
    await flashcard.click()
    await page.getByRole('button', { name: /^Good/ }).click()
    await expect(page.getByText(`${count} answers waiting to sync.`)).toBeVisible()
  }
  await page.getByRole('link', { name: 'Back to home' }).click()
  const removed = await page.request.delete(`/api/v1/cards/${missingCard}`, { headers })
  expect(removed.ok()).toBeTruthy()
  await page.route('**/api/v1/review/answer', (route) => route.fulfill({ status: 503 }), { times: 1 })
  await context.setOffline(false)
  await expect(page.getByText('Could not sync your review answers.')).toBeVisible()

  const duplicate = page.waitForResponse((response) => response.url().endsWith('/review/answer') && response.status() === 409)
  const refreshedQueue = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/cards/due') && response.ok())
  await page.getByRole('button', { name: 'Retry sync' }).click()
  const duplicateResponse = await duplicate
  expect((await duplicateResponse.json()).code).toBe('DUPLICATE_REVIEW')
  expect(await (await refreshedQueue).json()).toEqual([])
  await expect(page.getByText(/^2 of \d+ cards$/)).toBeVisible()
  await expect(page.getByText('1 answer could not sync because its card or deck is gone.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry sync' })).toBeHidden()
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
  await expect(page.getByText(/could not sync because/)).toBeHidden()
  const history = await page.request.get('/api/v1/game/xp-history', { headers })
  expect(history.ok()).toBeTruthy()
  const events: { referenceId: string; source: string }[] = await history.json()
  expect(events.filter((event) => event.source === 'review_card')).toHaveLength(2)
  expect(events.filter((event) => event.source === 'review_card' && event.referenceId === committedReviewId)).toHaveLength(1)
})

test('weak-card practice includes cards not due and makes no review writes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { accessToken } = await register(page, 'Practice learner')
  const headers = { Authorization: 'Bearer ' + accessToken }
  const deck = await page.request.post('/api/v1/decks', { headers, data: { title: 'Language deck' } })
  expect(deck.ok()).toBeTruthy()
  const { id: deckId } = await deck.json()
  for (const [front, back] of [['A hard prompt', 'Recall this answer'], ['សំណួរ', 'ចម្លើយ']]) {
    const created = await page.request.post(`/api/v1/decks/${deckId}/cards`, {
      headers, data: { type: 'BASIC', front, back },
    })
    expect(created.ok()).toBeTruthy()
    const { id: cardId } = await created.json()
    for (const rating of ['AGAIN', 'GOOD']) {
      const result = await page.request.post('/api/v1/review/answer', { headers, data: { cardId, rating, msTaken: 1000 } })
      expect(result.ok()).toBeTruthy()
    }
  }
  const weak = await page.request.get('/api/v1/review/weak-cards', { headers })
  expect(weak.ok()).toBeTruthy()
  expect(await weak.json()).toMatchObject([{ due: false, lapses: 1 }, { due: false, lapses: 1 }])
  const dailyBefore = await (await page.request.get('/api/v1/review/today', { headers })).json()
  const writes: string[] = []
  page.on('request', (request) => {
    if (/\/api\/v1\/(review|game|quests)\//.test(request.url()) && request.method() !== 'GET') writes.push(request.url())
  })

  await page.goto('/stats')
  await page.getByRole('link', { name: 'Practice weak cards' }).click()
  const flashcard = page.getByRole('button', { name: 'Flip the flashcard' })
  await flashcard.press('Space')
  await expect(flashcard).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(flashcard).toBeFocused()
  await expect(flashcard).toHaveAttribute('aria-pressed', 'false')
  await flashcard.press('Enter')
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeFocused()
  await page.getByRole('link', { name: 'Back to Stats' }).click()
  await expect(page).toHaveURL(/\/stats$/)

  await page.evaluate(() => localStorage.setItem('lang', 'km'))
  await page.goto('/study/practice')
  await expect(page.getByRole('heading', { name: 'ហាត់រំលឹកកាតដែលពិបាកចងចាំ' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  expect(writes).toEqual([])
  expect(await (await page.request.get('/api/v1/review/today', { headers })).json()).toEqual(dailyBefore)
})

test('review sync stays with the original account when a student signs out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { accessToken } = await register(page, 'First sync account')
  const headers = { Authorization: 'Bearer ' + accessToken }
  const deck = await page.request.post('/api/v1/decks', { headers, data: { title: 'Private deck' } })
  expect(deck.ok()).toBeTruthy()
  const { id: deckId } = await deck.json()
  const created = await page.request.post(`/api/v1/decks/${deckId}/cards`, {
    headers, data: { type: 'BASIC', front: 'Private prompt', back: 'Answer' },
  })
  expect(created.ok()).toBeTruthy()

  await page.goto('/study/review')
  await page.route('**/api/v1/review/answer', (route) => route.abort(), { times: 1 })
  await page.getByRole('button', { name: 'Flip the flashcard' }).click()
  await page.getByRole('button', { name: /^Good/ }).click()
  await page.getByRole('link', { name: 'Back to home' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('button', { name: /ភាសាខ្មែរ/ }).click()
  await expect(page.getByText('ចម្លើយ 1 កំពុងរង់ចាំការធ្វើសមកាលកម្ម។')).toBeVisible()

  const replayHeaders: (string | undefined)[] = []
  await page.route('**/api/v1/review/answer', (route) => {
    replayHeaders.push(route.request().headers().authorization)
    return route.abort()
  })
  await page.getByRole('button', { name: /English/ }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  const second = await register(page, 'Second sync account')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByRole('region', { name: "Today's goal" }).getByText(/^0 of \d+ cards$/)).toBeVisible()
  await expect(page.getByText(/waiting to sync/)).toBeHidden()
  expect(replayHeaders).toEqual([])
  const otherCards = await page.request.get('/api/v1/review/weak-cards', {
    headers: { Authorization: 'Bearer ' + second.accessToken },
  })
  expect(await otherCards.json()).toEqual([])
  await page.goto('/study/practice')
  await expect(page.getByText('No cards to revisit right now.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Stats' })).toBeVisible()
})

test('Home news opens books and the guided tutor keeps its thread across pages', async ({ page }) => {
  const catalog = page.waitForResponse((response) => response.url().endsWith('/api/v1/library/readings') && response.ok())
  await register(page, 'Tutor learner')
  await catalog
  const news = page.getByRole('region', { name: 'What’s new' })
  await expect(news.getByRole('heading', { name: 'Meet the new AI tutor' })).toBeVisible()
  await news.getByRole('button', { name: 'Next slide' }).click()
  await expect(news.getByRole('link', { name: 'See cards in Stats' })).toHaveAttribute('href', '/stats')
  await news.getByRole('button', { name: 'Next slide' }).click()
  const read = news.getByRole('link', { name: 'Read passage' })
  await expect(read).toHaveAttribute('href', /\/explore\/read\/.+/)
  await read.click()
  await expect(page).toHaveURL(/\/explore\/read\/.+/)
  await page.locator('.study-brand').click()

  const requests: unknown[] = []
  await page.route('**/api/v1/ai/samples/tutor', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ json: { answer: `Study answer ${requests.length}`, references: [] } })
  })
  const open = news.getByRole('button', { name: 'Open tutor' })
  await open.click()
  const tutor = page.getByRole('dialog', { name: 'AI tutor' })
  await expect(tutor).toBeVisible()
  expect((await tutor.boundingBox())!.width).toBeLessThan(750)
  await tutor.getByRole('button', { name: 'Ask Gemini' }).click()
  await expect(tutor.getByText('Study answer 1')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(open).toBeFocused()
  await page.getByRole('link', { name: 'Study', exact: true }).first().click()
  await page.getByRole('link', { name: 'Live Rooms' }).click()
  await expect(page).toHaveURL(/\/quiz$/)
  await page.goBack()
  await page.getByRole('link', { name: 'Notes', exact: true }).first().click()
  await page.locator('.study-shell-header').getByRole('button', { name: 'AI tutor' }).click()
  await expect(tutor.getByText('Study answer 1')).toBeVisible()
  await tutor.getByRole('button', { name: 'Ask Gemini' }).click()
  await expect(tutor.getByText('Study answer 2')).toBeVisible()
  expect(requests).toEqual([
    { sampleId: 'water-cycle-en', promptId: 'explain' },
    { sampleId: 'water-cycle-en', promptId: 'compare', previousPromptIds: ['explain'] },
  ])

  await page.setViewportSize({ width: 390, height: 430 })
  await tutor.getByRole('combobox').first().selectOption('water-cycle-km')
  await expect(tutor.getByText('Study answer 1')).toBeHidden()
  await tutor.getByRole('button', { name: 'Ask Gemini' }).click()
  await expect(tutor.getByText('Study answer 3')).toBeVisible()
  expect(requests[2]).toEqual({ sampleId: 'water-cycle-km', promptId: 'explain' })
  await expect(tutor.getByRole('button', { name: 'Ask Gemini' })).toBeInViewport()
  await expect.poll(async () => (await tutor.boundingBox())?.width).toBe(390)
  await page.keyboard.press('Escape')
  await page.evaluate(() => localStorage.setItem('lang', 'km'))
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'ព័ត៌មានថ្មីៗ' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('Explore rotates daily picks and turns a reading selection into a review card', async ({ page }) => {
  const { accessToken } = await register(page, 'Reading learner')
  const headers = { Authorization: 'Bearer ' + accessToken }
  const deckResponse = await page.request.post('/api/v1/decks', { headers, data: { title: 'Reading deck' } })
  expect(deckResponse.ok()).toBeTruthy()
  const { id: deckId } = await deckResponse.json()
  await page.clock.setFixedTime(new Date(2026, 10, 19, 12))
  await page.getByRole('link', { name: 'Explore', exact: true }).click()
  const daily = page.getByRole('region', { name: 'Today’s reading picks' })
  await expect(daily.getByRole('link')).toHaveCount(3)
  const firstPick = await daily.getByRole('link').first().getAttribute('href')
  const topics = await daily.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('data-subject')).sort())
  expect(topics).toEqual(['HISTORY', 'LITERATURE', 'SCIENCE'])
  await page.clock.setFixedTime(new Date(2026, 10, 20, 12))
  await page.reload()
  await expect(daily.getByRole('link').first()).not.toHaveAttribute('href', firstPick!)

  const catalog = page.getByRole('region', { name: 'Reading catalog' })
  await catalog.getByRole('button', { name: 'Literature', exact: true }).click()
  await expect(catalog.getByRole('link')).toHaveCount(3)
  await catalog.getByRole('searchbox').fill('Jane Austen')
  await expect(catalog.getByRole('link')).toHaveCount(3)
  await catalog.getByRole('searchbox').fill('Thomas Paine')
  await expect(catalog.getByText('No readings match your search.')).toBeVisible()
  await catalog.getByRole('searchbox').fill('')
  const editions: { id: string }[] = await (await page.request.get('/api/v1/library/readings', { headers })).json()
  await page.route('**/api/v1/library/readings/pride-chapter-*', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)
    return route.fulfill({ json: {
      edition: editions.find((edition) => edition.id === id),
      maxSourceChars: 12000,
      blocks: [
        { heading: false, text: 'It is a truth universally acknowledged.' },
        { heading: false, text: 'This paragraph continues the reading.' },
      ],
    } })
  })
  await page.route('**/api/v1/library/readings/pride-chapter-1', (route) => route.fulfill({ status: 503 }), { times: 1 })
  await catalog.getByRole('link', { name: /Chapter 1/ }).click()
  await expect(page.getByRole('alert')).toContainText('This reading could not load.')
  await expect(page.getByRole('link', { name: 'Open original edition on Wikisource' })).toHaveAttribute('href', /oldid=13055721$/)
  await page.getByRole('button', { name: 'Retry' }).click()
  const sentence = page.locator('.reading-paper p').filter({ hasText: /It is a truth universally acknowledged/ }).first()
  await expect(sentence).toBeVisible()
  const selectQuestion = async () => {
    const { index, start, end, x1, x2, y } = await sentence.evaluate((element) => {
      element.scrollIntoView({ block: 'center' })
      const node = element.firstChild!
      const start = node.textContent!.indexOf('It is a truth')
      const end = start + 'It is a truth'.length
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      const rect = range.getBoundingClientRect()
      return { index: Number((element as HTMLElement).dataset.readingBlock), start, end,
        x1: rect.left + 0.5, x2: rect.right - 0.5, y: rect.top + rect.height / 2 }
    })
    await page.mouse.move(x1, y)
    await page.mouse.down()
    await page.mouse.move(x2, y, { steps: 8 })
    await page.mouse.up()
    await expect(page.getByRole('toolbar', { name: 'Selected text actions' })).toBeVisible()
    return { index, start, end }
  }
  const { index, start, end } = await selectQuestion()
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click()
  const ask = page.getByRole('dialog', { name: 'Ask AI' })
  await expect(ask.getByLabel('Selected passage')).toHaveValue('It is a truth')
  await page.route('**/api/v1/library/readings/pride-chapter-1/ask', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      revision: 13055721, startBlock: index, startOffset: start, endBlock: index, endOffset: end,
      language: 'en', action: 'SUMMARIZE',
    })
    await route.fulfill({ json: { answer: 'The passage begins with a claim.', references: [] } })
  })
  await ask.getByRole('button', { name: 'Summarize' }).click()
  await expect(ask.getByText('The passage begins with a claim.')).toBeVisible()
  await ask.getByRole('button', { name: 'Close' }).click()
  await expect(ask).toBeHidden()

  await selectQuestion()
  await page.getByRole('button', { name: 'Make flashcard' }).click()
  const draft = page.getByRole('dialog', { name: 'Make flashcard' })
  await expect(draft.getByLabel('Question')).toHaveValue('It is a truth')
  await draft.getByLabel('Question').fill('How does Pride and Prejudice open?')
  await draft.getByRole('button', { name: 'Pick answer' }).click()
  await expect(page.getByRole('region', { name: 'Pick answer' })).toContainText('Reading deck')
  const useAnswer = page.getByRole('button', { name: 'Use selection as answer' })
  await expect(useAnswer).toBeDisabled()
  const expected = await sentence.evaluate((element) => {
    const next = element.nextElementSibling!
    const range = document.createRange()
    range.setStart(element.firstChild!, 0)
    range.setEnd(next.firstChild!, 18)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return element.textContent + '\n\n' + next.textContent!.slice(0, 18)
  })
  await useAnswer.click()
  await expect(draft.getByLabel('Answer')).toHaveValue(expected)
  await page.route('**/api/v1/decks/' + deckId + '/cards', (route) => route.fulfill({ status: 503 }), { times: 1 })
  await draft.getByRole('button', { name: 'Create card' }).click()
  await expect(draft.getByRole('alert')).toContainText('could not be saved')
  await expect(draft.getByLabel('Answer')).toHaveValue(expected)
  await draft.getByRole('button', { name: 'Create card' }).click()
  await expect(page.getByText('Flashcard created')).toBeVisible()
  const cards = await (await page.request.get('/api/v1/decks/' + deckId + '/cards', { headers })).json()
  expect(cards).toEqual([expect.objectContaining({ front: 'How does Pride and Prejudice open?', back: expected,
    sourceTitle: 'Pride and Prejudice · Chapter 1', sourceExcerpt: expected })])

  await page.getByRole('link', { name: 'Next chapter' }).click()
  await expect(page.getByRole('link', { name: 'Open original edition on Wikisource' })).toHaveAttribute('href', /oldid=13055726$/)
  await expect(page.getByRole('article', { name: 'Chapter 2' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('link', { name: 'Start review' }).click()
  const reviewCard = page.getByRole('button', { name: 'Flip the flashcard' })
  await expect(reviewCard).toContainText('How does Pride and Prejudice open?')
  await reviewCard.press('Space')
  await expect(reviewCard).toContainText('It is a truth universally acknowledged')
})

test.describe('passage tools with mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a keyboard-selected private note can become a card and stays out of beta AI', async ({ page }) => {
    const { accessToken } = await register(page, 'Note learner')
    const headers = { Authorization: 'Bearer ' + accessToken }
    const deck = await page.request.post('/api/v1/decks', { headers, data: { title: 'Note deck' } })
    expect(deck.ok()).toBeTruthy()
    const { id } = await deck.json()
    const aiRequests: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/ai\/|\/ask$/.test(request.url())) aiRequests.push(request.url())
    })
    await page.goto('/notes')
    await page.getByRole('button', { name: 'New note' }).first().tap()
    await page.waitForURL('**/notes/*')
    const note = page.locator('.tiptap')
    await note.fill('What should I review?')
    await note.press('End')
    await note.press('Shift+Home')
    const toolbar = page.getByRole('toolbar', { name: 'Selected text actions' })
    await toolbar.getByRole('button', { name: 'Ask AI' }).tap()
    const ask = page.getByRole('dialog', { name: 'Ask AI' })
    await expect(ask.getByLabel('Selected passage')).toHaveValue('What should I review?')
    await expect(ask.getByText(/During beta, AI can study public readings/)).toBeVisible()
    await expect(ask.getByRole('button', { name: 'Summarize' })).toHaveCount(0)
    await ask.getByRole('button', { name: 'Close' }).tap()
    await expect(ask).toBeHidden()
    await note.press('ArrowRight')
    await note.press('End')
    await note.press('Enter')
    await page.keyboard.insertText('Read the chapter again.')
    await note.press('Control+Home')
    await note.press('Shift+End')
    await toolbar.getByRole('button', { name: 'Make flashcard' }).tap()
    const draft = page.getByRole('dialog', { name: 'Make flashcard' })
    await expect(draft.getByLabel('Question')).toHaveValue('What should I review?')
    await draft.getByRole('button', { name: 'Pick answer' }).tap()
    await note.press('Control+End')
    await note.press('Shift+Home')
    await page.getByRole('button', { name: 'Use selection as answer' }).tap()
    await expect(draft.getByLabel('Answer')).toHaveValue('Read the chapter again.')
    await draft.getByRole('button', { name: 'Create card' }).tap()
    await expect(page.getByText('Flashcard created')).toBeVisible()
    const cards = await (await page.request.get('/api/v1/decks/' + id + '/cards', { headers })).json()
    expect(cards).toEqual([expect.objectContaining({ front: 'What should I review?', back: 'Read the chapter again.' })])
    expect(aiRequests).toEqual([])
  })
})

test('sign-in and registration fit on screen and the book slides change', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 667 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport)
    for (const path of ['/login', '/register']) {
      await page.goto(path)
      await expect(page.locator('#auth-title')).toBeVisible()
      const overflow = await page.locator('.auth-form-pane').evaluate((pane) => ({
        page: document.documentElement.scrollHeight - window.innerHeight,
        form: pane.scrollHeight - pane.clientHeight,
      }))
      expect(overflow).toEqual({ page: 0, form: 0 })
    }
  }

  await expect(page.getByRole('heading', { name: 'Turn the page.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect(page.getByRole('heading', { name: 'Make it stick.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect(page.getByRole('heading', { name: 'Study together.' })).toBeVisible()
  await page.getByRole('button', { name: 'Previous slide' }).click()
  await expect(page.getByRole('heading', { name: 'Make it stick.' })).toBeVisible()
  await expect.poll(() => page.locator('.auth-screen').evaluate((screen) => getComputedStyle(screen, '::before').animationName)).toBe('auth-library-light')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.locator('.auth-screen').evaluate((screen) => getComputedStyle(screen, '::before').animationName)).toBe('none')
})

test('two invited players can join and finish a live quiz after a refresh', async ({ browser, baseURL }) => {
  const options = { baseURL, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' as const }
  const hostContext = await browser.newContext(options)
  const playerContext = await browser.newContext(options)
  try {
    const host = await hostContext.newPage()
    const player = await playerContext.newPage()
    await register(host, 'Live host')
    await register(player, 'Live learner')

    await host.goto('/study')
    await host.getByRole('link', { name: 'Live Rooms' }).click()
    await host.getByRole('link', { name: 'Create Room' }).click()
    await host.getByLabel('Quiz title', { exact: true }).fill('Water cycle live room')
    await host.getByLabel('Question 1', { exact: true }).fill('What forms when water vapor cools?')
    await host.getByLabel('Choices for question 1').fill('Clouds\nSand')
    await host.getByLabel('Correct answer for question 1').selectOption('Clouds')
    await host.getByRole('button', { name: 'Add question' }).click()
    await host.getByLabel('Question 2', { exact: true }).fill('Where can rain collect?')
    await host.getByLabel('Choices for question 2').fill('Rivers\nStars')
    await host.getByLabel('Correct answer for question 2').selectOption('Rivers')
    let roomUpdates = 0
    host.on('websocket', (socket) => {
      if (new URL(socket.url()).pathname !== '/ws/quiz') return
      socket.on('framereceived', ({ payload }) => {
        if (String(payload).includes('ROOM_UPDATED')) roomUpdates += 1
      })
    })
    await host.getByRole('button', { name: 'Create Room' }).click()
    const invite = host.getByLabel('Room link')
    await expect(invite).toHaveValue(/\/quiz\/lobby\/[A-Z0-9]{6}$/)
    await expect(host.getByRole('img', { name: 'Scan to join' })).toBeVisible()
    const inviteUrl = await invite.inputValue()
    await player.goto(inviteUrl)
    await expect(player.getByLabel('Your Nickname')).toHaveValue('Live learner')
    await player.goto('/quiz/join')
    const code = new URL(inviteUrl).pathname.split('/').at(-1)!
    await player.getByLabel('Room Code (6 characters)').fill(code.toLowerCase())
    await player.getByRole('button', { name: 'Join Room' }).click()
    await expect(player.getByText('Waiting for the host to start…')).toBeVisible()
    await expect(host.getByText('Live learner', { exact: true })).toBeVisible()
    await expect(player.getByRole('button', { name: 'Start Quiz' })).toHaveCount(0)

    await host.getByRole('button', { name: 'Start Quiz' }).click()
    await expect(player.getByRole('heading', { name: 'What forms when water vapor cools?' })).toBeVisible()
    await host.getByRole('button', { name: 'Clouds' }).click()
    await expect(host.getByRole('button', { name: 'Next question' })).toBeDisabled()
    await player.getByRole('button', { name: 'Clouds' }).click()
    await expect(player.getByText('Correct!', { exact: true })).toBeVisible()
    await player.reload()
    await expect(player.getByText('Correct!', { exact: true })).toBeVisible()
    await host.getByRole('button', { name: 'Next question' }).click()
    await expect(player.getByRole('heading', { name: 'Where can rain collect?' })).toBeVisible()
    await player.getByRole('button', { name: 'Rivers' }).click()
    await host.getByRole('button', { name: 'Rivers' }).click()
    await host.getByRole('button', { name: 'Finish quiz' }).click()
    await expect(player.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
    await expect(host.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
    await expect(player.getByRole('listitem').filter({ hasText: 'Live learner' })).toContainText(/\d+ points/)
    await expect.poll(() => roomUpdates).toBeGreaterThan(0)
  } finally {
    await hostContext.close()
    await playerContext.close()
  }
})

test('the study pet waits for a request and library books can become notes', async ({ page }) => {
  let studyRequests = 0
  page.on('request', (request) => { if (request.url().includes('/api/v1/ai/')) studyRequests += 1 })
  await register(page, 'Library learner')
  const companion = page.getByRole('main').getByRole('button', { name: 'AI tutor' })
  await expect(companion).toBeVisible()
  expect(studyRequests).toBe(0)
  await companion.click()
  const tutor = page.getByRole('dialog', { name: 'AI tutor' })
  await expect(tutor).toHaveCount(1)
  await tutor.getByRole('button', { name: 'Close' }).click()
  await expect(companion).toBeFocused()
  await page.locator('.study-shell-header').getByRole('button', { name: 'AI tutor' }).click()
  await expect(tutor).toHaveCount(1)
  await tutor.getByRole('button', { name: 'Close' }).click()

  await page.route('**/api/v1/library/books', (route) => route.fulfill({ json: {
    stale: false,
    books: [
      { slug: 'biology', title: 'Biology', subjects: ['SCIENCE'], readerUrl: 'https://openstax.org/books/biology/pages/1-introduction', publisherUrl: 'https://openstax.org/books/biology' },
      { slug: 'us-history', title: 'U.S. History', subjects: ['HISTORY', 'HUMANITIES'], readerUrl: 'https://openstax.org/books/us-history/pages/1-introduction', publisherUrl: 'https://openstax.org/books/us-history' },
    ],
  } }))
  await page.getByRole('link', { name: 'Book Library' }).click()
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Biology' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'U.S. History' })).toHaveAttribute('href', 'https://openstax.org/books/us-history/pages/1-introduction')
  await page.getByRole('button', { name: 'Save to Notes' }).click()
  const bookNote = page.getByRole('dialog', { name: 'Save to Notes' })
  await bookNote.getByLabel('Passage to study (optional)').fill('A reading passage to review later.')
  await bookNote.getByRole('button', { name: 'Save to Notes' }).click()
  await expect(page).toHaveURL(/\/notes\/[^/]+$/)
  await expect(page.getByLabel('Note title')).toHaveValue('U.S. History')
  await expect(page.locator('.tiptap')).toContainText('A reading passage to review later.')
  await expect(page.locator('.tiptap').getByRole('link', { name: 'U.S. History' })).toHaveAttribute('href', 'https://openstax.org/books/us-history')
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

test('Notes shows loading, retry, empty, and no-match states', async ({ page }) => {
  await register(page, 'Notes learner')
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/v1/notes', async (route) => {
    await pending
    await route.fulfill({ status: 503 })
  })
  await page.goto('/notes')
  await expect(page.getByRole('status')).toContainText('Loading')
  release()
  await expect(page.getByRole('alert')).toContainText('Your notes could not load.')
  await page.unroute('**/api/v1/notes')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('Capture a thought, a formula, or a lesson summary.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New note', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  await page.waitForURL('**/notes/*')
  await page.goto('/notes')
  await page.getByRole('searchbox').fill('no matching note')
  await expect(page.getByRole('status')).toContainText('No notes match your search.')
})

test('the workspace fits narrow phones and uses compact navigation on tablets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { accessToken } = await register(page, 'Responsive learner')
  const home = page.locator('.study-home')
  const queue = home.getByRole('region', { name: 'Review queue' })
  const dashboard = home.locator('.study-dashboard-grid')
  const shortcuts = dashboard.locator('.study-shortcuts')
  const bottomBar = page.locator('.study-bottom-bar')

  await expect(home.locator('h2, .study-rewards summary')).toHaveText([
    'Review queue', "Today's goal", 'Study tools', 'Upcoming exam', 'What’s new', 'Study habits',
  ])
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(dashboard).toHaveCSS('grid-template-columns', /^\S+$/)
  await expect(shortcuts).toHaveCSS('grid-template-columns', /^\S+ \S+$/)

  const createDeck = queue.getByRole('link', { name: 'Create deck' })
  await expect(createDeck).toHaveAttribute('href', '/study/decks?create=1')
  await home.getByRole('button', { name: 'AI tutor', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(createDeck).toBeFocused()

  const headers = { Authorization: 'Bearer ' + accessToken }
  const deck = await page.request.post('/api/v1/decks', { headers, data: { title: 'Responsive study deck' } })
  expect(deck.ok()).toBeTruthy()
  const { id: deckId } = await deck.json()
  await page.reload()
  await expect(queue.getByRole('link', { name: 'Browse decks' })).toHaveAttribute('href', '/study/decks')

  const card = await page.request.post(`/api/v1/decks/${deckId}/cards`, {
    headers, data: { type: 'BASIC', front: 'Mobile review prompt', back: 'Answer' },
  })
  expect(card.ok()).toBeTruthy()
  await page.reload()
  const startReview = queue.getByRole('link', { name: 'Start review' })
  await expect(startReview).toBeInViewport({ ratio: 1 })
  const reviewBox = (await startReview.boundingBox())!
  expect(reviewBox.height).toBeGreaterThanOrEqual(44)
  expect(reviewBox.y + reviewBox.height).toBeLessThan((await bottomBar.boundingBox())!.y)
  await startReview.click()
  await expect(page).toHaveURL(/\/study\/review$/)

  await page.evaluate(() => {
    localStorage.setItem('lang', 'km')
    localStorage.setItem('studexa_settings', JSON.stringify({ fontSize: 'lg' }))
  })
  await page.setViewportSize({ width: 280, height: 640 })
  await page.goto('/plan')
  await expect(page.locator('html')).toHaveAttribute('lang', 'km')
  expect(await page.evaluate(async () => (await document.fonts.load('600 16px "Noto Sans Khmer"', 'ខ្មែរ')).length)).toBeGreaterThan(0)
  await expect(bottomBar).toBeInViewport({ ratio: 1 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(280)
  await page.locator('.mobile-more summary').click()
  await expect(page.locator('.study-more-menu')).toBeInViewport({ ratio: 1 })
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-more summary')).toBeFocused()

  await page.goto('/')
  await expect(home.getByRole('heading', { level: 1 })).toContainText('Responsive learner')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(280)
  await expect(shortcuts).toHaveCSS('grid-template-columns', /^\S+$/)
  const narrowReview = home.locator('a[href="/study/review"]')
  await expect(narrowReview).toBeInViewport({ ratio: 1 })
  const narrowReviewBox = (await narrowReview.boundingBox())!
  expect(narrowReviewBox.y + narrowReviewBox.height).toBeLessThan((await bottomBar.boundingBox())!.y)

  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/')
  await expect(bottomBar).toBeHidden()
  await expect(page.locator('.study-date')).toContainText(/[ក-អ]/)
  await expect.poll(() => page.locator('.study-sidebar').evaluate((sidebar) => sidebar.clientWidth)).toBeLessThan(100)
  await expect.poll(() => page.locator('.study-dashboard-grid').evaluate((grid) =>
    getComputedStyle(grid).gridTemplateColumns.split(' ').length,
  )).toBe(2)

  await page.setViewportSize({ width: 820, height: 540 })
  const sidebar = page.locator('.study-sidebar')
  const getSidebarOffset = () => sidebar.evaluate((element) => getComputedStyle(element).position === 'fixed'
    && Math.abs(element.getBoundingClientRect().top - document.querySelector('.study-shell-header')!.getBoundingClientRect().bottom) < 1)
  await expect.poll(getSidebarOffset).toBe(true)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect.poll(getSidebarOffset).toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.locator('.study-shell-header').getByRole('status')).toBeVisible()
  await expect.poll(getSidebarOffset).toBe(true)
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

    await learner.locator('.study-shell-header').getByRole('button', { name: 'AI tutor' }).click()
    const tutor = learner.getByRole('dialog')
    await tutor.getByRole('button', { name: 'Ask Gemini' }).click()
    await expect(tutor.getByText('Clouds form from liquid droplets.')).toBeVisible()
    await tutor.getByText('Source excerpts (1)').click()
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
    const quest = learner.waitForResponse((response) => response.url().endsWith('/quests/progress') && response.status() === 204)
    await learner.keyboard.press('3')
    await Promise.all([review, quest])
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
