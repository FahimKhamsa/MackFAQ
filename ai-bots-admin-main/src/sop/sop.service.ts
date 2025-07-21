import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SOPDocument } from './entities/sop-document.model';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class SOPService {
  constructor(
    @InjectModel(SOPDocument) private sopDocumentModel: typeof SOPDocument,
    private httpService: HttpService,
  ) {}

  async uploadSOPDocument(
    file: { content: Buffer; name: string; mimetype: string },
    config: { title: string; category: string; uploaded_by: number },
  ) {
    // Validate file type
    const supportedMimes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!supportedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'SOP documents must be PDF, CSV, XLS, XLSX, TXT, JPG, PNG, or GIF files',
      );
    }

    // Process file with external API for vectorization
    let docsIds = [];
    try {
      docsIds = await this.processSOPFile(file);
    } catch (error) {
      throw new BadRequestException(
        `Failed to process SOP file: ${error.message}`,
      );
    }

    // Create SOP document record
    const sopDocument = new this.sopDocumentModel();
    sopDocument.title = config.title;
    sopDocument.category = config.category;
    sopDocument.file_path = `sop/${file.name}`;
    sopDocument.page_count = this.estimatePageCount(
      file.content,
      file.mimetype,
    );
    sopDocument.vector_ids = docsIds;
    sopDocument.is_active = true;
    sopDocument.uploaded_by = config.uploaded_by;
    sopDocument.file_size = file.content.length;
    sopDocument.original_mime_type = file.mimetype;

    await sopDocument.save();
    return sopDocument;
  }

  private async processSOPFile(file: {
    content: Buffer;
    name: string;
    mimetype: string;
  }) {
    // Extract text content for different file types
    let extractedText = '';
    let processedContent = file.content;

    switch (file.mimetype) {
      case 'text/plain':
        extractedText = file.content.toString('utf-8');
        break;
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        extractedText = await this.extractTextFromExcel(file.content);
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        extractedText = `SOP Document: ${file.name} - Standard Operating Procedure image`;
        break;
      default:
        // For PDF and CSV, use original content
        break;
    }

    // For text files and images, create a text file to send to the API
    if (extractedText) {
      processedContent = Buffer.from(extractedText, 'utf-8');
      // Change the filename to indicate it's processed text
      const originalName = file.name;
      file.name = originalName.replace(/\.[^/.]+$/, '') + '_sop_processed.txt';
    }

    const formData = new FormData();
    formData.append('file', processedContent, file.name);

    const chatResult = await firstValueFrom(
      this.httpService
        .post('https://aidocs.kaizencloud.net/v1/ingest/file', formData, {
          headers: { ...formData.getHeaders() },
        })
        .pipe(map((e) => e?.data?.data?.map((v) => v.doc_id))),
    );

    return chatResult;
  }

  private async extractTextFromExcel(buffer: Buffer): Promise<string> {
    try {
      const readExcelFile = require('read-excel-file/node');
      const rows = await readExcelFile(buffer);
      return rows.map((row) => row.join(' ')).join('\n');
    } catch (error) {
      console.error('Error extracting text from Excel SOP file:', error);
      return `Excel SOP content could not be extracted: ${error.message}`;
    }
  }

  private estimatePageCount(content: Buffer, mimetype: string): number {
    const sizeInKB = content.length / 1024;

    switch (mimetype) {
      case 'application/pdf':
        return Math.max(1, Math.round(sizeInKB / 50));
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 1;
      case 'text/plain':
        return Math.max(1, Math.round(sizeInKB / 3));
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return 1;
      default:
        return 1;
    }
  }

  async getAllSOPDocuments(filters?: {
    category?: string;
    is_active?: boolean;
  }) {
    const whereClause: any = {};

    if (filters?.category) {
      whereClause.category = filters.category;
    }

    if (filters?.is_active !== undefined) {
      whereClause.is_active = filters.is_active;
    }

    return this.sopDocumentModel.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });
  }

  async getSOPDocumentById(id: number) {
    return this.sopDocumentModel.findByPk(id);
  }

  async updateSOPDocument(
    id: number,
    updates: { title?: string; category?: string; is_active?: boolean },
  ) {
    const sopDocument = await this.sopDocumentModel.findByPk(id);
    if (!sopDocument) {
      throw new BadRequestException('SOP document not found');
    }

    if (updates.title) sopDocument.title = updates.title;
    if (updates.category) sopDocument.category = updates.category;
    if (updates.is_active !== undefined)
      sopDocument.is_active = updates.is_active;

    await sopDocument.save();
    return sopDocument;
  }

  async deleteSOPDocument(id: number) {
    const sopDocument = await this.sopDocumentModel.findByPk(id);
    if (!sopDocument) {
      throw new BadRequestException('SOP document not found');
    }

    await sopDocument.destroy();
    return { message: 'SOP document deleted successfully' };
  }

  async getGlobalSOPDocs(): Promise<string[]> {
    const sopDocuments = await this.sopDocumentModel.findAll({
      where: { is_active: true },
    });

    return sopDocuments
      .map((doc) => doc.vector_ids)
      .reduce((prev, cur) => prev.concat(cur), []);
  }

  async getSOPCategories() {
    const categories = await this.sopDocumentModel.findAll({
      attributes: ['category'],
      group: ['category'],
      where: { is_active: true },
    });

    return categories.map((cat) => cat.category);
  }

  async bulkUploadSOPs(
    files: Array<{ content: Buffer; name: string; mimetype: string }>,
    config: { uploaded_by: number },
  ) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // Auto-detect category from filename
        const category = this.detectSOPCategory(file.name);
        const title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

        const sopDocument = await this.uploadSOPDocument(file, {
          title,
          category,
          uploaded_by: config.uploaded_by,
        });

        results.push(sopDocument);
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message,
        });
      }
    }

    return {
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  private detectSOPCategory(filename: string): string {
    const name = filename.toLowerCase();

    if (name.includes('safety') || name.includes('security')) return 'safety';
    if (name.includes('quality') || name.includes('qa') || name.includes('qc'))
      return 'quality';
    if (
      name.includes('hr') ||
      name.includes('human') ||
      name.includes('employee')
    )
      return 'hr';
    if (
      name.includes('finance') ||
      name.includes('accounting') ||
      name.includes('budget')
    )
      return 'finance';
    if (name.includes('it') || name.includes('tech') || name.includes('system'))
      return 'it';
    if (
      name.includes('operation') ||
      name.includes('process') ||
      name.includes('procedure')
    )
      return 'operations';
    if (
      name.includes('compliance') ||
      name.includes('audit') ||
      name.includes('regulation')
    )
      return 'compliance';
    if (
      name.includes('training') ||
      name.includes('education') ||
      name.includes('learning')
    )
      return 'training';

    return 'general';
  }
}
