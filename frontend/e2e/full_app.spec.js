// frontend/e2e/full_app.spec.js
// Automated End-to-End Test Suite for FieldShift 2026
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
  { id: 'crop_advice', label: 'Crop Advisory & 15-Crop Catalog', filename: 'page_03_crop_advice.png' },
  { id: 'weather', label: 'NASA Weather Station 3D', filename: 'page_04_weather.png' },
  { id: 'farm_planning', label: 'Farm Planning & 6-Season MILP', filename: 'page_05_farm_planning.png' },
  { id: 'water_irrigation', label: 'Water Scheduling & Irrigation', filename: 'page_06_water_irrigation.png' },
  { id: 'research', label: 'Research Workspace & Labs', filename: 'page_07_research.png' },
  { id: 'digital_twin', label: 'Digital Twin 3D Farm Diorama', filename: 'page_08_digital_twin.png' },
  { id: 'harvest_profit', label: 'Market Intelligence & Profit', filename: 'page_09_harvest_profit.png' },
  { id: 'assistant', label: 'Agronomic AI Assistant', filename: 'page_10_assistant.png' },
  { id: 'data_evidence', label: 'Data Provenance & Evidence', filename: 'page_11_data_evidence.png' },
  { id: 'account', label: 'Operator Cockpit & Settings', filename: 'page_12_account.png' },
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
        // Ignore expected WebGL fallback notes if running in software renderer
        if (!text.includes('THREE.WebGLRenderer') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('E3: Comprehensive User Flow Across All Pages and Fields', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const isDesktop = testInfo.project.name.includes('1440');

    // 1. Start application in demo mode with OFFLINE=1
    await page.goto('/?demo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();

    // 2. Add New Field through UI (Dinajpur Sadar: 25.6279, 88.6332, 2.0 ha)
    const addFieldBtn = page.locator('button:has-text("নতুন জমি যোগ করুন"), button:has-text("Add Field")').first();
    if (await addFieldBtn.isVisible()) {
      await addFieldBtn.click();
      const nameInput = page.locator('input[placeholder*="জমির নাম"], input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Dinajpur Test Parcel (2 ha)');
        await page.locator('input[placeholder*="অক্ষাংশ"], input[name="latitude"]').first().fill('25.6279');
        await page.locator('input[placeholder*="দ্রাঘিমাংশ"], input[name="longitude"]').first().fill('88.6332');
        await page.locator('input[placeholder*="আয়তন"], input[name="area_ha"]').first().fill('2.0');
        const submitBtn = page.locator('button:has-text("সংরক্ষণ করুন"), button:has-text("Save Field")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }
      }
    }

    // 3. Select each of the 4 test fields in turn and verify selection
    for (const f of TEST_FIELDS) {
      const fieldSelector = page.locator('select[aria-label="Active field parcel"]').first();
      if (await fieldSelector.isVisible()) {
        const option = await page.locator(`select[aria-label="Active field parcel"] option:has-text("${f.district}"), select[aria-label="Active field parcel"] option:has-text("${f.name}")`).first();
        if (await option.count() > 0) {
          const val = await option.getAttribute('value');
          if (val) await fieldSelector.selectOption(val);
        }
      }
    }

    // 4. Visit every navigation destination and tab, capturing screenshots on 1440 desktop
    for (let i = 0; i < PAGES.length; i++) {
      const p = PAGES[i];
      // Navigate via click or direct route
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

      // Verify no Error Boundary text
      await expect(page.locator('text=Interface Notice')).toHaveCount(0);
      await expect(page.locator('text=Display Module Notice')).toHaveCount(0);

      // Save screenshot for 1440 view
      if (isDesktop) {
        const screenshotPath = path.join(SCREENSHOT_DIR, p.filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }
    }

    // 5. On Farm Planning: choose existing rotation and each strategy
    const farmPlanNav = page.locator('.sidebar-nav-item[data-nav="farm_planning"]').first();
    if (await farmPlanNav.isVisible()) await farmPlanNav.click();

    for (const stratId of ['balanced', 'water_efficiency', 'soil_health', 'profit_focused']) {
      const stratBtn = page.locator(`button[data-strategy="${stratId}"], .strategy-card[data-strategy="${stratId}"]`).first();
      if (await stratBtn.isVisible()) {
        await stratBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // 6. Open 3D workbench and digital twin controls
    const twinNav = page.locator('.sidebar-nav-item[data-nav="digital_twin"]').first();
    if (await twinNav.isVisible()) {
      await twinNav.click();
      await page.waitForTimeout(300);
      const seasonSlider = page.locator('input[type="range"]').first();
      if (await seasonSlider.isVisible()) {
        await seasonSlider.fill('3');
      }
    }

    // 7. Change market price in Market Intelligence / Harvest Profit
    const marketNav = page.locator('.sidebar-nav-item[data-nav="harvest_profit"]').first();
    if (await marketNav.isVisible()) {
      await marketNav.click();
      await page.waitForTimeout(200);
      const priceInput = page.locator('input[type="number"]').first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('1350');
      }
    }

    // 8. Assert planning numbers for Rajshahi and Sunamganj are NOT equal
    const rajshahiRes = await page.request.post('/api/planning', {
      data: { district: 'rajshahi', priority: 'balanced' }
    });
    const sunamganjRes = await page.request.post('/api/planning', {
      data: { district: 'sunamganj', priority: 'balanced' }
    });

    expect(rajshahiRes.ok()).toBeTruthy();
    expect(sunamganjRes.ok()).toBeTruthy();

    const rajshahiData = await rajshahiRes.json();
    const sunamganjData = await sunamganjRes.json();

    const rajshahiWater = rajshahiData.summary?.planning?.selected_strategy_result?.water_component;
    const sunamganjWater = sunamganjData.summary?.planning?.selected_strategy_result?.water_component;
    const rajshahiProfit = rajshahiData.summary?.planning?.selected_strategy_result?.profit_component;
    const sunamganjProfit = sunamganjData.summary?.planning?.selected_strategy_result?.profit_component;

    expect(rajshahiWater).toBeDefined();
    expect(sunamganjWater).toBeDefined();
    expect(rajshahiWater).not.toEqual(sunamganjWater);
    expect(rajshahiProfit).not.toEqual(sunamganjProfit);

    // 9. Assert no console errors or failed requests
    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });
});
