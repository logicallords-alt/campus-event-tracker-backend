const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/campuseventtracker').then(async () => {
  console.log('Connected to MongoDB');
  const existing = await User.findOne({ email: 'faculty@example.com' });
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);
    await User.create({
      name: 'Dr. Faculty Admin',
      email: 'faculty@example.com',
      password: password,
      role: 'faculty'
    });
    console.log('Faculty user created! Login with: faculty@example.com / password123');
  } else {
    console.log('Faculty user already exists.');
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
