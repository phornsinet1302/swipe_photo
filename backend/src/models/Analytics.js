const { Photo } = require('./Photo');
const { Session } = require('./Session');

// Aggregates analytics directly in MongoDB.
async function getSummary() {
  const [photoAgg] = await Photo.aggregate([
    {
      $group: {
        _id: null,
        totalReviewed: { $sum: 1 },
        totalKept: {
          $sum: { $cond: [{ $eq: ['$decision', 'keep'] }, 1, 0] },
        },
        totalDeleted: {
          $sum: { $cond: [{ $eq: ['$decision', 'delete'] }, 1, 0] },
        },
        bytesFreed: {
          $sum: { $cond: [{ $eq: ['$decision', 'delete'] }, '$fileSize', 0] },
        },
      },
    },
  ]);

  const sessionsCompleted = await Session.countDocuments({
    finishedAt: { $ne: null },
  });

  return {
    totalReviewed: photoAgg?.totalReviewed || 0,
    totalKept: photoAgg?.totalKept || 0,
    totalDeleted: photoAgg?.totalDeleted || 0,
    bytesFreed: photoAgg?.bytesFreed || 0,
    sessionsCompleted,
  };
}

module.exports = { getSummary };
