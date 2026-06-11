const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api/transformers`;

async function testEndpoint(url) {
  try {
    console.log(`\nTesting: GET ${url}`);
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500) + (JSON.stringify(data).length > 500 ? '...' : ''));
    return { status: res.status, data };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return { error };
  }
}

async function runTests() {
  console.log('Starting API Endpoint Tests...');

  // 1. Test List & Pagination
  await testEndpoint(`${BASE_URL}/11?page=1&limit=2`);

  // 2. Test Latest
  await testEndpoint(`${BASE_URL}/11/latest`);

  // 3. Test Chart
  await testEndpoint(`${BASE_URL}/11/chart?limit=3`);

  // 4. Test Stats
  await testEndpoint(`${BASE_URL}/11/stats`);

  // 5. Test Health
  await testEndpoint(`${BASE_URL}/11/health`);

  // 6. Test 404 (Missing table)
  await testEndpoint(`${BASE_URL}/11`);

  // 7. Test 400 (Invalid ID format)
  await testEndpoint(`${BASE_URL}/11`);
}

runTests();
