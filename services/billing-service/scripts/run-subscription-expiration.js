#!/usr/bin/env node

/**
 * Script to manually run subscription expiration job
 * Usage: node scripts/run-subscription-expiration.js
 */

require('dotenv').config();

const subscriptionExpirationJob = require('../src/jobs/subscription-expiration.job');

async function main() {
  console.log('='.repeat(60));
  console.log('Running Subscription Expiration Job Manually');
  console.log('='.repeat(60));
  console.log('');

  try {
    const result = await subscriptionExpirationJob.runExpirationJob();

    console.log('');
    console.log('='.repeat(60));
    if (result.success) {
      console.log('✅ Job completed successfully!');
      console.log(`   Expired subscriptions: ${result.expiredCount}`);
      if (result.subscriptions.length > 0) {
        console.log('   Subscription IDs:');
        result.subscriptions.forEach(sub => {
          console.log(`     - ${sub.id} (member: ${sub.member_id})`);
        });
      }
    } else {
      console.log('❌ Job failed!');
      console.log(`   Error: ${result.error}`);
    }
    console.log('='.repeat(60));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Fatal error running job:');
    console.error(error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();



