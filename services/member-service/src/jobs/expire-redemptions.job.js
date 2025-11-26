const cron = require('node-cron');
const rewardService = require('../services/reward.service.js');

let expireJob = null;

function startExpireJob() {
  // Run every day at 2 AM
  expireJob = cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running auto-expire redemptions job...');
    try {
      const result = await rewardService.expireOldRedemptions();
      if (result.success) {
        console.log(`✅ Expired ${result.expired} redemptions`);
      } else {
        console.error('❌ Auto-expire job failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Auto-expire job error:', error);
    }
  });

  console.log('✅ Auto-expire redemptions job started (runs daily at 2 AM)');
}

function stopExpireJob() {
  if (expireJob) {
    expireJob.stop();
    expireJob = null;
    console.log('🛑 Auto-expire redemptions job stopped');
  }
}

module.exports = {
  startExpireJob,
  stopExpireJob,
};

