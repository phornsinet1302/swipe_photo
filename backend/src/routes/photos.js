const { Router } = require('express');
const { create, index } = require('../controllers/photoController');

const router = Router();

router.post('/', create);
router.get('/', index);

module.exports = router;
