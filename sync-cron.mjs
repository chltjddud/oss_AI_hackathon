// Script executed by Linux Crontab every day at KST 08:00 (UTC 23:00)
import { crawlAllHistoricalData, syncNoticesToSupabase } from './lib/crawler.js';

console.log(`[${new Date().toISOString()}] Cron job started: Updating Suncheon notices and syncing to Supabase...`);

async function runCron() {
  try {
    const res = await crawlAllHistoricalData(5);
    console.log(`[${new Date().toISOString()}] Crawling complete. Total: ${res.total} (Welfare: ${res.welfareCount}, Notice: ${res.noticeCount})`);
    const syncRes = await syncNoticesToSupabase([...res.welfare, ...res.notice]);
    console.log(`[${new Date().toISOString()}] Supabase sync result:`, syncRes);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, err);
    process.exit(1);
  }
}

runCron();
