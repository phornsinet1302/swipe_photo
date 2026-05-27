const { Router } = require('express');
const { start, finish, show } = require('../controllers/sessionController');

const router = Router();

router.post('/', start);
router.get('/:id', show);
router.patch('/:id', finish);

module.exports = router;
