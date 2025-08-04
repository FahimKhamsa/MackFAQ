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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenaiKnowledgeService } from './openai-knowledge.service';

@Controller('openai-knowledge')
export class OpenaiKnowledgeController {
  constructor(
    private readonly openaiKnowledgeService: OpenaiKnowledgeService,
  ) {}

  /**
   * Initialize assistant for a project
   */
  @Post('init/:projectId')
  async initializeProject(
    @Param('projectId') projectId: string,
    @Body('instructions') instructions?: string,
  ) {
    try {
      const result = await this.openaiKnowledgeService.createOrGetAssistant(
        parseInt(projectId),
        instructions,
      );
      return {
        success: true,
        assistantId: result.assistantId,
        dbId: result.dbId,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to initialize project',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload file for knowledge retrieval
   */
  @Post('upload/:projectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.openaiKnowledgeService.uploadFileForRetrieval(
        parseInt(projectId),
        file.buffer,
        file.originalname,
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
      userId?: number;
      sessionId?: string;
    },
  ) {
    if (!body.question) {
      throw new HttpException('Question is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.openaiKnowledgeService.askQuestion(
        parseInt(projectId),
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
    @Body() body: { userId?: number; sessionId?: string },
  ) {
    try {
      const result = await this.openaiKnowledgeService.createThread(
        parseInt(projectId),
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
        parseInt(projectId),
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
        parseInt(projectId),
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
          parseInt(projectId),
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
        parseInt(projectId),
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
  async trainFiles(@Param('projectId') projectId: string) {
    console.log(
      '[OpenaiKnowledgeController - trainFiles] Training files for project:',
      projectId,
    );
    try {
      const result = await this.openaiKnowledgeService.trainUploadedFiles(
        parseInt(projectId),
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
        parseInt(projectId),
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
        parseInt(projectId),
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
}
