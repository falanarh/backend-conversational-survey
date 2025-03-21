// src/controllers/surveyController.ts

import { Request, Response } from "express";
import {
  startSurveySession,
  processSurveyResponse,
  getUserActiveSurveySession,
  completeSurveySession,
  getSurveySessionStatus,
  getSurveySessionMessages,
} from "../services/surveyService";
import QuestionnaireModel from "../models/Questionnaire";
import { IUser } from "../models/User";

export const handleStartSurvey = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.user._id;
    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }

    // Get the latest questionnaire
    const latestQuestionnaire = await QuestionnaireModel.findOne().sort({
      createdAt: -1,
    });
    if (!latestQuestionnaire) {
      res
        .status(404)
        .json({ success: false, message: "Questionnaire not found" });
      return;
    }

    // Check if user already has an active session
    const existingSession = await getUserActiveSurveySession(userId);
    if (existingSession) {
      // Get the current question from the session's progress
      const currentQuestionIndex = existingSession.current_question_index;
      let currentQuestion = latestQuestionnaire.survey.categories.flatMap(
        (category: any) => category.questions
      )[currentQuestionIndex];

      res.status(200).json({
        success: true,
        message: "Resuming existing survey session",
        additional_info:
          "Anda sudah memiliki sesi survei yang aktif. Melanjutkan sesi tersebut.",
        session_id: existingSession._id,
        current_question_index: currentQuestionIndex,
        next_question: currentQuestion.text,
      });
      return;
    }

    // Start a new survey session
    const session = await startSurveySession(
      userId,
      latestQuestionnaire.survey
    );

    res.status(201).json({
      success: true,
      additional_info: `Selamat datang! Survei ini bertujuan untuk mengumpulkan informasi tentang proﬁl wisatawan nusantara, maksud perjalanan, akomodasi yang digunakan, lama perjalanan, dan rata-rata pengeluaran terkait perjalanan yang dilakukan oleh penduduk Indonesia di dalam wilayah teritorial Indonesia.`,
      next_question: latestQuestionnaire.survey.categories[0].questions[0].text,
      session_id: session._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const handleProcessSurveyResponse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { session_id, user_response } = req.body;

    // Validate required fields
    if (!session_id || user_response === undefined) {
      res.status(400).json({
        success: false,
        message: "Session ID and response are required",
      });
      return;
    }

    // Verify the session belongs to the authenticated user
    const userId = req.user._id;
    const userSession = await getUserActiveSurveySession(userId);

    if (!userSession || (userSession as any)._id.toString() !== session_id) {
      res.status(403).json({
        success: false,
        message:
          "Unauthorized: This survey session does not belong to the authenticated user",
      });
      return;
    }

    // Get the latest questionnaire
    const latestQuestionnaire = await QuestionnaireModel.findOne().sort({
      createdAt: -1,
    });
    if (!latestQuestionnaire) {
      res.status(404).json({
        success: false,
        message: "Questionnaire not found",
      });
      return;
    }

    // Process the response
    const response = await processSurveyResponse(
      session_id,
      user_response,
      latestQuestionnaire.survey
    );

    res.json({ success: true, ...response });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

// Manually complete a survey session
export const handleCompleteSurvey = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
      return;
    }

    // Verify the session belongs to the authenticated user
    const userId = req.user._id;
    const userSession = await getUserActiveSurveySession(userId);

    if (!userSession || (userSession as any)._id.toString() !== session_id) {
      res.status(403).json({
        success: false,
        message:
          "Unauthorized: This survey session does not belong to the authenticated user",
      });
      return;
    }

    await completeSurveySession(session_id);

    res.json({
      success: true,
      message: "Survey completed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const handleGetSurveyStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessionId = req.params.id;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
      return;
    }

    // Verify the session belongs to the authenticated user
    const userId = req.user._id;
    const userSession = await getUserActiveSurveySession(userId);

    if (!userSession || (userSession as any)._id.toString() !== sessionId) {
      res.status(403).json({
        success: false,
        message:
          "Unauthorized: This survey session does not belong to the authenticated user",
      });
      return;
    }

    // Get the session status
    const sessionStatus = await getSurveySessionStatus(sessionId);

    res.json({
      success: true,
      data: sessionStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const handleGetSurveyMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessionId = req.params.id;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
      return;
    }

    // Verify the session belongs to the authenticated user
    const userId = req.user._id;
    const userSession = await getUserActiveSurveySession(userId);

    if (!userSession || (userSession as any)._id.toString() !== sessionId) {
      res.status(403).json({
        success: false,
        message:
          "Unauthorized: This survey session does not belong to the authenticated user",
      });
      return;
    }

    // Get all messages for this survey session
    const messages = await getSurveySessionMessages(sessionId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
