const cron = require('node-cron');
const rewardService = require('../services/reward.service.js');

let expireJob = null;

function startExpireJob() {
  // Run every day at 2 AM
  expireJob = cron.schedule('0 2 * * *', async () => {
    console.log('[TIMER] Running auto-expire redemptions job...');
    try {
      const result = await rewardService.expireOldRedemptions();
      if (result.success) {
        console.log(`[SUCCESS] Expired ${result.expired} redemptions`);
      } else {
        console.error('[ERROR] Auto-expire job failed:', result.error);
      }
    } catch (error) {
      console.error('[ERROR] Auto-expire job error:', error);
    }
  });

  console.log('[SUCCESS] Auto-expire redemptions job started (runs daily at 2 AM)');
}

function stopExpireJob() {
  if (expireJob) {
    expireJob.stop();
    expireJob = null;
    console.log('[STOP] Auto-expire redemptions job stopped');
  }
}

module.exports = {
  startExpireJob,
  stopExpireJob,
};

