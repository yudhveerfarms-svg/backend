/**
 * Legacy entry — prefer: npm run seed:admin
 */
const { run } = require('../seeders/adminSeeder');

run()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error.code === 'ADMIN_SEED_CONFIG') {
      console.error(error.message);
    } else {
      console.error('[admin-seeder]', error);
    }
    process.exit(1);
  });
