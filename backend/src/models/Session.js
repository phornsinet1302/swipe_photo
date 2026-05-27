const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  photoCount: { type: Number, default: 0 },
  reviewed: { type: Number, default: 0 },
  deleted: { type: Number, default: 0 },
  kept: { type: Number, default: 0 },
  bytesFreed: { type: Number, default: 0 },
});

// Expose `id` (string) instead of `_id`/`__v` so API responses stay stable.
sessionSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

const Session = mongoose.model('Session', sessionSchema);

function createSession(photoCount = 0) {
  return Session.create({ photoCount });
}

function getSession(id) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
  return Session.findById(id);
}

function updateSession(id, patch = {}) {
  if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);

  // Drop undefined keys so partial updates don't wipe existing fields.
  const update = { finishedAt: new Date() };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) update[key] = value;
  }

  return Session.findByIdAndUpdate(id, update, { new: true });
}

function listSessions() {
  return Session.find();
}

module.exports = { Session, createSession, getSession, updateSession, listSessions };
