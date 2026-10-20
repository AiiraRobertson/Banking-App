const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/topup', (req, res) => {
  res.status(410).json({
    error: 'Direct account top-ups are unavailable. Receive funds only through a verified transfer.',
    code: 'DIRECT_FUNDING_DISABLED',
  });
});

module.exports = router;
