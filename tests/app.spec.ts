import { expect, test } from '@playwright/test'

const startTimeAttack = async (page: Parameters<typeof test>[0]['page']) => {
  await page.getByRole('button', { name: '早駆け' }).click()
  await page.getByRole('button', { name: '30s' }).click()
  await page.getByTestId('start-button').click()
}

test('loads practice mode', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('LazyVim Key-Dojo')).toBeVisible()
  await expect(page.getByTestId('mode-tag')).toHaveText('稽古')
  await expect(page.getByTestId('start-button')).toHaveCount(0)
})

test('time attack input increases score', async ({ page }) => {
  await page.goto('/')
  await startTimeAttack(page)

  await page.keyboard.press('Space')
  await page.keyboard.press('f')
  await page.keyboard.press('f')

  const scoreText = await page.getByTestId('score-value').textContent()
  const correctText = await page.getByTestId('correct-value').textContent()

  const score = Number(scoreText ?? '0')
  const correct = Number(correctText ?? '0')

  expect(score).toBeGreaterThanOrEqual(10)
  expect(correct).toBeGreaterThanOrEqual(3)
})

test('time attack finishes and shows result overlay', async ({ page }) => {
  test.setTimeout(45000)
  await page.goto('/')
  await startTimeAttack(page)

  await page.waitForTimeout(31000)

  await expect(page.getByText('リザルト')).toBeVisible()
  await expect(page.getByText('最終スコア')).toBeVisible()
})

test('category switch filters prompt', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'LSP' }).click()
  const titleText = await page.getByTestId('question-title').textContent()

  expect(titleText ?? '').toMatch(/コードアクション|フォーマット/)
})

test('wrong input increments miss counter', async ({ page }) => {
  await page.goto('/')
  await startTimeAttack(page)

  await page.keyboard.press('x')

  await expect(page.getByTestId('wrong-value')).toHaveText('1')
})

test('high score is saved after finishing time attack', async ({ page }) => {
  test.setTimeout(45000)
  await page.goto('/')
  await startTimeAttack(page)

  await page.keyboard.press('Space')
  await page.keyboard.press('f')
  await page.keyboard.press('f')

  await page.waitForTimeout(31000)

  await expect(page.getByText('リザルト')).toBeVisible()
  const storedHighScore = await page.evaluate(() =>
    window.localStorage.getItem('lazyvim-key-dojo:high-score'),
  )

  expect(Number(storedHighScore ?? '0')).toBeGreaterThanOrEqual(10)
})
