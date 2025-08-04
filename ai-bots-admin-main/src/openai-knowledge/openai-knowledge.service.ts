import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OpenAI } from 'openai';
import { ProjectAssistantModel } from './entities/project-assistant.model';
import { ProjectFileModel } from './entities/project-file.model';
import { ProjectThreadModel } from './entities/project-thread.model';

@Injectable()
export class OpenaiKnowledgeService {
  private readonly logger = new Logger(OpenaiKnowledgeService.name);
  private openai: OpenAI;

  constructor(
    @InjectModel(ProjectAssistantModel)
    private projectAssistantModel: typeof ProjectAssistantModel,
    @InjectModel(ProjectFileModel)
    private projectFileModel: typeof ProjectFileModel,
    @InjectModel(ProjectThreadModel)
    private projectThreadModel: typeof ProjectThreadModel,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });
  }

  /**
   * Create or get existing assistant for a project
   */
  async createOrGetAssistant(projectId: number, customInstructions?: string) {
    try {
      // Check if assistant already exists for this project
      const existingAssistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (existingAssistant) {
        return {
          assistantId: existingAssistant.openai_assistant_id,
          dbId: existingAssistant.id,
        };
      }

      // Create new OpenAI assistant
      const assistant = await this.openai.beta.assistants.create({
        name: `Project-${projectId}-Assistant`,
        instructions:
          customInstructions ||
          'You are a helpful assistant for this project. Use the uploaded files to answer questions accurately.',
        tools: [{ type: 'file_search' }],
        model: 'gpt-4-1106-preview',
      });

      // Save to database
      const dbAssistant = await this.projectAssistantModel.create({
        project_id: projectId,
        openai_assistant_id: assistant.id,
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        is_active: true,
      });

      return {
        assistantId: assistant.id,
        dbId: dbAssistant.id,
      };
    } catch (error) {
      this.logger.error('Error creating assistant:', error);
      throw new HttpException(
        'Failed to create assistant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload file for knowledge retrieval
   */
  async uploadFileForRetrieval(
    projectId: number,
    fileBuffer: Buffer,
    filename: string,
  ) {
    try {
      // Get or create assistant
      const { assistantId, dbId: assistantDbId } =
        await this.createOrGetAssistant(projectId);

      // Convert Buffer to File-like object for OpenAI
      const fileBlob = new File([fileBuffer], filename, {
        type: 'application/octet-stream',
      });

      // Upload file to OpenAI
      const file = await this.openai.files.create({
        file: fileBlob,
        purpose: 'assistants',
      });

      // Save file info to database
      const dbFile = await this.projectFileModel.create({
        assistant_id: assistantDbId,
        openai_file_id: file.id,
        filename: filename,
        file_type: this.getFileExtension(filename),
        file_size: fileBuffer.length,
        status: 'uploaded',
      });

      return {
        fileId: file.id,
        dbFileId: dbFile.id,
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new HttpException(
        'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(projectId: number, userId?: number, sessionId?: string) {
    try {
      const { assistantId, dbId: assistantDbId } =
        await this.createOrGetAssistant(projectId);

      // Create OpenAI thread
      const thread = await this.openai.beta.threads.create();

      // Save to database
      const dbThread = await this.projectThreadModel.create({
        assistant_id: assistantDbId,
        openai_thread_id: thread.id,
        user_id: userId,
        session_id: sessionId,
        is_active: true,
      });

      return {
        threadId: thread.id,
        dbThreadId: dbThread.id,
      };
    } catch (error) {
      this.logger.error('Error creating thread:', error);
      throw new HttpException(
        'Failed to create thread',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ask a question using the knowledge base
   */
  async askQuestion(
    projectId: number,
    userQuery: string,
    threadId?: string,
    userId?: number,
    sessionId?: string,
  ) {
    try {
      const { assistantId } = await this.createOrGetAssistant(projectId);

      let currentThreadId = threadId;

      // Create new thread if not provided
      if (!currentThreadId) {
        const { threadId: newThreadId } = await this.createThread(
          projectId,
          userId,
          sessionId,
        );
        currentThreadId = newThreadId;
      }

      // Add message to thread
      await this.openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: userQuery,
      });

      // Create and run the assistant
      const run = await this.openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: assistantId,
      });

      // Poll for completion with proper parameters
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id,
      );

      const maxAttempts = 30; // 30 seconds timeout
      let attempts = 0;

      while (runStatus.status !== 'completed' && attempts < maxAttempts) {
        if (runStatus.status === 'failed') {
          throw new Error(`Run failed: ${runStatus.last_error?.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(
          currentThreadId,
          run.id,
        );
        attempts++;
      }

      if (runStatus.status !== 'completed') {
        throw new Error('Request timeout');
      }

      // Get the response
      const messages = await this.openai.beta.threads.messages.list(
        currentThreadId,
      );
      const lastMessage = messages.data.find((m) => m.role === 'assistant');

      if (!lastMessage || !lastMessage.content[0]) {
        throw new Error('No response from assistant');
      }

      const responseText =
        lastMessage.content[0].type === 'text'
          ? lastMessage.content[0].text.value
          : 'Unable to process response';

      return {
        answer: responseText,
        threadId: currentThreadId,
        messageId: lastMessage.id,
      };
    } catch (error) {
      this.logger.error('Error asking question:', error);
      throw new HttpException(
        `Failed to get answer: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all files for a project
   */
  async getProjectFiles(projectId: number) {
    const assistant = await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });

    if (!assistant) {
      return [];
    }

    return await this.projectFileModel.findAll({
      where: { assistant_id: assistant.id },
    });
  }

  /**
   * Delete a file from the knowledge base
   */
  async deleteFile(projectId: number, fileId: string) {
    try {
      // Find the file in database
      const assistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (!assistant) {
        throw new Error('Assistant not found');
      }

      const dbFile = await this.projectFileModel.findOne({
        where: {
          assistant_id: assistant.id,
          openai_file_id: fileId,
        },
      });

      if (!dbFile) {
        throw new Error('File not found');
      }

      // Delete from OpenAI
      await this.openai.files.delete(fileId);

      // Delete from database
      await dbFile.destroy();

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get project assistant info
   */
  async getProjectAssistant(projectId: number) {
    return await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });
  }

  /**
   * Update assistant instructions
   */
  async updateAssistantInstructions(projectId: number, instructions: string) {
    try {
      const assistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (!assistant) {
        throw new Error('Assistant not found');
      }

      // Update OpenAI assistant
      await this.openai.beta.assistants.update(assistant.openai_assistant_id, {
        instructions: instructions,
      });

      // Update database
      await assistant.update({ instructions });

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating instructions:', error);
      throw new HttpException(
        'Failed to update instructions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'unknown';
  }
}
