import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { OpenAI } from 'openai';
import { ProjectAssistantModel } from './entities/project-assistant.model';
import { ProjectFileModel } from './entities/project-file.model';
import { ProjectThreadModel } from './entities/project-thread.model';
import { ProjectModel } from 'src/projects/entities/projects.model';

@Injectable()
export class OpenaiKnowledgeService {
  private readonly logger = new Logger(OpenaiKnowledgeService.name);
  private openai: OpenAI;
  private projectAssistantModel: typeof ProjectAssistantModel;
  private projectFileModel: typeof ProjectFileModel;
  private projectThreadModel: typeof ProjectThreadModel;
  private projectModel: typeof ProjectModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });

    this.projectAssistantModel = this.sequelize.models
      .ProjectAssistantModel as typeof ProjectAssistantModel;
    this.projectFileModel = this.sequelize.models
      .ProjectFileModel as typeof ProjectFileModel;
    this.projectThreadModel = this.sequelize.models
      .ProjectThreadModel as typeof ProjectThreadModel;
    this.projectModel = this.sequelize.models
      .ProjectModel as typeof ProjectModel;
  }

  /**
   * Create or get existing assistant for a project
   */
  async createOrGetAssistant(
    projectId: string | null,
    customInstructions?: string,
    userId?: string,
  ) {
    try {
      console.log(
        `[createOrGetAssistant] Input projectId: ${projectId}, type: ${typeof projectId}`,
      );
      console.log(`[createOrGetAssistant] userId: ${userId}`);

      // Check if assistant already exists
      const whereClause: any = { is_active: true };
      whereClause.user_id = userId;

      if (projectId === null) {
        // For general/default bot assistant
        whereClause.project_id = null;
        console.log(
          `[createOrGetAssistant] Setting up for general assistant - whereClause:`,
          whereClause,
        );
      } else {
        // For project-specific assistant
        whereClause.project_id = projectId;
        console.log(
          `[createOrGetAssistant] Setting up for project assistant - whereClause:`,
          whereClause,
        );
      }

      const existingAssistant = await this.projectAssistantModel.findOne({
        where: whereClause,
      });

      if (existingAssistant) {
        // Update user_id and bot_id if provided and not already set
        const updateData: any = {};
        if (userId && !existingAssistant.user_id) {
          updateData.user_id = userId;
        }

        if (Object.keys(updateData).length > 0) {
          await existingAssistant.update(updateData);
        }

        return {
          assistantId: existingAssistant.openai_assistant_id,
          dbId: existingAssistant.id,
          vectorStoreId: existingAssistant.vector_store_id,
        };
      }

      // Create assistant name and instructions based on type
      const assistantName = projectId
        ? `Project-${projectId}-Assistant`
        : `User-${userId}-Default-Assistant`;

      const defaultInstructions = projectId
        ? 'You are a helpful assistant for this project. Use the uploaded files to answer questions accurately. When referencing information from files, be specific about which document you are citing.'
        : "You are a helpful default assistant with access to the user's general knowledge base. Use the uploaded files to answer questions accurately. When referencing information from files, be specific about which document you are citing.";

      // Create vector store for this assistant
      const vectorStore = await this.openai.vectorStores.create({
        name: projectId
          ? `Project-${projectId}-VectorStore`
          : `User-${userId}-Default-VectorStore`,
        expires_after: {
          anchor: 'last_active_at',
          days: 365, // Keep for 1 year
        },
      });

      // Create new OpenAI assistant with single vector store
      const assistant = await this.openai.beta.assistants.create({
        name: assistantName,
        instructions: customInstructions || defaultInstructions,
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id],
          },
        },
        model: 'gpt-4-1106-preview',
      });

      // Save to database with user and bot information
      console.log(`[createOrGetAssistant] About to create DB record with:`, {
        project_id: projectId,
        user_id: userId || null,
        openai_assistant_id: assistant.id,
        vector_store_id: vectorStore.id,
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        is_active: true,
      });

      const dbAssistant = await this.projectAssistantModel.create({
        project_id: projectId,
        user_id: userId || null,
        openai_assistant_id: assistant.id,
        vector_store_id: vectorStore.id,
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        is_active: true,
      });

      console.log(
        `[createOrGetAssistant] Successfully created DB record with ID: ${dbAssistant.id}`,
      );

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
   * Get default assistant for a user (from default bot assistant)
   */
  async getDefaultAssistant(userId: string): Promise<ProjectAssistantModel> {
    const defaultAssistant = await this.projectAssistantModel.findOne({
      where: {
        user_id: userId,
        project_id: null,
        is_active: true,
      },
    });

    return defaultAssistant;
  }

  /**
   * Get shared vector store ID for a user (from default bot assistant)
   */
  async getSharedVectorStoreId(userId: string): Promise<string | null> {
    const defaultAssistant = await this.getDefaultAssistant(userId);
    return defaultAssistant?.vector_store_id || null;
  }

  /**
   * Upload file for general knowledge (shared across all user assistants)
   */
  async uploadFileForGeneralKnowledge(
    fileBuffer: Buffer,
    filename: string,
    userId: string,
  ) {
    try {
      // Get or create default assistant
      const { dbId: assistantDbId } = await this.createOrGetAssistant(
        null, // project_id = null for default assistant
        undefined,
        userId,
      );

      // Convert Buffer to File-like object for OpenAI
      const fileBlob = new File([fileBuffer as BlobPart], filename, {
        type: 'application/octet-stream',
      });

      // Upload file to OpenAI
      const file = await this.openai.files.create({
        file: fileBlob,
        purpose: 'assistants',
      });

      // Save file info to database with shared = true
      const dbFile = await this.projectFileModel.create({
        assistant_id: assistantDbId,
        openai_file_id: file.id,
        filename: filename,
        file_type: this.getFileExtension(filename),
        file_size: fileBuffer.length,
        status: 'uploaded',
        user_id: userId,
        shared: true, // Mark as shared file
      });

      return {
        fileId: file.id,
        dbFileId: dbFile.id,
      };
    } catch (error) {
      this.logger.error('Error uploading general file:', error);
      throw new HttpException(
        'Failed to upload general file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload file for project-specific knowledge
   */
  async uploadFileForProjectKnowledge(
    projectId: string,
    fileBuffer: Buffer,
    filename: string,
    userId: string,
  ) {
    try {
      // Get or create project assistant
      const { dbId: assistantDbId } = await this.createOrGetAssistant(
        projectId,
        undefined,
        userId,
      );

      // Convert Buffer to File-like object for OpenAI
      const fileBlob = new File([fileBuffer as BlobPart], filename, {
        type: 'application/octet-stream',
      });

      // Upload file to OpenAI
      const file = await this.openai.files.create({
        file: fileBlob,
        purpose: 'assistants',
      });

      // Save file info to database with shared = false
      const dbFile = await this.projectFileModel.create({
        assistant_id: assistantDbId,
        openai_file_id: file.id,
        filename: filename,
        file_type: this.getFileExtension(filename),
        file_size: fileBuffer.length,
        status: 'uploaded',
        user_id: userId,
        shared: false, // Mark as project-specific file
      });

      return {
        fileId: file.id,
        dbFileId: dbFile.id,
      };
    } catch (error) {
      this.logger.error('Error uploading project file:', error);
      throw new HttpException(
        'Failed to upload project file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload file for knowledge retrieval (legacy method - kept for backward compatibility)
   */
  async uploadFileForRetrieval(
    projectId: string | null,
    fileBuffer: Buffer,
    filename: string,
    userId: string,
  ) {
    if (projectId === null) {
      return this.uploadFileForGeneralKnowledge(fileBuffer, filename, userId);
    } else {
      return this.uploadFileForProjectKnowledge(
        projectId,
        fileBuffer,
        filename,
        userId,
      );
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(projectId: string, userId: string, sessionId: string) {
    try {
      const { dbId: assistantDbId } = await this.createOrGetAssistant(
        projectId,
        undefined,
        userId,
      );

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
    projectId: string,
    userQuery: string,
    threadId?: string,
    userId?: string,
    sessionId?: string,
  ) {
    try {
      const { assistantId } = await this.createOrGetAssistant(
        projectId,
        undefined,
        userId,
      );

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
  async getProjectFiles(projectId: string | null, userId?: string) {
    const whereClause: any = { is_active: true };

    if (projectId === null) {
      // For general files, find by user_id and project_id = null
      whereClause.project_id = null;
      whereClause.user_id = userId;
    } else {
      // For project files
      whereClause.project_id = projectId;
    }

    const assistant = await this.projectAssistantModel.findOne({
      where: whereClause,
    });

    if (!assistant) {
      return [];
    }

    return await this.projectFileModel.findAll({
      where: { assistant_id: assistant.id },
    });
  }

  /**
   * Delete general file from all user assistants
   */
  async deleteGeneralFile(fileId: string, userId: string) {
    try {
      // Get default assistant
      const defaultAssistant = await this.getDefaultAssistant(userId);
      if (!defaultAssistant) {
        throw new Error('Default assistant not found');
      }

      // Find the shared file
      const dbFile = await this.projectFileModel.findOne({
        where: {
          assistant_id: defaultAssistant.id,
          openai_file_id: fileId,
          shared: true,
        },
      });

      if (!dbFile) {
        throw new Error('Shared file not found');
      }

      // Get all user assistants
      const userAssistants = await this.projectAssistantModel.findAll({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      // Remove from all vector stores if file was trained
      if (dbFile.status === 'completed') {
        for (const assistant of userAssistants) {
          if (assistant.vector_store_id) {
            try {
              await this.openai.vectorStores.files.delete(fileId, {
                vector_store_id: assistant.vector_store_id,
              });
              this.logger.log(
                `File ${dbFile.filename} removed from vector store ${assistant.vector_store_id}`,
              );
            } catch (vectorError) {
              this.logger.warn(
                `Failed to remove file from vector store ${assistant.vector_store_id}: ${vectorError.message}`,
              );
              // Continue with deletion even if vector store removal fails
            }
          }
        }
      }

      // Delete from OpenAI files
      await this.openai.files.delete(fileId);

      // Delete from database
      await dbFile.destroy();

      this.logger.log(
        `Shared file ${dbFile.filename} deleted from all assistants`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting general file:', error);
      throw new HttpException(
        'Failed to delete general file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete project-specific file
   */
  async deleteProjectFile(projectId: string, fileId: string) {
    try {
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
          shared: false,
        },
      });

      if (!dbFile) {
        throw new Error('Project file not found');
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

      // Update project files count after deletion
      await this.updateProjectFilesCount(projectId);

      this.logger.log(`File ${dbFile.filename} deleted successfully`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting project file:', error);
      throw new HttpException(
        'Failed to delete project file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a file from the knowledge base (legacy method - kept for backward compatibility)
   */
  async deleteFile(projectId: string | null, fileId: string, userId?: string) {
    if (projectId === null) {
      return this.deleteGeneralFile(fileId, userId);
    } else {
      return this.deleteProjectFile(projectId, fileId);
    }
  }

  /**
   * Get project assistant info
   */
  async getProjectAssistant(projectId: string) {
    return await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });
  }

  /**
   * Update assistant instructions
   */
  async updateAssistantInstructions(projectId: string, instructions: string) {
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
   * Train new project with all user's shared files
   */
  async trainNewProjectWithSharedFiles(projectId: string, userId: string) {
    console.log(
      `[OpenaiKnowledgeService - trainNewProjectWithSharedFiles] Training new project ${projectId} with shared files for user: ${userId}`,
    );
    try {
      // Get the new project assistant
      const projectAssistant = await this.projectAssistantModel.findOne({
        where: {
          project_id: projectId,
          is_active: true,
        },
      });

      if (!projectAssistant) {
        throw new Error('Project assistant not found');
      }

      // Get default assistant (where project_id is null)
      const defaultAssistant = await this.projectAssistantModel.findOne({
        where: {
          user_id: userId,
          project_id: null,
          is_active: true,
        },
      });

      if (!defaultAssistant) {
        this.logger.log(
          `No default assistant found for user ${userId} - no shared files to train`,
        );
        return {
          success: true,
          message: 'No shared files to train - no default assistant found',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      // Get all completed shared files from default assistant
      const sharedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: defaultAssistant.id,
          status: 'completed',
          shared: true,
        },
      });

      console.log(
        `[trainNewProjectWithSharedFiles] Found ${sharedFiles.length} completed shared files to train on new project`,
      );

      if (sharedFiles.length === 0) {
        return {
          success: true,
          message: 'No completed shared files to train',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      let trainedCount = 0;
      let failedCount = 0;

      // Train each shared file on the new project assistant
      for (const file of sharedFiles) {
        try {
          console.log(
            `[trainNewProjectWithSharedFiles] Training shared file ${file.filename} on project ${projectId}`,
          );

          await this.processFileForTraining(file, projectAssistant);
          trainedCount++;

          this.logger.log(
            `Successfully trained shared file ${file.filename} on project ${projectId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to train shared file ${file.filename} on project ${projectId}:`,
            error,
          );
          failedCount++;
        }
      }

      // Update project files count after training
      await this.updateProjectFilesCount(projectId);

      const message = `New project shared files training completed: ${trainedCount} successful, ${failedCount} failed`;
      this.logger.log(message);

      return {
        success: true,
        message,
        trainedCount,
        failedCount,
      };
    } catch (error) {
      this.logger.error('Error training new project with shared files:', error);
      throw new HttpException(
        'Failed to train new project with shared files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train general files across all user assistants
   */
  async trainGeneralFiles(userId: string) {
    console.log(
      `[OpenaiKnowledgeService - trainGeneralFiles] Training general files for user: ${userId}`,
    );
    try {
      // Get all assistants for this user (default + all projects)
      const userAssistants = await this.projectAssistantModel.findAll({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      if (userAssistants.length === 0) {
        throw new Error('No assistants found for this user');
      }

      // Get default assistant (where project_id is null)
      const defaultAssistant = userAssistants.find(
        (assistant) => assistant.project_id === null,
      );

      if (!defaultAssistant) {
        throw new Error('Default assistant not found for this user');
      }

      // Get all shared files with 'uploaded' status from default assistant
      const sharedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: defaultAssistant.id,
          status: 'uploaded',
          shared: true,
        },
      });

      console.log(
        `[OpenaiKnowledgeService - trainGeneralFiles] Found ${sharedFiles.length} shared files to train across ${userAssistants.length} assistants`,
      );

      if (sharedFiles.length === 0) {
        return {
          success: true,
          message: 'No shared files to train',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      let totalTrainedCount = 0;
      let totalFailedCount = 0;

      // Process each shared file across all assistants
      for (const file of sharedFiles) {
        let fileTrainedSuccessfully = true;
        const assistantResults = [];

        // Update file status to processing
        await file.update({ status: 'processing' });

        // Train this file across all user assistants sequentially
        for (const assistant of userAssistants) {
          try {
            console.log(
              `[trainGeneralFiles] Training file ${
                file.filename
              } on assistant ${assistant.id} (project: ${
                assistant.project_id || 'default'
              })`,
            );

            await this.processFileForTraining(file, assistant);
            assistantResults.push({
              assistantId: assistant.id,
              success: true,
            });

            this.logger.log(
              `Successfully trained file ${file.filename} on assistant ${assistant.id}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to train file ${file.filename} on assistant ${assistant.id}:`,
              error,
            );

            assistantResults.push({
              assistantId: assistant.id,
              success: false,
              error: error.message,
            });

            fileTrainedSuccessfully = false;
          }
        }

        // Update file status based on overall success
        if (fileTrainedSuccessfully) {
          await file.update({ status: 'completed' });
          totalTrainedCount++;
          this.logger.log(
            `File ${file.filename} successfully trained across all assistants`,
          );
        } else {
          await file.update({ status: 'failed' });
          totalFailedCount++;
          this.logger.error(
            `File ${file.filename} failed to train on one or more assistants`,
          );
        }
      }

      return {
        success: true,
        message: `General training completed: ${totalTrainedCount} files successful, ${totalFailedCount} files failed`,
        trainedCount: totalTrainedCount,
        failedCount: totalFailedCount,
      };
    } catch (error) {
      this.logger.error('Error training general files:', error);
      throw new HttpException(
        'Failed to train general files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train project-specific files
   */
  async trainProjectFiles(projectId: string, userId?: string) {
    console.log(
      `[OpenaiKnowledgeService - trainProjectFiles] Training project files for project: ${projectId}`,
    );
    try {
      // Get or create assistant for the project
      const { dbId: assistantDbId } = await this.createOrGetAssistant(
        projectId,
        undefined,
        userId,
      );

      // Get the assistant record
      let assistant = await this.projectAssistantModel.findByPk(assistantDbId);

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

      // Get all files with 'uploaded' status for this specific project
      const uploadedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: assistant.id,
          status: 'uploaded',
          shared: false, // Only project-specific files
        },
      });

      console.log(
        `[OpenaiKnowledgeService - trainProjectFiles] Found ${uploadedFiles.length} project files to train`,
      );

      if (uploadedFiles.length === 0) {
        return {
          success: true,
          message: 'No project files to train',
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

      // Update project files count after training
      await this.updateProjectFilesCount(projectId);

      return {
        success: true,
        message: `Project training completed: ${trainedCount} successful, ${failedCount} failed`,
        trainedCount,
        failedCount,
      };
    } catch (error) {
      this.logger.error('Error training project files:', error);
      throw new HttpException(
        'Failed to train project files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train all uploaded files for a project (legacy method - kept for backward compatibility)
   */
  async trainUploadedFiles(projectId: string | null, userId?: string) {
    if (projectId === null) {
      return this.trainGeneralFiles(userId);
    } else {
      return this.trainProjectFiles(projectId, userId);
    }
  }

  /**
   * Retry training failed general files across all user assistants
   */
  async retryGeneralFiles(userId: string) {
    console.log(
      `[OpenaiKnowledgeService - retryGeneralFiles] Retrying general files for user: ${userId}`,
    );
    try {
      // Get all assistants for this user (default + all projects)
      const userAssistants = await this.projectAssistantModel.findAll({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      if (userAssistants.length === 0) {
        throw new Error('No assistants found for this user');
      }

      // Get default assistant (where project_id is null)
      const defaultAssistant = userAssistants.find(
        (assistant) => assistant.project_id === null,
      );

      if (!defaultAssistant) {
        throw new Error('Default assistant not found for this user');
      }

      // Get all shared files with 'failed' status from default assistant
      const failedSharedFiles = await this.projectFileModel.findAll({
        where: {
          assistant_id: defaultAssistant.id,
          status: 'failed',
          shared: true,
        },
      });

      console.log(
        `[OpenaiKnowledgeService - retryGeneralFiles] Found ${failedSharedFiles.length} failed shared files to retry across ${userAssistants.length} assistants`,
      );

      if (failedSharedFiles.length === 0) {
        return {
          success: true,
          message: 'No failed shared files to retry',
          trainedCount: 0,
          failedCount: 0,
        };
      }

      let totalTrainedCount = 0;
      let totalFailedCount = 0;

      // Process each failed shared file across all assistants
      for (const file of failedSharedFiles) {
        let fileTrainedSuccessfully = true;
        const assistantResults = [];

        // Update file status to processing
        await file.update({ status: 'processing' });

        // Retry training this file across all user assistants sequentially
        for (const assistant of userAssistants) {
          try {
            console.log(
              `[retryGeneralFiles] Retrying file ${
                file.filename
              } on assistant ${assistant.id} (project: ${
                assistant.project_id || 'default'
              })`,
            );

            await this.processFileForTraining(file, assistant);
            assistantResults.push({
              assistantId: assistant.id,
              success: true,
            });

            this.logger.log(
              `Successfully retrained file ${file.filename} on assistant ${assistant.id}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to retrain file ${file.filename} on assistant ${assistant.id}:`,
              error,
            );

            assistantResults.push({
              assistantId: assistant.id,
              success: false,
              error: error.message,
            });

            fileTrainedSuccessfully = false;
          }
        }

        // Update file status based on overall success
        if (fileTrainedSuccessfully) {
          await file.update({ status: 'completed' });
          totalTrainedCount++;
          this.logger.log(
            `File ${file.filename} successfully retrained across all assistants`,
          );
        } else {
          await file.update({ status: 'failed' });
          totalFailedCount++;
          this.logger.error(
            `File ${file.filename} still failed to train on one or more assistants`,
          );
        }
      }

      return {
        success: true,
        message: `General retry completed: ${totalTrainedCount} files successful, ${totalFailedCount} files still failed`,
        trainedCount: totalTrainedCount,
        failedCount: totalFailedCount,
      };
    } catch (error) {
      this.logger.error('Error retrying general files:', error);
      throw new HttpException(
        'Failed to retry general files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retry training failed files for a project
   */
  async retryFailedFiles(projectId: string | null, userId?: string) {
    if (projectId === null) {
      return this.retryGeneralFiles(userId);
    } else {
      return this.retryProjectFiles(projectId);
    }
  }

  /**
   * Retry training failed files for a specific project
   */
  async retryProjectFiles(projectId: string) {
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

      // Update project files count after retry
      await this.updateProjectFilesCount(projectId);

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
  async getFilesByStatus(projectId: string, status: string) {
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

  /**
   * Update project files count when file status changes
   */
  private async updateProjectFilesCount(projectId: string) {
    try {
      // Get the assistant for this project
      const assistant = await this.projectAssistantModel.findOne({
        where: { project_id: projectId, is_active: true },
      });

      if (!assistant) {
        this.logger.warn(`No assistant found for project ${projectId}`);
        return;
      }

      // Count completed files
      const completedFilesCount = await this.projectFileModel.count({
        where: {
          assistant_id: assistant.id,
          status: 'completed',
        },
      });

      // Update the project's files count
      await this.projectModel.update(
        { files: completedFilesCount },
        { where: { id: projectId } },
      );

      this.logger.log(
        `Updated project ${projectId} files count to ${completedFilesCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating project files count for project ${projectId}:`,
        error,
      );
    }
  }
}
