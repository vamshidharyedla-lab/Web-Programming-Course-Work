const mongoose = require('mongoose');

// Each user has a name, email, hashed password, department, and a single-letter avatar
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dept:     { type: String, default: '' },
  avatar:   { type: String, default: '' },
  joinedAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
