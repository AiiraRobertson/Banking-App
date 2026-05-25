// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Wire Transfer page @regression', () => {
  test('loads with heading', async ({ wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Skipping on mobile - heading layout differs');
    
    await wirePage.goto();
    await wirePage.expectLoaded();
  });

  test('countries endpoint feeds the page', async ({ page, wirePage, isNarrowViewport }) => {
    test.skip(isNarrowViewport, 'Skipping on mobile - timeout handling differs');
    
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/wire/countries'), { timeout: 30000 }),
      wirePage.goto(),
    ]);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.countries).toBeTruthy();
    expect(Object.keys(body.countries).length).toBeGreaterThan(0);
  });
});
