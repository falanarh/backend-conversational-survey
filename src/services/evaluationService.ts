// src/services/evaluationService.ts

import SurveyEvaluation, { ISurveyEvaluation } from '../models/SurveyEvaluation';
import User from '../models/User';
import mongoose from 'mongoose';

/**
 * Initialize a new survey evaluation for a user
 * @param userId The user's ID
 * @param sessionId Optional survey session ID to link the evaluation to
 * @returns The created evaluation object
 */
export const initializeEvaluation = async (
  userId: string,
  sessionId?: string
): Promise<ISurveyEvaluation> => {
  // Start a mongoose transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the user
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if the user already has an active evaluation in their reference
    if (user.activeEvaluationSessionId) {
      // Look up the evaluation
      const existingEvaluation = await SurveyEvaluation.findById(user.activeEvaluationSessionId).session(session);
      
      // If it exists and is not completed, return it
      if (existingEvaluation && !existingEvaluation.completed) {
        await session.abortTransaction();
        session.endSession();
        return existingEvaluation;
      }
      
      // If the evaluation doesn't exist, clear the reference
      // But if it's completed, keep the reference since we want to maintain
      // completed evaluation references
      if (!existingEvaluation) {
        user.activeEvaluationSessionId = undefined;
        await user.save({ session });
      }
    }

    // Alternative check: look for any incomplete evaluation for this user
    let evaluation = await SurveyEvaluation.findOne({
      user_id: userId,
      completed: false
    }).session(session);

    // If found, update the user reference and return the existing evaluation
    if (evaluation) {
      user.activeEvaluationSessionId = evaluation._id as mongoose.Types.ObjectId;
      await user.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      return evaluation;
    }

    // Create a new evaluation
    const newEvaluation = new SurveyEvaluation({
      user_id: new mongoose.Types.ObjectId(userId),
      session_id: sessionId ? new mongoose.Types.ObjectId(sessionId) : undefined,
      answers: {},
      completed: false
    });

    await newEvaluation.save({ session });
    
    // Update the user's reference
    user.activeEvaluationSessionId = newEvaluation._id as mongoose.Types.ObjectId;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();
    return newEvaluation;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error initializing survey evaluation:', error);
    throw error;
  }
};

/**
 * Submit an answer for a specific evaluation question
 * @param evaluationId The evaluation ID
 * @param questionId The question identifier
 * @param value The answer value (numeric)
 * @returns The updated evaluation object
 */
export const submitAnswer = async (
  evaluationId: string,
  questionId: string,
  value: number
): Promise<ISurveyEvaluation> => {
  try {
    // Find the evaluation
    const evaluation = await SurveyEvaluation.findById(evaluationId);
    
    if (!evaluation) {
      throw new Error('Survey evaluation not found');
    }
    
    if (evaluation.completed) {
      throw new Error('Cannot modify a completed evaluation');
    }

    // Validate the question ID
    const validQuestionIds = [
      'ease_of_use', 
      'participation_ease', 
      'enjoyment', 
      'data_security', 
      'privacy_safety',
      'mental_effort'
    ];
    
    if (!validQuestionIds.includes(questionId)) {
      throw new Error(`Invalid question ID: ${questionId}`);
    }

    // Validate the value range
    const maxValue = questionId === 'mental_effort' ? 9 : 7;
    if (value < 1 || value > maxValue) {
      throw new Error(`Value must be between 1 and ${maxValue} for ${questionId}`);
    }

    // Update the answer
    evaluation.answers = {
      ...evaluation.answers,
      [questionId]: value
    };

    await evaluation.save();
    return evaluation;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Complete a survey evaluation
 * @param evaluationId The evaluation ID
 * @returns The completed evaluation object
 */
export const completeEvaluation = async (
  evaluationId: string
): Promise<ISurveyEvaluation> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the evaluation
    const evaluation = await SurveyEvaluation.findById(evaluationId).session(session);
    
    if (!evaluation) {
      throw new Error('Survey evaluation not found');
    }
    
    if (evaluation.completed) {
      await session.abortTransaction();
      session.endSession();
      return evaluation; // Already completed
    }

    // Verify all questions are answered
    const requiredQuestions = [
      'ease_of_use', 
      'participation_ease', 
      'enjoyment', 
      'data_security', 
      'privacy_safety',
      'mental_effort'
    ];
    
    const missingQuestions = requiredQuestions.filter(question => 
      !evaluation.answers.hasOwnProperty(question)
    );

    if (missingQuestions.length > 0) {
      throw new Error(`Missing answers for questions: ${missingQuestions.join(', ')}`);
    }

    // Mark as completed
    evaluation.completed = true;
    await evaluation.save({ session });
    
    // We no longer remove the activeEvaluationSessionId reference
    // This allows users to maintain a reference to their completed evaluation

    await session.commitTransaction();
    session.endSession();
    
    return evaluation;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error completing evaluation:', error);
    throw error;
  }
};

/**
 * Get evaluation by ID
 * @param evaluationId The evaluation ID
 * @returns The evaluation object
 */
export const getEvaluationById = async (
  evaluationId: string
): Promise<ISurveyEvaluation | null> => {
  try {
    return await SurveyEvaluation.findById(evaluationId);
  } catch (error) {
    console.error('Error getting evaluation:', error);
    throw error;
  }
};

/**
 * Get user's latest evaluation
 * @param userId The user's ID
 * @returns The latest evaluation object or null
 */
export const getUserLatestEvaluation = async (
  userId: string
): Promise<ISurveyEvaluation | null> => {
  try {
    return await SurveyEvaluation.findOne({ user_id: userId })
      .sort({ created_at: -1 });
  } catch (error) {
    console.error('Error getting user\'s latest evaluation:', error);
    throw error;
  }
};