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
          vectorStoreId: existingAssistant.vector_store_id,
        };
      }

      // Create vector store for this project
      const vectorStore = await this.openai.vectorStores.create({
        name: `Project-${projectId}-VectorStore`,
        expires_after: {
          anchor: 'last_active_at',
          days: 365, // Keep for 1 year
        },
      });

      // Create new OpenAI assistant with vector store
      const assistant = await this.openai.beta.assistants.create({
        name: `Project-${projectId}-Assistant`,
        instructions:
          customInstructions ||
          'You are a helpful assistant for this project. Use the uploaded files to answer questions accurately. When referencing information from files, be specific about which document you are citing.',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id],
          },
        },
        model: 'gpt-4-1106-preview',
      });

      // Save to database
      const dbAssistant = await this.projectAssistantModel.create({
        project_id: projectId,
        openai_assistant_id: assistant.id,
        vector_store_id: vectorStore.id,
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        is_active: true,
      });

      return {
        assistantId: assistant.id,
        dbId: dbAssistant.id,
        vectorStoreId: vectorStore.id,
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
      let runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
        thread_id: currentThreadId,
      });

      const maxAttempts = 30; // 30 seconds timeout
      let attempts = 0;

      while (runStatus.status !== 'completed' && attempts < maxAttempts) {
        if (runStatus.status === 'failed') {
          throw new Error(`Run failed: ${runStatus.last_error?.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
          thread_id: currentThreadId,
        });
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

      // Remove from vector store if it exists and file was trained
      if (assistant.vector_store_id && dbFile.status === 'completed') {
        try {
          await this.openai.vectorStores.files.delete(fileId, {
            vector_store_id: assistant.vector_store_id,
          });
          this.logger.log(`File ${dbFile.filename} removed from vector store`);
        } catch (vectorError) {
          this.logger.warn(
            `Failed to remove file from vector store: ${vectorError.message}`,
          );
          // Continue with deletion even if vector store removal fails
        }
      }

      // Delete from OpenAI files
      await this.openai.files.delete(fileId);

      // Delete from database
      await dbFile.destroy();

      this.logger.log(`File ${dbFile.filename} deleted successfully`);
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

  /**
   * Train all uploaded files for a project
   */
  async trainUploadedFiles(projectId: number) {
    console.log(
      `[OpenaiKnowledgeService - trainUploadedFiles] Training files for project: ${projectId}`,
    );
    try {
      // Get assistant for the project
      let assistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (!assistant) {
        throw new Error('Assistant not found for this project');
      }

      // Check if assistant has vector store - if not, create one (for legacy assistants)
      if (!assistant.vector_store_id) {
        this.logger.log(
          `Creating vector store for legacy assistant: ${assistant.openai_assistant_id}`,
        );

        // Create vector store for this project
        const vectorStore = await this.openai.vectorStores.create({
          name: `Project-${projectId}-VectorStore`,
          expires_after: {
            anchor: 'last_active_at',
            days: 365, // Keep for 1 year
          },
        });

        // Update the OpenAI assistant to use the vector store
        await this.openai.beta.assistants.update(
          assistant.openai_assistant_id,
          {
            tools: [{ type: 'file_search' }],
            tool_resources: {
              file_search: {
                vector_store_ids: [vectorStore.id],
              },
            },
          },
        );

        // Update database record
        await assistant.update({ vector_store_id: vectorStore.id });

        // Refresh the assistant object
        assistant = await this.projectAssistantModel.findOne({
          where: { project_id: projectId, is_active: true },
        });

        this.logger.log(
          `Vector store ${vectorStore.id} created and linked to assistant`,
        );
      }

      // Get all files with 'uploaded' status
      const uploadedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: assistant.id,
          status: 'uploaded',
        },
      });

      console.log(
        `[OpenaiKnowledgeService - trainUploadedFiles] Found ${uploadedFiles.length} files to train`,
      );

      if (uploadedFiles.length === 0) {
        return {
          success: true,
          message: 'No files to train',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      let trainedCount = 0;
      let failedCount = 0;

      // Process each file
      for (const file of uploadedFiles) {
        try {
          // Update status to processing
          await file.update({ status: 'processing' });

          // Process the file for training
          await this.processFileForTraining(file, assistant);

          // Update status to completed
          await file.update({ status: 'completed' });
          trainedCount++;

          this.logger.log(`Successfully trained file: ${file.filename}`);
        } catch (error) {
          this.logger.error(`Failed to train file ${file.filename}:`, error);

          // Update status to failed
          await file.update({ status: 'failed' });
          failedCount++;
        }
      }

      return {
        success: true,
        message: `Training completed: ${trainedCount} successful, ${failedCount} failed`,
        trainedCount,
        failedCount,
      };
    } catch (error) {
      this.logger.error('Error training files:', error);
      throw new HttpException(
        'Failed to train files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retry training failed files for a project
   */
  async retryFailedFiles(projectId: number) {
    try {
      // Get assistant for the project
      let assistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (!assistant) {
        throw new Error('Assistant not found for this project');
      }

      // Check if assistant has vector store - if not, create one (for legacy assistants)
      if (!assistant.vector_store_id) {
        this.logger.log(
          `Creating vector store for legacy assistant during retry: ${assistant.openai_assistant_id}`,
        );

        // Create vector store for this project
        const vectorStore = await this.openai.vectorStores.create({
          name: `Project-${projectId}-VectorStore`,
          expires_after: {
            anchor: 'last_active_at',
            days: 365, // Keep for 1 year
          },
        });

        // Update the OpenAI assistant to use the vector store
        await this.openai.beta.assistants.update(
          assistant.openai_assistant_id,
          {
            tools: [{ type: 'file_search' }],
            tool_resources: {
              file_search: {
                vector_store_ids: [vectorStore.id],
              },
            },
          },
        );

        // Update database record
        await assistant.update({ vector_store_id: vectorStore.id });

        // Refresh the assistant object
        assistant = await this.projectAssistantModel.findOne({
          where: { project_id: projectId, is_active: true },
        });

        this.logger.log(
          `Vector store ${vectorStore.id} created and linked to assistant`,
        );
      }

      // Get all files with 'failed' status
      const failedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: assistant.id,
          status: 'failed',
        },
      });

      if (failedFiles.length === 0) {
        return {
          success: true,
          message: 'No failed files to retry',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      let trainedCount = 0;
      let failedCount = 0;

      // Process each failed file
      for (const file of failedFiles) {
        try {
          // Update status to processing
          await file.update({ status: 'processing' });

          // Retry the training process
          await this.processFileForTraining(file, assistant);

          // Update status to completed
          await file.update({ status: 'completed' });
          trainedCount++;

          this.logger.log(`Successfully retrained file: ${file.filename}`);
        } catch (error) {
          this.logger.error(`Failed to retrain file ${file.filename}:`, error);

          // Update status back to failed
          await file.update({ status: 'failed' });
          failedCount++;
        }
      }

      return {
        success: true,
        message: `Retry completed: ${trainedCount} successful, ${failedCount} still failed`,
        trainedCount,
        failedCount,
      };
    } catch (error) {
      this.logger.error('Error retrying failed files:', error);
      throw new HttpException(
        'Failed to retry training files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Process a file for training (integrate with OpenAI Assistant)
   */
  private async processFileForTraining(file: any, assistant: any) {
    console.log(
      `[OpenaiKnowledgeService - processFileForTraining] Processing file: ${file.filename}`,
    );
    console.log(
      `[OpenaiKnowledgeService - processFileForTraining] Assistant ID: ${assistant.id}, Vector Store ID: ${assistant.vector_store_id}`,
    );

    try {
      // Get the OpenAI file to verify it exists
      const openaiFile = await this.openai.files.retrieve(file.openai_file_id);

      if (!openaiFile) {
        throw new Error('OpenAI file not found');
      }

      // Ensure we have a vector store ID
      if (!assistant.vector_store_id) {
        throw new Error('No vector store found for assistant');
      }

      if (!file.openai_file_id) {
        throw new Error('File OpenAI file ID is missing');
      }

      console.log(
        `[OpenaiKnowledgeService - processFileForTraining] File openai_file_id: ${file.openai_file_id}`,
      );

      console.log(
        `[OpenaiKnowledgeService - processFileForTraining] Adding file to vector store: Vector Store ID = ${assistant.vector_store_id}, File ID = ${file.openai_file_id}`,
      );

      // Add the file to the vector store - this is the actual "training"
      await this.openai.vectorStores.files.create(assistant.vector_store_id, {
        file_id: file.openai_file_id,
      });

      // Wait for the file to be processed by the vector store
      let fileStatus = await this.openai.vectorStores.files.retrieve(
        file.openai_file_id,
        { vector_store_id: assistant.vector_store_id },
      );

      // Poll until the file is processed
      const maxAttempts = 30; // 30 seconds timeout
      let attempts = 0;

      while (fileStatus.status === 'in_progress' && attempts < maxAttempts) {
        if (attempts % 5 === 0) {
          console.log(
            `Waiting for file processing... [attempt ${attempts}] [${file.openai_file_id}]`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        fileStatus = await this.openai.vectorStores.files.retrieve(
          file.openai_file_id,
          { vector_store_id: assistant.vector_store_id },
        );
        attempts++;
      }

      if (fileStatus.status === 'failed') {
        throw new Error(
          `Vector store processing failed: ${
            fileStatus.last_error?.message || 'Unknown error'
          }`,
        );
      }

      if (fileStatus.status !== 'completed') {
        throw new Error('Vector store processing timeout');
      }

      this.logger.log(
        `File ${file.filename} successfully added to vector store and processed`,
      );
    } catch (error) {
      this.logger.error(`Error processing file ${file.filename}:`, error);
      throw error;
    }
  }

  /**
   * Get files by status for a project
   */
  async getFilesByStatus(projectId: number, status: string) {
    const assistant = await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });

    if (!assistant) {
      return [];
    }

    return await this.projectFileModel.findAll({
      where: {
        assistant_id: assistant.id,
        status: status,
      },
    });
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'unknown';
  }
}
