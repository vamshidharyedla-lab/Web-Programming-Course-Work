const mongoose = require('mongoose');

// Each item is either "lost" or "found", belongs to a user, and has contact info
const itemSchema = new mongoose.Schema({
  type:         { type: String, enum: ['lost', 'found'], required: true },
  title:        { type: String, required: true },
  description:  { type: String, required: true },
  category:     { type: String, required: true },
  location:     { type: String, required: true },
  date:         { type: String, required: true },
  color:        { type: String, default: '' },
  keywords:     [{ type: String }],
  emoji:        { type: String, default: '📦' },
  contactName:  { type: String, required: true },
  contactEmail: { type: String, required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);
