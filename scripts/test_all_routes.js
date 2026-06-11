const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', err => resolve({ status: 0, error: err.message }));
  });
}

function post(path, payload) {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(payload);
    const req = http.request({
      host: 'localhost', port: 3000, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', err => resolve({ status: 0, error: err.message }));
    req.write(bodyStr);
    req.end();
  });
}

function del(path) {
  return new Promise((resolve) => {
    const req = http.request({ host: 'localhost', port: 3000, path, method: 'DELETE' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', err => resolve({ status: 0, error: err.message }));
    req.end();
  });
}

function put(path, payload) {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(payload);
    const req = http.request({
      host: 'localhost', port: 3000, path,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', err => resolve({ status: 0, error: err.message }));
    req.write(bodyStr);
    req.end();
  });
}

function log(label, result) {
  const ok = result.error ? '❌ ERROR' : result.body?.success === false ? '❌ FAIL' : result.body?.success === true ? '✅ OK' : `HTTP ${result.status}`;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${ok}  ${label}  [HTTP ${result.status}]`);
  if (result.error) {
    console.error('  ERROR:', result.error);
  } else if (result.body?.error) {
    console.error('  API ERROR:', result.body.error);
  } else {
    const body = result.body;
    if (body?.data) {
      if (Array.isArray(body.data)) {
        console.log(`  data[].length = ${body.data.length}`);
        if (body.data.length > 0) console.log('  data[0]:', JSON.stringify(body.data[0], null, 2).slice(0, 400));
      } else {
        console.log('  data:', JSON.stringify(body.data, null, 2).slice(0, 400));
      }
    }
    if (body?.transformers) console.log(`  transformers[].length = ${body.transformers.length}`);
    if (body?.history)      console.log(`  history[].length      = ${body.history.length}`);
    if (body?.history?.length > 0) console.log('  history[0]:', JSON.stringify(body.history[0], null, 2).slice(0, 300));
    if (body?.insertedCount !== undefined) console.log(`  insertedCount = ${body.insertedCount}, failedCount = ${body.failedCount}`);
    if (body?.assignedId)   console.log('  assignedId:', body.assignedId);
    if (body?.message)      console.log('  message:', body.message);
  }
}

async function run() {
  console.log('\n🚀  ROUTE TEST SUITE — Transformer Lifecycle API\n');

  // ── 1. GET /api/transformers ──────────────────────────────────
  log('GET /api/transformers', await get('/api/transformers'));

  // ── 2. GET /api/dashboard ─────────────────────────────────────
  log('GET /api/dashboard', await get('/api/dashboard'));

  // ── 3. GET /api/admin/transformers ────────────────────────────
  log('GET /api/admin/transformers', await get('/api/admin/transformers'));

  // ── 4. GET /api/admin/transformers/1/data ─────────────────────
  log('GET /api/admin/transformers/1/data', await get('/api/admin/transformers/1/data'));

  // ── 5. POST /api/admin/transformers/1/data (add a record) ─────
  const testTs = `2026-06-11 10:00:00`;
  const addResult = await post('/api/admin/transformers/1/data', {
    Timestamp: testTs,
    Ambient_Temperature_C: 31.5,
    Age_yr: 6,
    Maintenance_Count: 3,
    No_of_Short_Circuits: 2,
    Outages_hours_per_year: 1.2,
    Current_A: 135.0,
    Voltage_kV: 11.0,
    Temp_score: 0.85,
    Age_score: 0.78,
    Maintenance_score: 0.90,
    ShortCircuit_score: 0.70,
    Outage_score: 0.80,
    Current_score: 0.88,
    Voltage_score: 0.92,
    HI: 0.84,
    Predicted_HI: 0.83,
  });
  log('POST /api/admin/transformers/1/data', addResult);

  // ── 6. PUT /api/admin/transformers/1/data (update) ────────────
  const editResult = await put('/api/admin/transformers/1/data', {
    original_Timestamp: testTs,
    Timestamp: testTs,
    Ambient_Temperature_C: 33.0,
    Age_yr: 6,
    Maintenance_Count: 3,
    No_of_Short_Circuits: 2,
    Outages_hours_per_year: 1.2,
    Current_A: 140.0,
    Voltage_kV: 11.1,
    Temp_score: 0.85,
    Age_score: 0.78,
    Maintenance_score: 0.90,
    ShortCircuit_score: 0.70,
    Outage_score: 0.80,
    Current_score: 0.88,
    Voltage_score: 0.92,
    HI: 0.86,
    Predicted_HI: 0.85,
  });
  log('PUT /api/admin/transformers/1/data', editResult);

  // ── 7. DELETE /api/admin/transformers/1/data?ts=... ───────────
  const ts = encodeURIComponent(testTs);
  log(`DELETE /api/admin/transformers/1/data?ts=${testTs}`, await del(`/api/admin/transformers/1/data?ts=${ts}`));

  // ── 8. PUT /api/admin/transformers/transformer_1 (update meta) ─
  log('PUT /api/admin/transformers/transformer_1', await put('/api/admin/transformers/transformer_1', {
    name: 'Main Grid Alpha',
    location: 'Substation Alpha',
    type: 'Distribution',
    capacity: 100,
    status: 'GOOD',
  }));

  // ── 8b. Restore original name after test ──────────────────────
  await put('/api/admin/transformers/transformer_1', {
    name: 'Transformer 1',
    location: 'Substation Alpha',
    type: 'Distribution',
    capacity: 50,
    status: 'GOOD',
  });
  console.log('\n  ↩ transformer_1 name restored to "Transformer 1"');

  // ── 9. Invalid table name (security) ──────────────────────────
  log('GET /api/admin/transformers/999/data [invalid]', await get('/api/admin/transformers/999/data'));

  console.log(`\n${'─'.repeat(60)}`);
  console.log('\n✅  Test suite finished.\n');
}

run().catch(console.error);
