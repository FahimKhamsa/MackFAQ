import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ITrainingInput } from 'src/local-intents-responses-storage/local-intents-responses-storage.service';
import { TrainingLoaderService } from './training-loader/training-loader.service';
import { IMessage } from 'src/api/dto/get-complete.dto';
import { MessageTypes } from 'src/api/api.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';
import { LearningSession } from './learnings-sessions.model';
import { InjectModel } from '@nestjs/sequelize';
import { Readable } from 'stream';
import * as FormData from 'form-data';
import { LearningSessionProjectConnection } from './learnings-sessions-project-connection.model';

@Injectable()
export class LargeFilesProcessingService implements OnModuleInit {
    private logger = new Logger(LargeFilesProcessingService.name);

    constructor(
        private trainingLoaderService: TrainingLoaderService,
        private httpService: HttpService,
        @InjectModel(LearningSession) private learningSession: typeof LearningSession,
        @InjectModel(LearningSessionProjectConnection) private readonly learningSessionProjectConnection: typeof LearningSessionProjectConnection,
    ) {
    }

    async onModuleInit() {
        await this.legacyProjectsConnections();
    }

    public async getLearningSessionById(id: number) {
        return this.learningSession.findByPk(id);
    }

    public async processWithConversationChain(prompt: string, conversationData: IMessage[] = [], docsData: string[] = [`The President said about Justice Breyer that he is cool boy. Everyone said, that President's words are false`], config: { abortController: AbortController, humanPrefix?: string, aiPrefix?: string, prompt?: string }) {

        const conversationDataCompiled = [];

        const type2key = {
            [MessageTypes.AI_MESSAGE]: 'answer',
            [MessageTypes.USER_MESSAGE]: 'question'
        };
    
        let i = 0;

        for (const message of conversationData) {
            if (conversationDataCompiled[i] === undefined) {
                conversationDataCompiled[i] = {
                    question: '',
                    answer: '',
                }
            }

            conversationDataCompiled[i][type2key[message.type]] += '\n' + message.message;

            if (message.type === MessageTypes.AI_MESSAGE) {
                if (i === 0 && !conversationDataCompiled[i].question) {
                    conversationDataCompiled[i].question = 'Hello';
                }
                i++;
            }
        }

        console.log(conversationDataCompiled);

        const docsDataFiltered = docsData.map(v => v.trim()).filter(v => !!v);

        if (docsDataFiltered.length) {
            // return await this.trainingLoaderService.processWithConversationChain(prompt, conversationDataCompiled, docsDataFiltered, config);
            return {
                getAnswerFromChain: () => this.privateApiProcessor(prompt, docsDataFiltered, conversationData, config)
            }
        }
        return await this.trainingLoaderService.processWithConversationChainOnly(prompt, conversationDataCompiled, config);
    }

    private async privateApiProcessor(input: string, docsIds: string[], conversationData: IMessage[], config: { prompt?: string }) {
        console.log("Start")
        // const result = await firstValueFrom(this.httpService.post('https://aidocs.kaizencloud.net/v1/chunks', { context_filter: { docs_ids: docsIds }, text: input })
        //     .pipe(map(e => e?.data?.data?.[0]?.text ?? null)));
        const result = await firstValueFrom(this.httpService.post('https://aidocs.kaizencloud.net/v1/chunks', { context_filter: { docs_ids: docsIds }, text: input })
            .pipe(map(e => e?.data?.data && e?.data?.data?.map(v => v?.document?.doc_id ?? null) || [])));

        const docsList = result.filter(r => !!r);

        const msgTypeToPAPI = {
            [MessageTypes.AI_MESSAGE]: 'assistant',
            [MessageTypes.SYSTEM_MESSAGE]: 'system',
            [MessageTypes.USER_MESSAGE]: 'user',
        }


        const messages = conversationData.map(r => ({ content: r.message, role: msgTypeToPAPI[r.type] }));

        messages.push({
            content: input,
            role: "user",
        });

        if (config.prompt) {
            messages.unshift({
                content: config.prompt,
                role: 'system'
            });
        }


        console.log({docsList, input, messages});

        const chatResult = await firstValueFrom(this.httpService.post('https://aidocs.kaizencloud.net/v1/chat/completions', { 
            context_filter: { docs_ids: docsList }, 
            "include_sources": true,
            "messages": messages,
            "stream": false,
            "use_context": true          
        })
            .pipe(map(e => e?.data?.choices?.[0] ?? null)));

        let resultText = chatResult?.message?.content;
        
        if (chatResult) {
            const sources = chatResult.sources.map(source => `File: ${source.document.doc_metadata.file_name}. Page: ${source.document.doc_metadata.page_label ?? 'Not found'}`).filter((value, index, array) => array.indexOf(value) === index).join('\n\n');  
            if (sources) {
                resultText = resultText + '\n\nSource(s):\n' + sources;
            }
        }

        return resultText;
    }
    
