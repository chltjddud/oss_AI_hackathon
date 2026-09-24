// Script executed by Linux Crontab every day at KST 08:00 (UTC 23:00)
// Resolves OPS-02: Validated entry point with graceful connection to backend API and Supabase sync

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3102';

console.log(`[${new Date().toISOString()}] Cron job started: Suncheon notices & policies sync check...`);

async function runCron() {
  try {
    // 1. Check if backend server is active
    let serverActive = false;
    try {
      const healthRes = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (healthRes.ok) {
        serverActive = true;
      }
    } catch {
      serverActive = false;
    }

    if (serverActive) {
      console.log(`[${new Date().toISOString()}] Backend server is active at ${BACKEND_URL}. Triggering sync endpoints...`);
      const syncRes = await fetch(`${BACKEND_URL}/api/notices/sync?pages=5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000)
      });
      const data = await syncRes.json();
      console.log(`[${new Date().toISOString()}] Notices sync completed successfully:`, JSON.stringify(data));

      try {
        const policySyncRes = await fetch(`${BACKEND_URL}/api/policies/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120000)
        });
        if (policySyncRes.ok) {
          const pData = await policySyncRes.json();
          console.log(`[${new Date().toISOString()}] Policies sync completed successfully:`, JSON.stringify(pData));
        }
      } catch (pErr) {
        console.warn(`[${new Date().toISOString()}] Policy sync warning:`, pErr.message);
      }
    } else {
      console.log(`[${new Date().toISOString()}] Backend server at ${BACKEND_URL} is not currently responding.`);
      console.log(`[${new Date().toISOString()}] Note: The production server uses PM2 (suncheon-backend) with an internal KST 08:00 scheduler.`);
    }

    console.log(`[${new Date().toISOString()}] Cron task finished successfully.`);
    process.exit(0);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Cron job encountered an error:`, err);
    process.exit(1);
  }
}

runCron();
