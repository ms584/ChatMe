const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // mongoose 8 no longer needs these options but kept for clarity
    });
    mongoose.set('strictQuery', true);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
