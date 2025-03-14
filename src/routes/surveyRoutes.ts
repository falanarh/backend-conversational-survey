// src/routes/surveyRoutes.ts

import { Router } from 'express';
import { 
  handleStartSurvey, 
  handleProcessSurveyResponse,
  handleCompleteSurvey
} from '../controllers/surveyController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route   POST /api/survey/start
 * @desc    Start a survey session
 * @access  Private
 */
router.post('/start', protect, handleStartSurvey);

/**
 * @route   POST /api/survey/respond
 * @desc    Process a survey response
 * @access  Private
 */
router.post('/respond', protect, handleProcessSurveyResponse);

/**
 * @route   POST /api/survey/complete
 * @desc    Manually complete a survey
 * @access  Private
 */
router.post('/complete', protect, handleCompleteSurvey);

export default router;