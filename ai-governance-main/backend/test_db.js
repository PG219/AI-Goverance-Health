import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/governance_db?authSource=admin';

async function run() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connection successful!');

    console.log('Checking if demo user already exists...');
    const existing = await User.findOne({ email: 'demo@rakfort.com' });
    if (existing) {
      console.log('Demo user exists:', existing);
      process.exit(0);
    }

    console.log('Attempting to create demo user...');
    const user = new User({
      name: 'Demo User',
      email: 'demo@rakfort.com',
      password: 'governance.demo@Rakfort',
      role: 'admin'
    });

    await user.save();
    console.log('Success! Demo user created successfully:', user);
  } catch (err) {
    console.error('Error during database operation:');
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
