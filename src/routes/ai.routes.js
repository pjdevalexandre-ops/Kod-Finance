const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Rota principal de chat com o consultor financeiro
router.post('/chat', aiController.chat);
router.post('/scan-receipt', aiController.scanReceipt);

module.exports = router;
