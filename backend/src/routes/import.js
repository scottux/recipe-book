import express from 'express';
import { importBackup } from '../controllers/importController.js';
import { authenticate } from '../middleware/auth.js';
import { importLimiter } from '../middleware/uploadLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/import/backup
 * @desc    Import full backup file (recipes, collections, meal plans, shopping lists)
 * @access  Private
 * @body    file: JSON backup file (multipart/form-data)
 *          mode: 'merge' | 'replace' (optional, default: 'merge')
 *          password: string (required if mode='replace')
 */
router.post('/backup', authenticate, importLimiter, importBackup);

export default router;