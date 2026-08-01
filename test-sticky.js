const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test-sticky.html');
  await page.waitForTimeout(100);
  const pos = await page.evaluate(() => {
    const scroll = document.getElementById('scroll');
    scroll.scrollTop = 200;
    return new Promise(resolve => {
      setTimeout(() => {
        const rect = document.getElementById('sticky').getBoundingClientRect();
        resolve(rect.top);
      }, 100);
    });
  });
  console.log("Sticky top relative to viewport:", pos);
  await browser.close();
})();
