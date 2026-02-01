import { test, expect } from '@playwright/test';

const lightTokens = {
  '--sf-primary': '#0ea5e9',
  '--sf-secondary': '#22c55e',
  '--sf-bg': '#f8fafc',
  '--sf-surface': '#ffffff',
  '--sf-text': '#0f172a',
};

const darkTokens = {
  '--sf-primary': '#d6b25e',
  '--sf-secondary': '#7dd3fc',
  '--sf-bg': '#0b0f17',
  '--sf-surface': '#0f172a',
  '--sf-text': '#f8fafc',
};

async function applyTokens(page, tokens: Record<string, string>) {
  await page.addStyleTag({
    content: `:root{${Object.entries(tokens)
      .map(([k, v]) => `${k}: ${v};`)
      .join('')}}`,
  });
}

test('website home snapshot (light)', async ({ page }) => {
  await page.goto('/');
  await applyTokens(page, lightTokens);
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot('website-home-light.png', { fullPage: true });
});

test('website home snapshot (dark)', async ({ page }) => {
  await page.goto('/');
  await applyTokens(page, darkTokens);
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot('website-home-dark.png', { fullPage: true });
});

test('booking page snapshot (light)', async ({ page }) => {
  await page.goto('/check-in/book');
  await applyTokens(page, lightTokens);
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot('booking-light.png', { fullPage: true });
});

test('booking page snapshot (dark)', async ({ page }) => {
  await page.goto('/check-in/book');
  await applyTokens(page, darkTokens);
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot('booking-dark.png', { fullPage: true });
});
