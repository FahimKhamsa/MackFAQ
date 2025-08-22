import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OpenaiKnowledgeService } from './openai-knowledge.service';

@Controller('openai-knowledge')
export class OpenaiKnowledgeController {
  constructor(
    private readonly openaiKnowledgeService: OpenaiKnowledgeService,
  ) {}
  /**
   * Upload file for general knowledge (default assistant)
   */
  @Post('upload/general')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileGeneral(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const user = req.user as any;
    if (!user || !user.id) {
      throw new HttpException(
        'User not authenticated or missing ID',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const result = await this.openaiKnowledgeService.uploadFileForRetrieval(
        null, // project_id = null for general uploads
        file.buffer,
        file.originalname,
        user.id,
      );

      return {
        success: true,
        fileId: result.fileId,
        dbFileId: result.dbFileId,
        filename: file.originalname,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train general files (default assistant)
   */
  @Post('train/general')
  @UseGuards(JwtAuthGuard)
  async trainGeneralFiles(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.openaiKnowledgeService.trainUploadedFiles(
        null, // project_id = null for general training
        user.id,
      );

      return {
        success: result.success,
        message: result.message,
        trainedCount: result.trainedCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to train files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get general files (default bot)
   */
  @Get('files/general')
  @UseGuards(JwtAuthGuard)
  async getGeneralFiles(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const files = await this.openaiKnowledgeService.getProjectFiles(
        null, // project_id = null for general files
        user.id,
      );

      return {
        success: true,
        files: files,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete general file
   */
  @Delete('file/general/:fileId')
  @UseGuards(JwtAuthGuard)
  async deleteGeneralFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.openaiKnowledgeService.deleteFile(
        null, // project_id = null for general files
        fileId,
        user.id,
      );

      return {
        success: result.success,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retry training failed general files (default assistant)
   */
  @Post('retry-train/general')
  @UseGuards(JwtAuthGuard)
  async retryTrainGeneralFiles(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.openaiKnowledgeService.retryFailedFiles(
        null, // project_id = null for general retry
        user.id,
      );

      return {
        success: result.success,
        message: result.message,
        trainedCount: result.trainedCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retry training general files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // /**
  //  * Initialize assistant for a project
  //  */
  // @Post('init/:projectId')
  // @UseGuards(JwtAuthGuard)
  // async initializeProject(
  //   @Param('projectId') projectId: string,
  //   @Req() req: Request,
  //   @Body('instructions') instructions?: string,
  // ) {
  //   try {
  //     const user = req.user as any;
  //     let userId: string | undefined;
  //     let botId: string | undefined;

  //     if (user && user.id) {
  //       userId = user.id;
  //       // Get the user's default bot
  //       const defaultAssistant =
  //         await this.openaiKnowledgeService.getDefaultAssistant(user.id);
  //       if (defaultAssistant) {
  //         botId = defaultAssistant.id.toString();
  //       }
  //     }

  //     console.log(
  //       '[openai-knowledge-controller - trainFiles] Project ID:',
  //       projectId,
  //     );

  //     const result = await this.openaiKnowledgeService.createOrGetAssistant(
  //       projectId,
  //       instructions,
  //       userId,
  //     );
  //     return {
  //       success: true,
  //       assistantId: result.assistantId,
  //       dbId: result.dbId,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to initialize project',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  /**
   * Upload file for knowledge retrieval
   */
  @Post('upload/:projectId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const user = req.user as any;
    if (!user || !user.id) {
      throw new HttpException(
        'User not authenticated or missing ID',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const result = await this.openaiKnowledgeService.uploadFileForRetrieval(
        projectId,
        file.buffer,
        file.originalname,
        user.id,
      );

      return {
        success: true,
        fileId: result.fileId,
        dbFileId: result.dbFileId,
        filename: file.originalname,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ask a question to the knowledge base
   */
  @Post('ask/:projectId')
  async askQuestion(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      question: string;
      threadId?: string;
      userId?: string;
      sessionId?: string;
    },
  ) {
    if (!body.question) {
      throw new HttpException('Question is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.openaiKnowledgeService.askQuestion(
        projectId,
        body.question,
        body.threadId,
        body.userId,
        body.sessionId,
      );

      return {
        success: true,
        answer: result.answer,
        threadId: result.threadId,
        messageId: result.messageId,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get answer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new conversation thread
   */
  @Post('thread/:projectId')
  async createThread(
    @Param('projectId') projectId: string,
    @Body() body: { userId?: string; sessionId?: string },
  ) {
    try {
      const result = await this.openaiKnowledgeService.createThread(
        projectId,
        body.userId,
        body.sessionId,
      );

      return {
        success: true,
        threadId: result.threadId,
        dbThreadId: result.dbThreadId,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create thread',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all files for a project
   */
  @Get('files/:projectId')
  async getProjectFiles(@Param('projectId') projectId: string) {
    try {
      const files = await this.openaiKnowledgeService.getProjectFiles(
        projectId,
      );

      return {
        success: true,
        files: files,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get project assistant information
   */
  @Get('assistant/:projectId')
  async getProjectAssistant(@Param('projectId') projectId: string) {
    try {
      const assistant = await this.openaiKnowledgeService.getProjectAssistant(
        projectId,
      );

      return {
        success: true,
        assistant: assistant,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get assistant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update assistant instructions
   */
  @Put('assistant/:projectId/instructions')
  async updateInstructions(
    @Param('projectId') projectId: string,
    @Body('instructions') instructions: string,
  ) {
    if (!instructions) {
      throw new HttpException(
        'Instructions are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result =
        await this.openaiKnowledgeService.updateAssistantInstructions(
          projectId,
          instructions,
        );

      return {
        success: result.success,
        message: 'Instructions updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update instructions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a file from the knowledge base
   */
  @Delete('file/:projectId/:fileId')
  async deleteFile(
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ) {
    try {
      const result = await this.openaiKnowledgeService.deleteFile(
        projectId,
        fileId,
      );

      return {
        success: result.success,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train all uploaded files for a project
   */
  @Post('train/:projectId')
  @UseGuards(JwtAuthGuard)
  async trainFiles(@Param('projectId') projectId: string, @Req() req: Request) {
    console.log(
      '[OpenaiKnowledgeController - trainFiles] Training files for project:',
      projectId,
    );
    try {
      const user = req.user as any;
      let userId: string | undefined;

      if (user && user.id) {
        userId = user.id;
      }

      const result = await this.openaiKnowledgeService.trainUploadedFiles(
        projectId,
        userId,
      );

      console.log(
        '[OpenaiKnowledgeController - trainFiles] Training Result:',
        result,
      );

      return {
        success: result.success,
        message: result.message,
        trainedCount: result.trainedCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to train files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retry training failed files for a project
   */
  @Post('retry-train/:projectId')
  async retryTrainFiles(@Param('projectId') projectId: string) {
    try {
      const result = await this.openaiKnowledgeService.retryFailedFiles(
        projectId,
      );

      return {
        success: result.success,
        message: result.message,
        trainedCount: result.trainedCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retry training files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get files by status for a project
   */
  @Get('files/:projectId/status/:status')
  async getFilesByStatus(
    @Param('projectId') projectId: string,
    @Param('status') status: string,
  ) {
    try {
      const files = await this.openaiKnowledgeService.getFilesByStatus(
        projectId,
        status,
      );

      return {
        success: true,
        files: files,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get files by status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get shared files training status for a project
   */
  @Get('shared-training-status/:projectId')
  @UseGuards(JwtAuthGuard)
  async getSharedFilesTrainingStatus(
    @Param('projectId') projectId: string,
    @Req() req: Request,
  ) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Get default assistant and its completed shared files count
      const defaultAssistant =
        await this.openaiKnowledgeService.getDefaultAssistant(user.id);
      if (!defaultAssistant) {
        return {
          success: true,
          needsSharedTraining: false,
          sharedFilesCount: 0,
          trainedSharedFilesCount: 0,
        };
      }

      // Count completed shared files in default assistant
      const sharedFiles = await this.openaiKnowledgeService.getProjectFiles(
        null,
        user.id,
      );
      const completedSharedFiles = sharedFiles.filter(
        (file) => file.status === 'completed' && file.shared,
      );

      // Get project assistant and count how many shared files it has trained
      const projectAssistant =
        await this.openaiKnowledgeService.getProjectAssistant(projectId);
      let trainedSharedFilesCount = 0;

      if (projectAssistant && projectAssistant.vector_store_id) {
        // This is a simplified check - in a real implementation, you might want to
        // track which specific shared files have been trained on each project
        const projectFiles = await this.openaiKnowledgeService.getProjectFiles(
          projectId,
        );
        // For now, we'll assume if the project has any files, some shared files might be trained
        // A more sophisticated approach would track shared file training per project
        trainedSharedFilesCount = Math.min(
          completedSharedFiles.length,
          projectFiles.length,
        );
      }

      const needsSharedTraining =
        completedSharedFiles.length > trainedSharedFilesCount;

      return {
        success: true,
        needsSharedTraining,
        sharedFilesCount: completedSharedFiles.length,
        trainedSharedFilesCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get shared training status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train project with shared files
   */
  @Post('train-shared-files/:projectId')
  @UseGuards(JwtAuthGuard)
  async trainProjectWithSharedFiles(
    @Param('projectId') projectId: string,
    @Req() req: Request,
  ) {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result =
        await this.openaiKnowledgeService.trainNewProjectWithSharedFiles(
          projectId,
          user.id,
        );

      return {
        success: result.success,
        message: result.message,
        trainedCount: result.trainedCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to train project with shared files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
