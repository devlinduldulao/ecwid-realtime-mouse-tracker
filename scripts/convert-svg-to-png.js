const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

async function convert() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const svgs = [
    { file: 'assets/marketplace/app-icon.svg', out: 'assets/marketplace/app-icon.png', width: 512, height: 512 },
    { file: 'assets/marketplace/listing-banner.svg', out: 'assets/marketplace/listing-banner.png', width: 1600, height: 900 },
    { file: 'public/logo.svg', out: 'public/logo.png', width: 512, height: 512 }
  ];

  for (const svg of svgs) {
    const svgPath = path.resolve(__dirname, '..', svg.file);
    if (!fs.existsSync(svgPath)) {
      console.log(`Skipping ${svg.file} - not found.`);
      continue;
    }
    
    // Read SVG and wrap in simple HTML to ensure exact bounds
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${svgContent}</body></html>`;
    
    await page.setViewportSize({ width: svg.width, height: svg.height });
    await page.setContent(html);
    
    const outPath = path.resolve(__dirname, '..', svg.out);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Successfully converted: ${svg.out}`);
  }
  
  await browser.close();
}

convert().catch(console.error);
