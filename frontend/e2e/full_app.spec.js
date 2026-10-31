// frontend/e2e/full_app.spec.js
// Automated End-to-End Test Suite for FieldShift 2026 (P8.1 Extended)
// NASA Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('e2e/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const TEST_FIELDS = [
  { name: 'Bogura Demo Field', district: 'bogura', lat: 24.85, lon: 89.37, area: 10.0 },
  { name: 'Dinajpur Sadar', district: 'dinajpur', lat: 25.6279, lon: 88.6332, area: 2.0 },
  { name: 'Satkhira Coast', district: 'satkhira', lat: 22.7185, lon: 89.0705, area: 1.5 },
  { name: 'Sunamganj Haor', district: 'sunamganj', lat: 25.0658, lon: 91.3950, area: 1.0 },
];

const PAGES = [
  { id: 'dashboard', label: 'Farmer Home / Dashboard', filename: 'page_01_dashboard.png' },
  { id: 'field', label: 'My Farm Workspace', filename: 'page_02_field.png' },
  { id: 'farm_planning', label: 'Farm Planning & 6-Season Rotation', filename: 'page_03_farm_planning.png' },
  { id: 'weather', label: 'NASA Weather Station 3D & Risk', filename: 'page_04_weather.png' },
  { id: 'water_irrigation', label: 'Water Scheduling & Soil Column', filename: 'page_05_water_irrigation.png' },
  { id: 'harvest_profit', label: 'Market Intelligence & Profit', filename: 'page_06_harvest_profit.png' },
  { id: 'digital_twin', label: 'Digital Twin 3D Farm Diorama', filename: 'page_07_digital_twin.png' },
  { id: 'data_evidence', label: 'Data Provenance & Evidence', filename: 'page_08_data_evidence.png' },
];

test.describe('FieldShift 2026 End-to-End Application Audit', () => {
  let consoleErrors = [];
  let failedRequests = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    failedRequests = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('THREE.WebGLRenderer') && !text.includes('favicon') && !text.includes('context')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('E1: Guided Demo End-to-End (7 Steps)', async ({ page }) => {
    await page.goto('/?demo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // Open Guided Demo Modal
    const demoBtn = page.locator('button:has-text("ডেমো দেখুন"), button:has-text("Guided Demo")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(400);

      // Verify Guided Demo Modal is visible
      const modal = page.locator('.guided-demo-container, div:has-text("১. ক্ষুদ্র কৃষকের বাস্তবতা")').first();
      await expect(modal).toBeVisible();

      // Step through all 7 steps using the Next button
      for (let s = 1; s <= 6; s++) {
        const nextBtn = page.locator('button:has-text("পরবর্তী ধাপ"), button:has-text("Next Step")').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(200);
        }
      }

      // Close Guided Demo
      const closeBtn = page.locator('button:has-text("ডেমো সম্পন্ন"), button:has-text("Finish Tour"), button:has-text("✕")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('E2: Two-Field Regional Comparison Modal & Regional Divergence', async ({ page }) => {
    await page.goto('/?demo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // Open Two-Field Comparison Modal
    const compBtn = page.locator('button:has-text("দুই জমি তুলনা"), button:has-text("Compare Regions")').first();
    if (await compBtn.isVisible()) {
      await compBtn.click();
      await page.waitForTimeout(400);

      // Verify modal content
      await expect(page.locator('text=দুই আঞ্চলিক জমির তুলনামূলক বিশ্লেষণ, text=Regional Adaptation Comparison')).toBeVisible();
      await expect(page.locator('text=রাজশাহী (বরেন্দ্র অঞ্চল), text=Rajshahi')).toBeVisible();
      await expect(page.locator('text=সুনামগঞ্জ (হাওর অববাহিকা), text=Sunamganj')).toBeVisible();

      // Close modal
      const closeBtn = page.locator('button:has-text("বন্ধ করুন"), button:has-text("Close"), button:has-text("✕")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // Verify API responses differ for Rajshahi vs Sunamganj
    const rajshahiRes = await page.request.post('/api/planning', {
      data: { district: 'rajshahi', priority: 'balanced' }
    });
    const sunamganjRes = await page.request.post('/api/planning', {
      data: { district: 'sunamganj', priority: 'balanced' }
    });

    expect(rajshahiRes.ok()).toBeTruthy();
    expect(sunamganjRes.ok()).toBeTruthy();

    const rajData = await rajshahiRes.json();
    const sunData = await sunamganjRes.json();

    const rajWater = rajData.summary?.planning?.selected_strategy_result?.water_component;
    const sunWater = sunData.summary?.planning?.selected_strategy_result?.water_component;
    const rajProfit = rajData.summary?.planning?.selected_strategy_result?.profit_component;
    const sunProfit = sunData.summary?.planning?.selected_strategy_result?.profit_component;

    expect(rajWater).toBeDefined();
    expect(sunWater).toBeDefined();
    expect(rajWater).not.toEqual(sunWater);
    expect(rajProfit).not.toEqual(sunProfit);

    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('E3: Presentation Mode & Theme Toggling (Light / Dark)', async ({ page }) => {
    // 1. Presentation Mode
    await page.goto('/?present=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // Verify presentation mode elements
    const exitPresentBtn = page.locator('.exit-presentation-btn, button:has-text("উপস্থাপনা মোড বন্ধ")').first();
    await expect(exitPresentBtn).toBeVisible();

    // 2. Light & Dark Themes
    const themeBtn = page.locator('.theme-toggle-btn').first();
    if (await themeBtn.isVisible()) {
      // Toggle to light theme
      await themeBtn.click();
      await page.waitForTimeout(200);
      const isLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light');
      expect(isLight).toBeTruthy();

      // Toggle back to dark theme
      await themeBtn.click();
      await page.waitForTimeout(200);
      const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
      expect(isDark).toBeTruthy();
    }

    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('E4: Report Print Emulation & Mobile Bottom Navigation', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('390');

    await page.goto('/?demo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // 1. Print Emulation
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    await page.emulateMedia({ media: 'screen' });

    // 2. Mobile Bottom Navigation
    if (isMobile) {
      const bottomNav = page.locator('.mobile-bottom-nav').first();
      await expect(bottomNav).toBeVisible();

      // Navigate via mobile bottom nav items
      const bottomItems = page.locator('.mobile-bottom-nav-item');
      const count = await bottomItems.count();
      expect(count).toBeGreaterThanOrEqual(4);

      if (count > 0) {
        await bottomItems.first().click();
        await page.waitForTimeout(200);
      }
    }

    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('E5: Full App Navigation & Error Boundary Audit', async ({ page }, testInfo) => {
    const isDesktop = testInfo.project.name.includes('1440');

    await page.goto('/?demo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // Visit every canonical page
    for (const p of PAGES) {
      const navItem = page.locator(`.sidebar-nav-item[data-nav="${p.id}"], .nav-item[data-nav="${p.id}"]`).first();
      if (await navItem.isVisible()) {
        await navItem.click();
      } else {
        await page.evaluate(navId => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('fs-navigate', { detail: { nav: navId } }));
          }
        }, p.id);
      }

      await page.waitForTimeout(300);

      // Verify no Error Boundary notice
      await expect(page.locator('text=Interface Notice')).toHaveCount(0);
      await expect(page.locator('text=Display Module Notice')).toHaveCount(0);

      if (isDesktop) {
        const screenshotPath = path.join(SCREENSHOT_DIR, p.filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }
    }

    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });
});
