const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User         = require('./models/User');
const Event        = require('./models/Event');
const Submission   = require('./models/Submission');
const Achievement  = require('./models/Achievement');
const Notification = require('./models/Notification');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MONGO_URI   = 'mongodb://localhost:27017/campuseventtracker';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('');
  console.log('='.repeat(58));
  console.log('   CAMPUS EVENT TRACKER  --  DATA STORE MAP');
  console.log('='.repeat(58));
  console.log('  DATABASE  : MongoDB');
  console.log(`  URI       : ${MONGO_URI}`);
  console.log('  DB NAME   : campuseventtracker');
  console.log('');
  console.log('  COLLECTIONS (MongoDB):');
  console.log('    [1] users         -- Student & Faculty accounts');
  console.log('    [2] events        -- All event registrations');
  console.log('    [3] submissions   -- Geotag photos & certificates');
  console.log('    [4] achievements  -- Verified achievement records');
  console.log('    [5] notifications -- In-app notifications');
  console.log('');
  console.log('  FILE STORAGE (uploaded files):');
  console.log(`    ${UPLOADS_DIR}`);
  console.log('='.repeat(58));
  console.log('');
  console.log('  Starting data wipe...');
  console.log('-'.repeat(58));

  // ── Clear MongoDB collections ──────────────────────────────
  const users    = await User.deleteMany({});
  console.log(`  Deleted ${users.deletedCount.toString().padStart(3)} user(s)         [collection: users]`);

  const events   = await Event.deleteMany({});
  console.log(`  Deleted ${events.deletedCount.toString().padStart(3)} event(s)        [collection: events]`);

  const subs     = await Submission.deleteMany({});
  console.log(`  Deleted ${subs.deletedCount.toString().padStart(3)} submission(s)    [collection: submissions]`);

  const achs     = await Achievement.deleteMany({});
  console.log(`  Deleted ${achs.deletedCount.toString().padStart(3)} achievement(s)   [collection: achievements]`);

  const notifs   = await Notification.deleteMany({});
  console.log(`  Deleted ${notifs.deletedCount.toString().padStart(3)} notification(s) [collection: notifications]`);

  // ── Clear uploaded files ───────────────────────────────────
  let fileCount = 0;
  let fileErrors = 0;
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    fileCount = files.length;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      } catch {
        fileErrors++;
      }
    }
    const deleted = fileCount - fileErrors;
    console.log(`  Deleted ${deleted.toString().padStart(3)} file(s)          [folder: uploads/]`);
    if (fileErrors > 0) console.log(`  WARNING: ${fileErrors} file(s) could not be deleted`);
  } else {
    console.log(`  uploads/ folder not found -- skipped`);
  }

  console.log('-'.repeat(58));
  console.log('');
  console.log('  ALL DATA CLEARED SUCCESSFULLY! Database is now empty.');
  console.log('');

  process.exit(0);
}).catch(err => {
  console.error('❌ Connection Error:', err.message);
  process.exit(1);
});

