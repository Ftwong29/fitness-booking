import { test } from 'bun:test';
import assert from 'assert';

const baseUrl = 'http://localhost:3000';

// Summary table for all test results
const summary: {
  id: string;
  description: string;
  expect: number;
  actual?: number;
  result?: '✅ Pass' | '❌ Fail';
}[] = [];

// Pretty logger with timestamps
function log(title: string, data: any) {
  const time = new Date().toISOString();
  console.log(`\n[${time}] ${title} →`, data);
}

// Reusable login function
async function login(email: string, password: string) {
  try {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    log(`LOGIN ${email}`, { status: res.status, ...data });
    return { status: res.status, token: data.token };
  } catch (err) {
    log(`LOGIN ERROR ${email}`, err);
    throw err;
  }
}

// Safer JSON parsing fallback
async function safeJSON(res: Response) {
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) return await res.json();
  return { raw: await res.text() };
}

// Utility to define each test case
const runTest = (
  id: string,
  description: string,
  expect: number,
  fn: () => Promise<Response>
) =>
  test(`${id} ${description}`, async () => {
    const row = { id, description, expect };

    try {
      const res = await fn();
      const data = await safeJSON(res);

      log(`${id} ${description}`, { status: res.status, ...data });

      row.actual = res.status;
      row.result = res.status === row.expect ? '✅ Pass' : '❌ Fail';
      summary.push(row);

      assert.strictEqual(res.status, row.expect);
    } catch (e) {
      row.actual = 500;
      row.result = '❌ Fail';
      summary.push(row);
      console.error(`${id} ERROR`, e);
      throw e;
    }
  });

// Test 1: Admin should access /users successfully
runTest('[1]', '✅ Admin login and GET /users (should succeed)', 200, async () => {
  const { token } = await login('alice@example.com', 'password123');
  return fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
});

// Test 2: Normal user should be forbidden
runTest('[2]', '❌ Normal user GET /users (should fail 403)', 403, async () => {
  const { token } = await login('bob@example.com', 'password123');
  return fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
});

// Test 3: Get machines list with filters
runTest('[3]', '✅ GET /machines with token', 200, async () => {
  const { token } = await login('bob@example.com', 'password123');

  const query =
    '?page=1&limit=3&lat=3.15&lng=101.7&startTime=2025-04-18T10:00:00Z&endTime=2025-04-18T11:00:00Z';

  return fetch(`${baseUrl}/machines${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
});

// Test 4: Successful booking - should return 200
runTest('[4]', '✅ Successful booking (no conflict)', 200, async () => {
  const { token } = await login('alice@example.com', 'password123');

  const now = new Date();
  const safeStart = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const safeEnd = new Date(safeStart.getTime() + 60 * 60 * 1000);

  return fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: 1,
      machineId: 2,
      instructorId: 2,
      startTime: safeStart.toISOString(),
      endTime: safeEnd.toISOString()
    })
  });
});

// Test 5: Conflict (same time, same machine and instructor)
runTest('[5]', '❌ Booking with conflict (machine + instructor)', 409, async () => {
  const { token } = await login('bob@example.com', 'password123');
  const now = new Date();
  const start = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: 2,
      machineId: 2,
      instructorId: 2,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
  });
});

// Test 6: Cooldown violation (less than 10 min buffer)
runTest('[6]', '❌ Booking fails cooldown rule', 409, async () => {
  const { token } = await login('charlie@example.com', 'password123');
  const now = new Date();
  const start = new Date(now.getTime() + 7 * 60 * 60 * 1000 - 5 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: 3,
      machineId: 2,
      instructorId: 3,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
  });
});

// Test 7: Conflict on machine only (instructor is available)
runTest('[7]', '❌ Booking with machine conflict only', 409, async () => {
  const { token } = await login('alice@example.com', 'password123');
  const now = new Date();
  const start = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: 2,
      machineId: 2,
      instructorId: 3,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
  });
});

// Test 8: Conflict on instructor only (machine is available)
runTest('[8]', '❌ Booking with instructor conflict only', 409, async () => {
  const { token } = await login('bob@example.com', 'password123');
  const now = new Date();
  const start = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return fetch(`${baseUrl}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: 2,
      machineId: 3,
      instructorId: 2,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
  });
});

// Summary printer
test('[SUMMARY] 📋 Summary of test results', () => {
  console.log('\n📋 Test Summary:\n');
  console.table(summary);
});
