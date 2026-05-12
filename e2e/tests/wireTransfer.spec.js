// @ts-check
const { test, expect } = require('../fixtures/authFixture');

test.describe('Wire Transfer page @regression', () => {
  test('loads with heading', async ({ wirePage }) => {
    await wirePage.goto();
    await wirePage.expectLoaded();
  });

  test('countries endpoint feeds the page', async ({ page, wirePage }) => {
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/wire/countries')),
      wirePage.goto(),
    ]);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.countries).toBeTruthy();
    expect(Object.keys(body.countries).length).toBeGreaterThan(0);
  });
});
