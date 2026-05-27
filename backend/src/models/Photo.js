const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  sessionId: { type: String, default: null, index: true },
  assetId: { type: String, required: true },
  filename: { type: String, default: null },
  fileSize: { type: Number, default: 0 },
  decision: { type: String, enum: ['keep', 'delete'], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Expose `id` (string) instead of `_id`/`__v` so API responses stay stable.
photoSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Photo = mongoose.model('Photo', photoSchema);

function recordPhoto({ sessionId, assetId, filename, fileSize, decision }) {
  return Photo.create({
    sessionId: sessionId || null,
    assetId,
    filename: filename || null,
    fileSize: Number(fileSize) || 0,
    decision,
  });
}

function listPhotos(sessionId) {
  return sessionId ? Photo.find({ sessionId }) : Photo.find();
}

module.exports = { Photo, recordPhoto, listPhotos };
