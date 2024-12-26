import { Router } from "express";
import { handleEvaluateInformationExtraction, handleInformationExtraction } from "../controllers/informationExtractionController";

const router = Router();

/**
 * @route   POST /api/information-extraction
 * @desc    Extract information from response
 * @access  Public
 * @body    {
 *            question: string,
 *            response: string
 *          }
 */
router.post("/extract", handleInformationExtraction);

/**
 * @route   POST /api/information-extraction/evaluate
 * @desc    Evaluate information extraction
 * @access  Public
 */
router.post("/evaluate", handleEvaluateInformationExtraction);


export default router;
