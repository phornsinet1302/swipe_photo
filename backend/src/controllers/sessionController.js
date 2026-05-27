const asyncHandler = require('../utils/asyncHandler');
const { createSession, getSession, updateSession } = require('../models/Session');

const start = asyncHandler(async (req, res) => {
  const { photoCount = 0 } = req.body || {};
  const session = await createSession(photoCount);
  res.status(201).json(session);
});

const finish = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reviewed, deleted, kept, bytesFreed } = req.body || {};
  const updated = await updateSession(id, { reviewed, deleted, kept, bytesFreed });
  if (!updated) return res.status(404).json({ error: 'Session not found' });
  res.json(updated);
});

const show = asyncHandler(async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

module.exports = { start, finish, show };
