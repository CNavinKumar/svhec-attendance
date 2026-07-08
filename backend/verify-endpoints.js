const http = require('http');

const request = (method, path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, rawBody: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function runTests() {
  console.log('--- Starting System Verification Tests ---');

  try {
    // 1. Authenticate Faculty (Ms. Chitra)
    const chitraLogin = await request('POST', '/api/auth/login', {
      email: 'chitra@college.edu',
      password: 'password123'
    });
    
    if (chitraLogin.statusCode === 200 && chitraLogin.body.token) {
      console.log('✅ PASS: Faculty Login successful');
    } else {
      console.log('❌ FAIL: Faculty Login failed', chitraLogin);
      process.exit(1);
    }
    
    const token = chitraLogin.body.token;
    const authHeader = { 'Authorization': `Bearer ${token}` };

    // 2. Authenticate Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@college.edu',
      password: 'adminpassword'
    });
    
    if (adminLogin.statusCode === 200 && adminLogin.body.token) {
      console.log('✅ PASS: Admin Login successful');
    } else {
      console.log('❌ FAIL: Admin Login failed', adminLogin);
      process.exit(1);
    }

    const adminToken = adminLogin.body.token;
    const adminAuthHeader = { 'Authorization': `Bearer ${adminToken}` };

    // 3. Verify Today's Date mapping (July 7, 2026 -> should be Day 4)
    const todayRes = await request('GET', '/api/schedule/today?date=2026-07-07', null, authHeader);
    if (todayRes.statusCode === 200 && todayRes.body.dayNumber === 4) {
      console.log('✅ PASS: July 7, 2026 correctly maps to Day 4');
    } else {
      console.log('❌ FAIL: Date mapping check failed', todayRes.body);
      process.exit(1);
    }

    // 4. Verify Timetable details for Day 4 (Ms. Chitra has UHV2 in Period 2)
    const timetableRes = await request('GET', '/api/timetable/my-schedule/4', null, authHeader);
    const p2UHV = timetableRes.body.schedule.find(p => p.period === 2);
    if (timetableRes.statusCode === 200 && p2UHV && p2UHV.subjectAcronym === 'UHV2') {
      console.log('✅ PASS: Day 4 Timetable fetched correctly (Period 2: UHV2)');
    } else {
      console.log('❌ FAIL: Timetable retrieval failed', timetableRes.body);
      process.exit(1);
    }

    // 5. Test Holiday Recalculation & Day-Shifting logic
    console.log('Testing Holiday Day Shifting...');
    
    // Set July 6, 2026 (normally Day 3) as a Holiday
    const setHoliday = await request('POST', '/api/schedule/holiday', {
      date: '2026-07-06',
      isHoliday: true,
      description: 'Holiday - Test Event'
    }, adminAuthHeader);
    
    if (setHoliday.statusCode === 200) {
      console.log('✅ PASS: Set July 6 as Holiday successful');
    } else {
      console.log('❌ FAIL: Setting holiday failed', setHoliday.body);
      process.exit(1);
    }

    // July 7 should now shift from Day 4 to Day 3!
    const shiftedToday = await request('GET', '/api/schedule/today?date=2026-07-07', null, authHeader);
    if (shiftedToday.statusCode === 200 && shiftedToday.body.dayNumber === 3) {
      console.log('✅ PASS: Holiday Shifting worked! July 7 shifted to Day 3');
    } else {
      console.log('❌ FAIL: Day shifting failed', shiftedToday.body);
      process.exit(1);
    }

    // 6. Reset July 6 back to Working Day and verify recalculation shifts July 7 back to Day 4
    console.log('Reverting Holiday Day Shifting...');
    const revertHoliday = await request('POST', '/api/schedule/holiday', {
      date: '2026-07-06',
      isHoliday: false,
      description: 'Day 3'
    }, adminAuthHeader);

    const revertedToday = await request('GET', '/api/schedule/today?date=2026-07-07', null, authHeader);
    if (revertedToday.statusCode === 200 && revertedToday.body.dayNumber === 4) {
      console.log('✅ PASS: Revert Holiday Shifting worked! July 7 shifted back to Day 4');
    } else {
      console.log('❌ FAIL: Reverting day shifting failed', revertedToday.body);
      process.exit(1);
    }

    console.log('🎉 --- ALL TESTS COMPLETED SUCCESSFULY! Backend is fully functional. ---');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during integration tests:', error);
    process.exit(1);
  }
}

runTests();
