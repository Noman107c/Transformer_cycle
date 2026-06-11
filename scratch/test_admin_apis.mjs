import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api/admin/transformers`;

async function testEndpoint(url, options = {}) {
  try {
    console.log(`\nTesting: ${options.method || 'GET'} ${url}`);
    const res = await fetch(url, options);
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
  console.log('Starting Admin API Integration Tests...');

  // 1. GET all transformers with mean data
  const { data: listData } = await testEndpoint(BASE_URL);

  // 2. GET sensor data with pagination
  await testEndpoint(`${BASE_URL}/11/data?page=1&limit=100`);

  // 3. POST new sensor reading
  const testTimestamp = '2026-06-11 12:00:00';
  const postRes = await testEndpoint(`${BASE_URL}/11/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Timestamp: testTimestamp,
      Ambient_Temperature_C: 25.5,
      Age_yr: 15,
      Maintenance_Count: 4,
      No_of_Short_Circuits: 2,
      Outages_hours_per_year: 5.2,
      Current_A: 400.0,
      Voltage_kV: 11.0,
      Temp_score: 0.1,
      Age_score: 0.1,
      Maintenance_score: 0.1,
      ShortCircuit_score: 0.1,
      Outage_score: 0.1,
      Current_score: 0.1,
      Voltage_score: 0.1,
      HI: 0.85,
      Predicted_HI: 0.83
    })
  });

  // 4. PUT update sensor reading
  await testEndpoint(`${BASE_URL}/11/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Timestamp: testTimestamp,
      original_Timestamp: testTimestamp,
      Ambient_Temperature_C: 27.5, // Changed from 25.5 to 27.5
      Age_yr: 15,
      Maintenance_Count: 4,
      No_of_Short_Circuits: 2,
      Outages_hours_per_year: 5.2,
      Current_A: 400.0,
      Voltage_kV: 11.0,
      Temp_score: 0.1,
      Age_score: 0.1,
      Maintenance_score: 0.1,
      ShortCircuit_score: 0.1,
      Outage_score: 0.1,
      Current_score: 0.1,
      Voltage_score: 0.1,
      HI: 0.88, // Changed from 0.85 to 0.88
      Predicted_HI: 0.83
    })
  });

  // 5. DELETE sensor reading
  await testEndpoint(`${BASE_URL}/11/data?ts=${encodeURIComponent(testTimestamp)}`, {
    method: 'DELETE'
  });

  // 6. POST create new transformer dynamic table
  const createRes = await testEndpoint(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test Transformer',
      location: 'Substation Test',
      type: 'Distribution',
      capacity: 75,
      status: 'GOOD'
    })
  });

  if (createRes.data && createRes.data.success) {
    const tempId = createRes.data.data.id;
    console.log(`Created temporary transformer ID: ${tempId}`);

    // 7. DELETE Cascade (drop table)
    await testEndpoint(`${BASE_URL}/${tempId}/cascade`, {
      method: 'DELETE'
    });

    // 8. DELETE Metadata
    await testEndpoint(`${BASE_URL}/${tempId}`, {
      method: 'DELETE'
    });
  }

  console.log('\nAll Admin API Integration Tests Complete!');
}

runTests();
