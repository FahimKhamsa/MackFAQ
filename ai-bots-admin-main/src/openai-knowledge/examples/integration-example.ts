import { Injectable } from '@nestjs/common';
import { OpenaiKnowledgeService } from '../openai-knowledge.service';

/**
 * Example integration showing how to use OpenAI Knowledge Retrieval
 * with your existing chat system
 */
@Injectable()
export class ChatIntegrationExample {
  constructor(
    private readonly openaiKnowledgeService: OpenaiKnowledgeService,
  ) {}

  /**
   * Enhanced chat method that tries knowledge base first,
   * then falls back to existing system
   */
  async enhancedChat(
    projectId: number,
    userMessage: string,
    threadId?: string,
  ) {
    try {
      // First, try to get answer from knowledge base
      const knowledgeResult = await this.openaiKnowledgeService.askQuestion(
        projectId,
        userMessage,
        threadId,
      );

      if (knowledgeResult.answer) {
        return {
          response: knowledgeResult.answer,
          source: 'knowledge-base',
          threadId: knowledgeResult.threadId,
          messageId: knowledgeResult.messageId,
          confidence: 'high', // Knowledge base responses are typically high confidence
        };
      }
    } catch (error) {
      console.log('Knowledge base failed, using fallback:', error.message);
    }

    // Fallback to existing chat logic
    return {
      response:
        "I apologize, but I don't have specific information about that in my knowledge base. Could you please provide more context or try rephrasing your question?",
      source: 'fallback',
      confidence: 'low',
    };
  }

  /**
   * Initialize knowledge base for a project
   */
  async initializeProjectKnowledge(
    projectId: number,
    customInstructions?: string,
  ) {
    const defaultInstructions = `
      You are a helpful AI assistant for this project. 
      Use the uploaded documents and files to provide accurate, 
      contextual answers to user questions. 
      If you cannot find relevant information in the uploaded files, 
      clearly state that the information is not available in the knowledge base.
    `;

    return await this.openaiKnowledgeService.createOrGetAssistant(
      projectId,
      customInstructions || defaultInstructions,
    );
  }

  /**
   * Upload multiple files for a project
   */
  async uploadProjectDocuments(
    projectId: number,
    files: { buffer: Buffer; filename: string }[],
  ) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.openaiKnowledgeService.uploadFileForRetrieval(
          projectId,
          file.buffer,
          file.filename,
        );
        results.push({
          filename: file.filename,
          success: true,
          fileId: result.fileId,
        });
      } catch (error) {
        results.push({
          filename: file.filename,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get project knowledge base status
   */
  async getProjectKnowledgeStatus(projectId: number) {
    try {
      const assistant = await this.openaiKnowledgeService.getProjectAssistant(
        projectId,
      );
      const files = await this.openaiKnowledgeService.getProjectFiles(
        projectId,
      );

      return {
        hasAssistant: !!assistant,
        assistantId: assistant?.openai_assistant_id,
        fileCount: files.length,
        files: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          fileType: f.file_type,
          status: f.status,
          uploadedAt: f.createdAt,
        })),
      };
    } catch (error) {
      return {
        hasAssistant: false,
        fileCount: 0,
        files: [],
        error: error.message,
      };
    }
  }
}
