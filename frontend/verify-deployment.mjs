/**
 * Deployment Verification Script
 * Verifies that the GitHub Pages deployment is working correctly
 */

const SITE_URL = 'https://shreyasiyer2005.github.io/EcoSense-AI-1/';

const tests = [
  {
    name: 'Site loads successfully',
    url: SITE_URL,
    check: (response) => response.status === 200
  },
  {
    name: 'Index HTML is valid',
    url: SITE_URL,
    check: async (response) => {
      const html = await response.text();
      return html.includes('<div id="root">') && html.includes('EcoSense AI');
    }
  },
  {
    name: 'Main JS bundle exists',
    url: SITE_URL,
    check: async (response) => {
      const html = await response.text();
      const match = html.match(/src="([^"]*assets\/index-[^"]*\.js)"/);
      if (!match) return false;
      
      const jsUrl = new URL(match[1], SITE_URL).href;
      const jsResponse = await fetch(jsUrl);
      return jsResponse.status === 200;
    }
  },
  {
    name: 'Main CSS bundle exists',
    url: SITE_URL,
    check: async (response) => {
      const html = await response.text();
      const match = html.match(/href="([^"]*assets\/index-[^"]*\.css)"/);
      if (!match) return false;
      
      const cssUrl = new URL(match[1], SITE_URL).href;
      const cssResponse = await fetch(cssUrl);
      return cssResponse.status === 200;
    }
  },
  {
    name: 'Cesium widgets.css exists',
    url: `${SITE_URL}cesium/Widgets/widgets.css`,
    check: (response) => response.status === 200
  },
  {
    name: 'Cesium Workers are accessible',
    url: `${SITE_URL}cesium/Workers/ArcType-26a3f38d.js`,
    check: (response) => response.status === 200
  },
  {
    name: 'CESIUM_BASE_URL is configured',
    url: SITE_URL,
    check: async (response) => {
      const html = await response.text();
      return html.includes('window.CESIUM_BASE_URL') && 
             html.includes('/EcoSense-AI-1/cesium/');
    }
  }
];

async function runTests() {
  console.log('🔍 Verifying EcoSense AI deployment...\n');
  console.log(`Site URL: ${SITE_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url);
      const result = await test.check(response);
      
      if (result) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - Check failed`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Deployment is successful.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the deployment.');
    process.exit(1);
  }
}

// Wait a bit for deployment to complete, then run tests
console.log('⏳ Waiting 30 seconds for deployment to complete...\n');
setTimeout(runTests, 30000);