    private formatChatHistory(chagHistory: IMessage[]) {
        const messages = [];
        const messagesDict = {};

        this.logger.log({chagHistory});

        for (const i in chagHistory) {
            if (!chagHistory[i].previousMessageId || !(chagHistory[i].previousMessageId in messagesDict)) {
                messagesDict[chagHistory[i].messageId] = [chagHistory[i].message];
                messages.push(messagesDict[chagHistory[i].messageId]);
            } else if (chagHistory[i].previousMessageId in messagesDict) {
                messagesDict[chagHistory[i].previousMessageId].push(chagHistory[i].message);
            }
        }

        this.logger.log({messagesDict});

        return messages
    }

    public async getAnswerFromApi(question: string, chagHistory: IMessage[], bot_id: string, promptPrefix: string = null): Promise<{ text: string, sources: { text: string }[] }> {
        const messagesHistory = this.formatChatHistory(chagHistory);

        this.logger.log({ messagesHistory });

        const response = await this.trainingLoaderService.getAnswer(question, messagesHistory, bot_id, promptPrefix);

        this.logger.log(response);

        if (!response) {
            return {
                text: null,
                sources: [],
            };
        }

        const result = {
            text: response.text as string,
            sources: response.sourceDocuments.map(v => ({ text: v.metadata.source as string })) as { text: string }[],
        };

        return result;
    }

    public async createLearningInput(rows: ITrainingInput[], bot_id: string) {
        let output = '';
        let i = 1;
        for (const row of rows) {
            output += row.questions.map(question => "Q:\n" + question + "\nA:\n" + row.answer).join("\n\n") + '\n\n';
        }
        // await this.trainingLoaderService.loadTrainingFiles(output, bot_id);
        return output.trim();
    }

    public async getDocsIds(config: { project_id?: number, bot_id?: number }, docsIds?: number[]) {
        const savedLearning = await this.getDocs(config);
        return savedLearning.filter(r => !docsIds || docsIds.includes(r.id)).map(r => r.docs_ids_from_provider).reduce(((prev,cur) => prev.concat(cur)), []);
    }

    public async getDocs(config: { project_id?: number, bot_id?: number }) {
        if (!config.bot_id) {
            return [];
        }
        if (!config.project_id) {
            return [];
        }

        if (!config.project_id) {
            return this.learningSession.findAll({
                where: {
                    project_id: config.project_id,
                    bot_id: config.bot_id,
                }
            });
        }


        return (await this.getAllConnectionsByProject(config.project_id)).map(connection => connection.learning_session);
    }

    async legacyProjectsConnections() {
        const files = await this.learningSession.findAll();

        for (const file of files) {
            if (!file.project_id) {
                continue;
            }
            await this.learningSessionProjectConnection.findOrCreate({ paranoid: false, where: { project_id: file.project_id, learning_session_id: file.id }});
        }
    }

    public async deleteDoc(id: number) {
        const deleteResult = await this.learningSession.destroy({
            where: {
                id,
            }
        });

        return deleteResult > 0;
    }

    private async learnPrivateApi(file: { content: Buffer, name: string, mimetype: string }) {
        const supportedMimes = [ 
            'application/pdf', 
            'text/csv',
            'application/vnd.ms-excel', // XLS
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
            'text/plain', // TXT - emails, transcripts
            'image/jpeg', 'image/png', 'image/gif' // Screenshots for compliance
        ];

        if (!supportedMimes.includes(file.mimetype)) {
            throw new BadRequestException("You can upload .PDF, .CSV, .XLS, .XLSX, .TXT, .JPG, .PNG, or .GIF files only");
        }

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
                extractedText = `Screenshot: ${file.name} - Document security compliance image`;
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
            file.name = originalName.replace(/\.[^/.]+$/, '') + '_processed.txt';
        }

        const formData = new FormData();
        formData.append('file', processedContent, file.name);

        console.log(formData);        

        const chatResult = await firstValueFrom(this.httpService.post('https://aidocs.kaizencloud.net/v1/ingest/file',formData, { headers: { ...formData.getHeaders() } })
            .pipe(map(e => e?.data?.data?.map(v => v.doc_id))));

