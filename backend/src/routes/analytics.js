const { Router } = require('express');
const { summary } = require('../controllers/analyticsController');

const router = Router();

router.get('/', summary);

module.exports = router;
