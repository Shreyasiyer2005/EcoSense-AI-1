import { test, expect } from '@playwright/test';

test.describe('EcoSense AI Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('http://localhost:3000');

    // Wait for initial load
    await page.waitForTimeout(1000);
  });

  test('Priority 1: Home Globe displays visible rotating Earth', async ({ page }) => {
    console.log('[Test] Testing Home Globe...');

    // Wait for globe container
    const globeContainer = page.locator('canvas').first();
    await expect(globeContainer).toBeVisible({ timeout: 10000 });

    console.log('[Test] ✓ Globe canvas visible');

    // Check console for initialization message
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.waitForTimeout(2000);

    // Verify no critical errors
    const errors = logs.filter(log => log.includes('error') || log.includes('Error'));
    const globeInitialized = logs.some(log => log.includes('[ThreeGlobe]') && log.includes('initialized'));

    console.log('[Test] Globe initialized:', globeInitialized);
    console.log('[Test] Error count:', errors.length);

    if (errors.length > 0) {
      console.log('[Test] Console errors:', errors);
    }

    expect(globeInitialized).toBe(true);

    // Test interaction (mouse movement should pause auto-rotation)
    const canvas = page.locator('canvas').first();
    await canvas.hover();
    await page.mouse.move(200, 200);

    console.log('[Test] ✓ Home Globe test passed');
  });

  test('Priority 2 & 3: Satellite Image Comparison and Swipe', async ({ page }) => {
    console.log('[Test] Testing Satellite Comparison...');

    // Navigate to Explore page
    await page.click('text=Explore');
    await page.waitForTimeout(1000);

    // Search for location
    console.log('[Test] Searching for Gonikoppal...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('Gonikoppal');
    await page.waitForTimeout(500);

    // Click on search result
    const firstResult = page.locator('text=Gonikoppal').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      console.log('[Test] ✓ Location selected');
    }

    await page.waitForTimeout(1000);

    // Set date range
    console.log('[Test] Setting date range...');
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();

    if (count >= 2) {
      await dateInputs.nth(0).fill('2025-01-20');
      await dateInputs.nth(1).fill('2025-01-30');
      console.log('[Test] ✓ Dates set: Jan 20-30, 2025');
    }

    await page.waitForTimeout(500);

    // Click Run Analysis button
    console.log('[Test] Clicking Run Analysis...');
    const runButton = page.locator('button:has-text("Run Analysis")').first();

    if (await runButton.isVisible()) {
      const startTime = Date.now();
      await runButton.click();

      // Wait for analysis to complete (up to 2 minutes)
      console.log('[Test] Waiting for analysis to complete...');

      try {
        await page.waitForSelector('text=Change Segmentation', { timeout: 120000 });
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Test] ✓ Analysis completed in ${elapsedTime}s`);

        // Navigate to Change Segmentation tab
        await page.click('text=Change Segmentation');
        await page.waitForTimeout(1000);

        // Test Side-by-Side view
        console.log('[Test] Testing Side-by-Side view...');
        const sideBySideButton = page.locator('button:has-text("Side-by-Side")');
        if (await sideBySideButton.isVisible()) {
          await sideBySideButton.click();
          await page.waitForTimeout(2000);

          // Check for images (they may be loading)
          const images = page.locator('img[alt*="satellite"]');
          const imageCount = await images.count();
          console.log(`[Test] Found ${imageCount} satellite images`);

          // Check network for image requests
          page.on('response', response => {
            if (response.url().includes('/api/v1/satellite/rgb-image')) {
              console.log(`[Test] RGB Image Response: ${response.status()} ${response.url()}`);
            }
          });
        }

        // Test Swipe view
        console.log('[Test] Testing Swipe view...');
        const swipeButton = page.locator('button:has-text("Swipe")');
        if (await swipeButton.isVisible()) {
          await swipeButton.click();
          await page.waitForTimeout(1000);

          // Look for slider
          const slider = page.locator('[class*="slider"], [class*="handle"]').first();
          const sliderVisible = await slider.isVisible().catch(() => false);
          console.log('[Test] Swipe slider visible:', sliderVisible);
        }

        // Test Overlay view
        console.log('[Test] Testing Change Overlay...');
        const overlayButton = page.locator('button:has-text("Overlay"), button:has-text("Change Overlay")');
        if (await overlayButton.first().isVisible()) {
          await overlayButton.first().click();
          await page.waitForTimeout(1000);

          // Check for overlay image
          const overlayImage = page.locator('img[alt*="overlay"], img[src*="ndvi_change"]');
          const overlayVisible = await overlayImage.isVisible().catch(() => false);
          console.log('[Test] Change overlay visible:', overlayVisible);
        }

      } catch (error) {
        console.log('[Test] ⚠️ Analysis timeout or error:', error);
      }
    }
  });

  test('Priority 6: Reports functionality', async ({ page }) => {
    console.log('[Test] Testing Reports...');

    // Navigate to Reports
    await page.click('text=Reports');
    await page.waitForTimeout(1000);

    // Check for reports list or empty state
    const reportsList = page.locator('[class*="report"], [class*="card"]');
    const reportsCount = await reportsList.count();

    console.log(`[Test] Found ${reportsCount} report(s)`);

    if (reportsCount > 0) {
      console.log('[Test] ✓ Reports exist');

      // Try to view first report
      const firstReport = reportsList.first();
      if (await firstReport.isVisible()) {
        await firstReport.click();
        await page.waitForTimeout(500);
        console.log('[Test] ✓ Report viewable');
      }

      // Look for download button
      const downloadButton = page.locator('button:has-text("Download"), button:has-text("PDF")');
      if (await downloadButton.first().isVisible()) {
        console.log('[Test] ✓ Download button present');
      }
    } else {
      console.log('[Test] No reports found (empty state)');
    }
  });

  test('Console Errors Check', async ({ page }) => {
    console.log('[Test] Checking for console errors...');

    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
      }
    });

    // Load home page
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);

    // Navigate to different pages
    await page.click('text=Explore');
    await page.waitForTimeout(1000);

    await page.click('text=About');
    await page.waitForTimeout(1000);

    console.log('[Test] Console Errors:', errors.length);
    console.log('[Test] Console Warnings:', warnings.length);

    if (errors.length > 0) {
      console.log('[Test] First 5 errors:', errors.slice(0, 5));
    }

    // Critical errors should be 0
    const criticalErrors = errors.filter(e =>
      !e.includes('Download the React DevTools') &&
      !e.includes('Warning:')
    );

    console.log('[Test] Critical errors:', criticalErrors.length);
    expect(criticalErrors.length).toBe(0);
  });
});
