import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseInterceptors, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SOPService } from './sop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sop')
@UseGuards(JwtAuthGuard)
export class SOPController {
    constructor(private readonly sopService: SOPService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadSOP(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { title: string, category: string, uploaded_by: number }
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        const fileData = {
            content: file.buffer,
            name: file.originalname,
            mimetype: file.mimetype,
        };

        return this.sopService.uploadSOPDocument(fileData, {
            title: body.title,
            category: body.category,
            uploaded_by: parseInt(body.uploaded_by.toString()),
        });
    }

    @Post('bulk-upload')
    @UseInterceptors(FilesInterceptor('files', 50))
    async bulkUploadSOPs(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: { uploaded_by: number }
    ) {
        if (!files || files.length === 0) {
            throw new Error('No files uploaded');
        }

        const fileData = files.map(file => ({
            content: file.buffer,
            name: file.originalname,
            mimetype: file.mimetype,
        }));

        return this.sopService.bulkUploadSOPs(fileData, {
            uploaded_by: parseInt(body.uploaded_by.toString()),
        });
    }

    @Get()
    async getAllSOPs(
        @Query('category') category?: string,
        @Query('is_active') is_active?: string
    ) {
        const filters: any = {};
        
        if (category) {
            filters.category = category;
        }
        
        if (is_active !== undefined) {
            filters.is_active = is_active === 'true';
        }

        return this.sopService.getAllSOPDocuments(filters);
    }

    @Get('categories')
    async getSOPCategories() {
        return this.sopService.getSOPCategories();
    }

    @Get('global-docs')
    async getGlobalSOPDocs() {
        return this.sopService.getGlobalSOPDocs();
    }

    @Get(':id')
    async getSOPById(@Param('id') id: string) {
        return this.sopService.getSOPDocumentById(parseInt(id));
    }

    @Put(':id')
    async updateSOP(
        @Param('id') id: string,
        @Body() updates: { title?: string, category?: string, is_active?: boolean }
    ) {
        return this.sopService.updateSOPDocument(parseInt(id), updates);
    }

    @Delete(':id')
    async deleteSOP(@Param('id') id: string) {
        return this.sopService.deleteSOPDocument(parseInt(id));
    }
}
