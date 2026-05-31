const express = require('express');
const jwt = require('jsonwebtoken');
const Item = require('../models/Item');
const Matcher = require('../utils/matcher');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'findit_super_secret_key';

// Auth middleware — same logic as in auth.js but kept simple here
function requireAuth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

// Get all items, with optional filters for type, category, or search text
router.get('/', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const query = {};

    if (type && type !== 'all') query.type = type;
    if (category && category !== 'all') query.category = category;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex }
      ];
    }

    const items = await Item.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Report a new lost or found item (requires login)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, title, category, description, location, date, color, contactName, contactEmail, keywords, emoji } = req.body;

    if (!type || !title || !category || !description || !location || !date || !contactName || !contactEmail) {
      return res.status(400).json({ msg: 'Please fill in all required fields' });
    }

    const item = new Item({
      type, title, category, description, location, date,
      color: color || '',
      keywords: keywords || [],
      emoji: emoji || '📦',
      contactName, contactEmail,
      userId: req.userId,
      status: 'open'
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Create item error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get a single item by its ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete an item (only the person who reported it can delete it)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ msg: 'Item not found or you are not allowed to delete it' });
    await Item.deleteOne({ _id: req.params.id });
    res.json({ msg: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Mark an item as resolved (only the owner can do this)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found or not authorized' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Find matching items for a specific item
router.get('/:id/matches', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    const allItems = await Item.find({ status: 'open' });
    const matches = Matcher.findMatchesForItem(item, allItems, 25);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all matched pairs across all open items
router.get('/matches/all', async (req, res) => {
  try {
    const items = await Item.find({ status: 'open' });
    const matches = Matcher.findMatches(items, 30);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
