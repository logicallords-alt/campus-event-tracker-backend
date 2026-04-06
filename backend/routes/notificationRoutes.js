const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// GET my notifications (newest first)
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Notification.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── IMPORTANT: Define specific routes BEFORE dynamic /:id routes ───

// Mark ALL my notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear ALL my notifications (DELETE from database)
router.delete('/clear-all', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ user_id: req.user.id });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark one notification as read (must come AFTER /read-all)
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user_id: req.user.id }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
