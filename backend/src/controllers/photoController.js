const asyncHandler = require('../utils/asyncHandler');
const { recordPhoto, listPhotos } = require('../models/Photo');

const create = asyncHandler(async (req, res) => {
  const { sessionId, assetId, filename, fileSize, decision } = req.body || {};
  if (!assetId || !decision) {
    return res.status(400).json({ error: 'assetId and decision are required' });
  }
  const record = await recordPhoto({ sessionId, assetId, filename, fileSize, decision });
  res.status(201).json(record);
});

const index = asyncHandler(async (req, res) => {
  res.json(await listPhotos(req.query.sessionId));
});

module.exports = { create, index };
