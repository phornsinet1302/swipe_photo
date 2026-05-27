const asyncHandler = require('../utils/asyncHandler');
const { getSummary } = require('../models/Analytics');

const summary = asyncHandler(async (req, res) => {
  res.json(await getSummary());
});

module.exports = { summary };