        return chatResult;
    }

    private async extractTextFromExcel(buffer: Buffer): Promise<string> {
        try {
            const readExcelFile = require('read-excel-file/node');
            const rows = await readExcelFile(buffer);
            return rows.map(row => row.join(' ')).join('\n');
        } catch (error) {
            console.error('Error extracting text from Excel file:', error);
            return `Excel file content could not be extracted: ${error.message}`;
        }
    }

    public async learnProviderWithFile(providerName: "private-api", file: { content: Buffer, name: string, mimetype: string }, config: { project_id: number, bot_id: number, creator_id: number }) {
        let docsIds = [];
        if (providerName === 'private-api') {
            docsIds = await this.learnPrivateApi(file);
        }

        const session = new this.learningSession();

        let fname = file.name;

        if (fname.length > 253) {
            fname = fname.slice(0, 250) + '...'
        }

        session.file_name = fname;
        session.project_id = config.project_id;
        session.bot_id = config.bot_id;
        session.creator_id = config.creator_id;
        session.docs_ids_from_provider = docsIds;
        session.provider_id = providerName;
        
        // Add new metadata fields
        session.file_category = this.detectFileCategory(file.name, file.mimetype);
        session.page_count = this.estimatePageCount(file.content, file.mimetype);
        session.file_size = file.content.length;
        session.original_mime_type = file.mimetype;

        await session.save();
    }

    private detectFileCategory(filename: string, mimetype: string): string {
        const name = filename.toLowerCase();
        
        // Check filename patterns first
        if (name.includes('manual') || name.includes('guide') || name.includes('handbook')) return 'manual';
        if (name.includes('invoice') || name.includes('bill') || name.includes('receipt')) return 'invoice';
        if (name.includes('contract') || name.includes('agreement') || name.includes('terms')) return 'contract';
        if (name.includes('email') || name.includes('message') || name.includes('correspondence')) return 'email';
        if (name.includes('transcript') || name.includes('meeting') || name.includes('notes')) return 'transcript';
        
        // Check by file type
        if (mimetype.startsWith('image/')) return 'screenshot';
        if (mimetype === 'text/plain' && (name.includes('email') || name.includes('msg'))) return 'email';
        if (mimetype === 'text/plain' && (name.includes('transcript') || name.includes('meeting'))) return 'transcript';
        
        // Default category
        return 'document';
    }

    private estimatePageCount(content: Buffer, mimetype: string): number {
        // Simple page count estimation based on file size and type
        const sizeInKB = content.length / 1024;
        
        switch (mimetype) {
            case 'application/pdf':
                // Estimate ~50KB per page for PDF
                return Math.max(1, Math.round(sizeInKB / 50));
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                // Excel files typically have 1 sheet = 1 "page"
                return 1;
            case 'text/plain':
                // Estimate ~3KB per page for text files
                return Math.max(1, Math.round(sizeInKB / 3));
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
                // Images are single page
                return 1;
            default:
                return 1;
        }
    }
    
    public async disconnectLearningSeesionToProject(payload: { project_id: number, learning_session_id: number }) {
        await this.learningSessionProjectConnection.destroy({
            where: {
                project_id: payload.project_id,
                learning_session_id: payload.learning_session_id,
            },
        });
    }

    public async connectLearningSeesionToProject(payload: { project_id: number, learning_session_id: number }) {
        let conn = await this.learningSessionProjectConnection.findOne({
            where: {
                project_id: payload.project_id,
                learning_session_id: payload.learning_session_id,    
            },
            paranoid: false,
        });

        if (conn && !conn.isSoftDeleted()) {
            return;
        }

        if (!conn) {
            await this.learningSessionProjectConnection.create({
                project_id: payload.project_id,
                learning_session_id: payload.learning_session_id,    
            });
            return;
        }

        await conn.restore();
        return;
    }

    public async getAllConnectionsByProject(project_id: number | number[]) {
        return this.learningSessionProjectConnection.findAll({
            where: {
                project_id
            },
            include: [{
                as: 'learning_session',
                model: LearningSession,
                required: true,
            }],
        });
    }

    public async getAllConnectionsByBot(bot_id: number | number[]) {
        return this.learningSessionProjectConnection.findAll({
            where: {
                '$learning_session.bot_id$': bot_id,
            },
            include: ['learning_session']
        });
    }

    public async getAllDocs(bot_id: number) {
        return this.learningSession.findAll({
            where: {
                bot_id
            },
            include: ['connections']
        });
    }
}
