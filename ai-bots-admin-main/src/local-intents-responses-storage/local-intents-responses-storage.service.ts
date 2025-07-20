import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ICreateLocalStorageDTO, IUpdateLocalStorageDTO } from './dto/localStorage.dto';
import { IntentExampleModel } from './entities/intent-example.model';
import { IntentModel } from './entities/intent.model';
import { LocalStorageModel } from './entities/local-storage-project.model';
import { ResponseModel } from './entities/response.model';
import { parse } from 'csv-parse';
import * as crypto from 'crypto';

export type ITrainingInput = { questions: string[], answer: string };
export type IConfig = { currentUserId: number, bot_id: number, project_id?: number, forcePromptPrefix?: string };

interface IProjectCreatePayload extends ICreateLocalStorageDTO { creator_id: number }

@Injectable()
export class LocalIntentsResponsesStorageService {
    private logger = new Logger(LocalIntentsResponsesStorageService.name);

    constructor(
        @InjectModel(IntentModel) private intentModel: typeof IntentModel,
        @InjectModel(IntentExampleModel) private intentExampleModel: typeof IntentExampleModel,
        @InjectModel(ResponseModel) private responseModel: typeof ResponseModel,
        @InjectModel(LocalStorageModel) private localStorageModel: typeof LocalStorageModel,
    ) { }

    public async createProject(payload: IProjectCreatePayload) {
        const project = await this.localStorageModel.create({ ...payload });
        await this.setProjectLink(project);
        await project.save();
        return project;
    }

    public async updateProject(id: number, payload: IUpdateLocalStorageDTO) {
        const project = await this.localStorageModel.findByPk(id);

        if (!project) {
            throw new HttpException('Not foubd', HttpStatus.BAD_REQUEST);
        }

        const dataToUpd = payload;
        delete dataToUpd.id;
        delete dataToUpd.bot_id;
        console.log(dataToUpd)
        return await project.update(dataToUpd);
    }

    public async getProjectById(id: number) {
        return await this.localStorageModel.findByPk(id);
    }

    public async getProjectByLink(public_link: number) {
        return await this.localStorageModel.findOne({
            where: {
                public_link
            }
        });
    }

    private formatRawLinesInput(input: string): ITrainingInput[] {
        return input.replace('\r', '').split("\n\n").map(lines => {
            let splitted = lines.split('\n');
            if (splitted.length >= 1) {
                const delimiter = splitted[splitted.length - 1].lastIndexOf('? :');
                if (delimiter !== -1) {
                    splitted = [...splitted.slice(0, -1), splitted[splitted.length - 1].substring(0, delimiter) + '?', splitted[splitted.length - 1].substring(delimiter + '? :'.length)];
                }
            }
            if (splitted.length < 2) {
                throw new Error('Input format is incorrect');
            }
            return {
                questions: splitted.slice(0, splitted.length - 1).map(r => (r + ' ').split('? ').map(r => r.replace(/^\s+/, '').replace(/\s+$/, ''))).flat().filter(r => !!r).map(r => r + '?'),
                answer: splitted[splitted.length - 1],
            }
        })
    }

    private async parseCsv(trainCsv: Buffer | string) {
        let parsedRows = await new Promise<ITrainingInput[]>((resolve, reject) => {
            const result: ITrainingInput[] = [];
            parse(trainCsv, { delimiter: ',', from_line: 1 })
                .on('data', (row) => {
                    row[1] = row[1].replace(/^\s+/, '').replace(/\s+$/, '');
                    result.push({
                        questions: (row[0] + ' ').split('? ').map(r => r.replace(/^\s+/, '').replace(/\s+$/, '')).filter(r => !!r).map(r => r + '?'),
                        answer: row[1],
                    })
                })
                .on('end', () => {
                    resolve(result);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        let lastEmptyAnswer = null;
        let lastWithQuetions = null;

        for (const i in parsedRows) {
            if (parsedRows[i].questions.length) {
                lastWithQuetions = i;
            }

            if (!parsedRows[i].answer) {
                lastEmptyAnswer = i;
                continue;
            }

            if (!parsedRows[i].questions.length) {
                parsedRows[lastWithQuetions].answer += '\n' + parsedRows[i].answer;
            }

            if (lastEmptyAnswer === null || parsedRows[i].questions.length) {
                lastEmptyAnswer = null;
                continue;
            }

            parsedRows[lastEmptyAnswer].answer = parsedRows[i].answer;
            lastEmptyAnswer = null;
        }

        parsedRows = parsedRows.map(r => ({ questions: r.questions.map(v => v.trim()).filter(v => !!v), answer: r.answer.trim() })).filter(r => r.questions.length && r.answer);

        return parsedRows;
    }

    public async train(trainCsv: Buffer | string, params: { bot_id: number, project_id: number, mode: 'csv' | 'raw-lines' | 'xlsx' }) {
        const dataInput: ITrainingInput | {} = await new Promise((resolve, reject) => {
            const result: ITrainingInput[] = [];
            if (params.mode === 'csv') {
                resolve(this.parseCsv(trainCsv));
            }

            if (params.mode === 'xlsx' && Buffer.isBuffer(trainCsv)) {
            }

            if (params.mode === 'raw-lines') {
                try {
                    return resolve(this.formatRawLinesInput(trainCsv.toString('utf-8')));
                } catch (error) {
                    reject(error);
                }
            }

            reject('Type is unsupported!');
        }).catch((error) => {
            console.log(error)
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        });

        if (!('length' in dataInput) || dataInput.length === 0) {
            throw new HttpException('Empty data', HttpStatus.BAD_REQUEST);
        }

        const _dataInput = dataInput as unknown as any;

        this.logger.warn(JSON.stringify(_dataInput, undefined, 4));

        const trainResult = await this.addRawData(_dataInput, { bot_id: params.bot_id, currentUserId: null, project_id: params.project_id });

        return trainResult;
    }

    public async getListOfProjects(config: Partial<IConfig>) {
        return await this.localStorageModel.findAll({
            where: {
                bot_id: config.bot_id,
            },
            order: [['id', 'ASC']],
        });
    }

    public async deleteProject(id: number, config: IConfig) {
        return await this.localStorageModel.destroy({
            where: {
                id: id,
                bot_id: config.bot_id,
            }
        });
    }

    public async generateLinkForProject() {
        return crypto.createHash('md5').update(Date.now().toString()).digest('base64url');
    }

    public async setProjectLink(project: LocalStorageModel) {
        if (!project.public_link) {
            project.public_link = await this.generateLinkForProject();
        }

        return project.public_link;
    }

    public async getAnswer(inputText: string, config: IConfig) {
        const inputTextProcessedVariants = this.replaceApostrophesWithLongForms(this.processIntent(inputText, true, true))
            .map((t) => this.replaceLongFormsWithApostrophes(this.processIntent(t, true, true))).flat(2);
        for (const inputTextProcessed of inputTextProcessedVariants) {
            console.log(inputTextProcessed);
            const example = await this.intentExampleModel.findOne({
                where: {
                    text_without_punctuation_marks: inputTextProcessed,
                    '$intent.bot_id$': config.bot_id,
                },
                include: [
                    {
                        model: this.intentModel, as: 'intent',
                    }
                ]
            });

            if (!example) {
                continue;
            }

            const response = await this.responseModel.findOne({
                where: {
                    intent_id: example.intent_id,
                },
                order: [['id', 'DESC']],
            });

            if (!response) return;

            return {
                id: response.id,
                text: response.text,
            };
        }
    }

    public async getQuestionOrCreate(question: string, config: IConfig) {
        let exists = await this.intentModel.findOne({
            where: {
                bot_id: config.bot_id,
                ...config.project_id && { project_id: config.project_id },
                text_original: question,
            }
        });

        if (exists) {
            await this.deleteResponses(exists.id);
            await this.deleteExamples(exists.id);
        }

        if (!exists) {
            exists = await this.intentModel.create({
                bot_id: config.bot_id,
                ...config.project_id && { project_id: config.project_id },
                text_original: question,
                creator_id: config.currentUserId,
            });
        }

        return exists;
    }

    public async clearProjectIntents(bot_id: number, project_id: number = null) {
        if (!project_id) {
            project_id = (await this.defaultProject(bot_id)).id
        }
        const intents = await this.intentModel.findAll({
            where: {
                bot_id,
                project_id,
            }
        });

        await this.intentModel.destroy({
            where: {
                bot_id,
                project_id,
            }
        });

        await this.intentExampleModel.destroy({ where: { bot_id, project_id } });

        await this.responseModel.destroy({
            where: {
                intent_id: intents.map(v => v.id)
            }
        });
        

        return intents.length;
    }

    public async getQuestionExamplesOrCreate(project_id: number, bot_id: number, intent_id: number, question: string) {
        let exists = await this.intentExampleModel.findOne({
            where: {
                project_id,
                bot_id,
                text: question,
            }
        });

        if (exists && exists.intent_id !== intent_id) {
            exists.destroy();
            exists = null;
        }

        if (!exists) {
            exists = await this.intentExampleModel.create({
                bot_id,
                project_id,
                text: question,
                intent_id,
            });
        }

        return exists;
    }

    public async getRawData(config: IConfig) {
        const result: {
            questions: {
                text: string,
                id: number,
            }[],
            answer: {
                id: number,
                text: string,
            },
        }[] = [];

        const bot_id = config.bot_id || null;
        let project_id = config.project_id || null;

        const prompts = await this.intentModel.findAll({
            where: {
                bot_id,
                project_id,
            }
        });

        const promptsExamples = await this.intentExampleModel.findAll({ where: { intent_id: prompts.map(v => v.id) } });

        const responses = await this.responseModel.findAll({
            where: {
                intent_id: prompts.map(v => v.id)
            }
        });


        const promptsByIntentId = {};
        promptsExamples.forEach(element => {
            if (element.intent_id in promptsByIntentId) {
                promptsByIntentId[element.intent_id].push({ text: element.text, id: element.id });
            } else {
                promptsByIntentId[element.intent_id] = [{ text: element.text, id: element.id }];
            }
        });

        const responsesByIntentId = {};
        responses.forEach(element => {
            if (element.intent_id in responsesByIntentId) {
                responsesByIntentId[element.intent_id].push({ text: element.text, id: element.id });
            } else {
                responsesByIntentId[element.intent_id] = [{ text: element.text, id: element.id }];
            }
        });

        for (const intent_id in promptsByIntentId) {
            result.push({
                questions: promptsExamples,
                answer: responsesByIntentId[intent_id][0] ?? null,
            })
        }

        return result;
    }

    public async addRawData(inputs: { answer: string, questions: string[] }[], config: IConfig) {
        const result: {
            questions: {
                text: string,
                id: number,
            }[],
            answer: {
                id: number,
                text: string,
            },
        }[] = [];

        for (const input of inputs) {
            const result_questions = [];
            const questionIntent = await this.getQuestionOrCreate(input.questions[0], config);

            for (const question of input.questions) {
                const example = await this.getQuestionExamplesOrCreate(config.project_id || null, config.bot_id || null, questionIntent.id, question);
                result_questions.push({
                    text: example.text,
                    id: example.id,
                });
            }

            const response = await this.responseModel.create({
                text: input.answer,
                creator_id: config.currentUserId,
                intent_id: questionIntent.id,
            });

            result.push({
                questions: result_questions,
                answer: {
                    text: response.text,
                    id: response.id,
                }
            })
        }

        return result;
    }

    public async getAllIntents(config: IConfig) {
        return await this.intentExampleModel.findAll({
            where: {
                bot_id: config.bot_id,
                ...config.project_id && { project_id: config.project_id },
            }
        });
    }

    public async getResponseByIntentId(exampleId: number) {
        const example = await this.intentExampleModel.findOne({ where: { id: exampleId } })
        return await this.responseModel.findOne({
            where: {
                intent_id: example.intent_id
            }
        });
    }

    public async addIntentsWithResponses(inputs: ITrainingInput[], config: IConfig) {
        const result: {
            questions: {
                text: string,
                id: number,
            }[],
            answer: {
                id: number,
                text: string,
            },
        }[] = [];

        for (const input of inputs) {
            const resultDetecting = await this.addIntentOrUpdate(input.questions, config);
            if (resultDetecting.oldIntentsId.length) {
                await this.deleteResponses(resultDetecting.oldIntentsId);
            }
            const exMap = {};
            for (const ex of resultDetecting.newExamples) {
                if (exMap[ex.intent_id] === undefined) {
                    exMap[ex.intent_id] = [];
                }
                exMap[ex.intent_id].push(ex);
            }
            const ids = [...Object.keys(exMap), ...resultDetecting.oldIntentsId].map(v => +v).filter((value, index, array) => array.indexOf(value) === index);
            for (const intentId of ids) {
                const response = await this.addResponse(input.answer, +intentId, config);
                const examples = await this.intentExampleModel.findAll({
                    where: {
                        intent_id: intentId,
                    }
                });
                result.push({
                    questions: examples.map((v) => ({ text: v.text_without_punctuation_marks, id: v.id })),
                    answer: {
                        id: response.id,
                        text: response.text,
                    }
                });
            }
        }

        return result;
    }

    public async defaultProject(bot_id: number) {
        const projects = await this.getListOfProjects({ bot_id: bot_id });
        if (projects.length) {
            return projects[0];
        }
        return await this.createProject({ bot_id: bot_id, name: 'Project 1', creator_id: null });
    }

    public async getCompiledTrainData(bot_id: number, project_id: number) {
        if (!+project_id) {
            project_id = (await this.defaultProject(bot_id)).id;
        }

        const prompts = await this.intentModel.findAll({
            where: {
                bot_id,
                project_id,
            }
        });

        const promptsExamples = await this.intentExampleModel.findAll({ where: { intent_id: prompts.map(v => v.id) } });

        const responses = await this.responseModel.findAll({
            where: {
                intent_id: prompts.map(v => v.id)
            }
        });


        const promptsByIntentId = {};
        promptsExamples.forEach(element => {
            if (element.intent_id in promptsByIntentId) {
                promptsByIntentId[element.intent_id].push(element.text);
            } else {
                promptsByIntentId[element.intent_id] = [element.text];
            }
        });

        const responsesByIntentId = {};
        responses.forEach(element => {
            if (element.intent_id in responsesByIntentId) {
                responsesByIntentId[element.intent_id].push(element.text);
            } else {
                responsesByIntentId[element.intent_id] = [element.text];
            }
        });


        let result = '';


        for (const intent_id in promptsByIntentId) {
            const prompts = promptsByIntentId[intent_id].join('\n');

            result += prompts + '\n' + (responsesByIntentId[intent_id] ?? '') + '\n\n';
        }


        return result.trim();
    }

    public async deleteResponses(intent_id: number | number[]) {
        return await this.responseModel.destroy({
            where: {
                intent_id,
            }
        });
    }

    public async deleteExamples(intent_id: number | number[]) {
        return await this.intentExampleModel.destroy({
            where: {
                intent_id,
            }
        });
    }

    public processIntent(intentText: string, rmqm = false, apostrofKeep = false) {
        let text = intentText.replace(/\s+/g, ' ').replace(/^\s+/, '').replace(/\s+$/, '').replace(/\s+\'\s+/g, "'");

        if (rmqm) {
            if (apostrofKeep) {
                text = text.replace(/[^\w\s\']/g, '');
            } else {
                text = text.replace(/[^\w\s]/g, '');
            }
        }

        return text.toLowerCase();
    }

    private longShortFormsReplaces(input: string, params: { mode: 'long_2_short' | 'short_2_long' }) {
        // define the long forms and their corresponding short forms
        const contractions1 = {
            "could have": "could've",
            "should have": "should've",
            "would have": "would've",
        };

        const contractionsWithNot = {
            "am not": "ain't",
            "are not": "aren't",
            "cannot": "can't",
            "can not": "can't",
            "could not": "couldn't",
            "did not": "didn't",
            "do not": "don't",
            "does not": "doesn't",
            "had not": "hadn't",
            "has not": "hasn't",
            "have not": "haven't",
            "is not|": "isn't",
            "must not": "mustn't",
            "should not": "shouldn't",
            "was not": "wasn't",
            "were not": "weren't",
            "will not": "won't",
            "would not": "wouldn't",
        };

        const contractionsWithPronounce = {
            "I am": "I'm",
            "you are": "you're",
            "he is": "he's",
            "she is": "she's",
            "it is": "it's",
            "we are": "we're",
            "they are": "they're",


            "I have": "I've",
            "you have": "you've",
            "we have": "we've",
            "they have": "they've",


            "he has": "he's",
            "she has": "she's",
            "it has": "it's",
            "that has": "that's",
            "there has": "there's",


            "I will": "I'll",
            "you will": "you'll",
            "we will": "we'll",
            "they will": "they'll",


            "he will": "he'll",
            "she will": "she'll",
            "it will": "it'll",
            "that will": "that'll",
            "there will": "there'll",

            "who will": "who'll",
            "what will": "what'll",
            "when will": "when'll",
            "where will": "where'll",
            "why will": "why'll",
            "how will": "how'll",

            "who would": "who'd",
            "what would": "what'd",
            "when would": "when'd",
            "where would": "where'd",
            "why would": "why'd",
            "how would": "how'd"

        };

        const contractionsWithQuestions1 = {
            "who has": "who's",
            "what has": "what's",
            "when has": "when's",
            "where has": "where's",
            "why has": "why's",
            "how has": "how's"
        }

        const contractionsWithQuestions2 = {
            "who have": "who've",
            "what have": "what've",
            "when have": "when've",
            "where have": "where've",
            "why have": "why've",
            "how have": "how've"
        }

        const contractionsWithQuestions3 = {
            "who is": "who's",
            "what is": "what's",
            "when is": "when's",
            "where is": "where's",
            "why is": "why's",
            "how is": "how's"
        }

        const contractionsWithQuestions4 = {
            "who are": "who're",
            "what are": "what're",
            "when are": "when're",
            "where are": "where're",
            "why are": "why're",
            "how are": "how're"
        }

        const UnCommonContractions = {
            "are not|": "aren't",
            "cannot|": "can't",
            "can not|": "can't",
            "could not": "couldn't",
            "could not have": "couldn't've",
            "did not": "didn't",
            "do not": "don't",
            "does not": "doesn't",
            "had not|": "hadn't",
            "had not have|": "hadn't've",
            "has not|": "hasn't",
            "have not|": "haven't",
            "I had|": "I'd",
            "I would|": "I'd",
            "I am": "I'm",
            "I have|": "I've",
            "is not": "isn't",
            "it is": "it's",
            "it has": "it's",
            "might not|": "mightn't",
            "might not have|": "mightn't've",
            "must not": "mustn't",
            "need not": "needn't",
            "ought not": "oughtn't",
            "shall not": "shan't",
            "she had": "she'd",
            "she would": "she'd",
            "she is": "she's",
            "should not": "shouldn't",
            "should not have": "shouldn't've",
            "that is": "that's",
            "there is": "there's",
            "there are": "there're",
            "they are": "they're",
            "they have": "they've",
            "was not|": "wasn't",
            "we are|": "we're",
            "we have|": "we've",
            "were not": "weren't",
            "what are|": "what're",
            "what did|": "what'd",
            "what has|": "what's",
            "what have|": "what've",
            "where is|": "where's",
            "who are|": "who're",
            "who had|": "who'd",
            "who has|": "who's",
            "who have|": "who've",
            "why are|": "why're",
            "why did|": "why'd",
            "why has|": "why's",
            "will not|": "won't",
            "would not|": "wouldn't",
            "would not have|": "wouldn't've",
            "you are|": "you're",
            "you have|": "you've",
            "you had|": "you'd",
            "you would|": "you'd",

            "going to": "gonna",
            "want to": "wanna",
            "kind of": "kinda",
            "sort of": "sorta",
            "you all": "y'all",
            "am not|is not|are not|has not|have not": "ain't",
            "give me": "gimme",
            "because": "cuz",
            "got to|have got to": "gotta",

            "your|": "you",
            "u|": "you",

            "the|": '!.',
            "an|": '!.',
            "a|": '!.',

            "am|": '!.',
            "is|": '!.',
            "are|": '!.',

            "was|": '!.',
            "were|": '!.',

            "will|": '!.',
            "shall|": '!.',
        };
        let contractionsDict: { [k: string]: string } = { ...contractionsWithNot, ...contractions1, ...contractionsWithNot, ...contractionsWithPronounce, ...contractionsWithQuestions1, ...contractionsWithQuestions2, ...contractionsWithQuestions3, ...contractionsWithQuestions4, ...UnCommonContractions };

        if (params.mode === 'short_2_long') {
            const shorts = {};
            for (const [long, short] of Object.entries(contractionsDict)) {
                if (short === '!.') continue;
                if (shorts[short] === undefined) {
                    shorts[short] = long;
                } else {
                    shorts[short] += '|' + long;
                }
            }

            contractionsDict = { ...shorts };
        }

        const createVariants = (_input: string) => {
            const keysToReplaceFound: any = {};
            const variants = [];

            for (const keyLongForm in contractionsDict) {
                let longFormsToReplace = keyLongForm.split('|');
                let replacements = contractionsDict[keyLongForm].toLowerCase().split('|');

                const checkVariants = longFormsToReplace.length > 1;

                longFormsToReplace.forEach(f => {
                    if (!f) return;
                    f = f.toLowerCase();
                    if (_input.includes(f)) {
                        replacements.forEach(replacement => {
                            if (!replacement) return;
                            if (replacement === '!.') replacement = '';
                            keysToReplaceFound[`${f}_${replacement}_${checkVariants ? '1' : '0'}`] = [f, replacement, checkVariants];
                        });
                    }
                });
            }

            for (const [toReplace, replacement, checkVariants] of (Object.values(keysToReplaceFound) as string[][])) {
                let next = null
                const iter = _input.matchAll(new RegExp('(\\s|^)' + toReplace.toLowerCase() + '(\\s|$)', 'g'));
                while (next = iter.next()) {
                    if (!next.value && next.done) { break }
                    const localInput = next.value.input as string;
                    const local = this.processIntent(localInput.substring(0, next.value.index) + ' ' + replacement + ' ' + localInput.substring(next.value.index + toReplace.length + 1));
                    variants.push(local);
                    if (checkVariants) {
                        variants.push(...createVariants(local));
                    }
                }
            }
            return variants;
        }

        const uniqueVariants = createVariants(input).filter((value, index, array) => array.indexOf(value) === index);

        if (!uniqueVariants.length) {
            uniqueVariants.push(input);
        }

        return uniqueVariants;
    }

    private replaceLongFormsWithApostrophes(input: string) {
        const vairiants = this.longShortFormsReplaces(input, { mode: 'long_2_short' });
        return vairiants;
    }

    private replaceApostrophesWithLongForms(input: string) {
        const vairiants = this.longShortFormsReplaces(input, { mode: 'short_2_long' });
        return vairiants;
    }

    public async addIntentOrUpdate(intentTexts: string[], config: IConfig) {
        const examples: IntentExampleModel[] = [];
        let oldIntentsId: number[] = [];
        const intentTextsProcessed = intentTexts.map(
            (text) => [
                text,
                this.replaceApostrophesWithLongForms(this.processIntent(text, true, true))
                    .map((t) => this.replaceLongFormsWithApostrophes(this.processIntent(t, true))).flat()
            ]);

        const intentExists = await this.intentExampleModel.findAll({
            where: {
                text_without_punctuation_marks: intentTextsProcessed.map(v => v[1]).flat(),
                '$intent.bot_id$': config.bot_id,
            },
            include: [
                {
                    model: this.intentModel, as: 'intent',
                }
            ]
        }).then(r => {
            if (!r.length) {
                return {
                    keyByTextGrouped: {},
                    keyByIntentId: {},
                };
            }
            const groups: {
                [intent_id: number]: IntentExampleModel[],
            } = {};
            const keyByTextGrouped: {
                [text_without_punctuation_marks: string]: IntentExampleModel[],
            } = {};
            r.forEach(example => {
                if (groups[example.intent_id] === undefined) {
                    groups[example.intent_id] = [];
                }
                groups[example.intent_id].push(example);

                if (keyByTextGrouped[example.text_without_punctuation_marks] === undefined) {
                    keyByTextGrouped[example.text_without_punctuation_marks] = [];
                }
                keyByTextGrouped[example.text_without_punctuation_marks].push(example);
            });
            return {
                keyByTextGrouped,
                keyByIntentId: groups,
            };
        });

        const intentsProcessed = Object.fromEntries(intentTextsProcessed);

        for (const intentText of intentTexts) {
            let intentLocal = await this.intentModel.findOne({
                where: {
                    text_original: intentText,
                    bot_id: config.bot_id,
                }
            });

            const chosenAtTop = !!intentLocal;
            const groupsMatch = {};
            for (const processedVariant of intentsProcessed[intentText]) {
                const intentProcessedWithoutPunct = processedVariant;
                if (intentExists && intentProcessedWithoutPunct in intentExists.keyByTextGrouped) {
                    for (const ex of intentExists.keyByTextGrouped[intentProcessedWithoutPunct]) {
                        if (groupsMatch[ex.intent_id] === undefined) {
                            groupsMatch[ex.intent_id] = 0;
                        }
                        groupsMatch[ex.intent_id] += 1;
                    }
                    let newLocal = null;
                    let max = 0;
                    for (const [key, value] of Object.entries(groupsMatch)) {
                        if (+value > max) {
                            max = +value;
                            newLocal = key;
                        }
                    }
                    intentLocal = !chosenAtTop ? await this.intentModel.findByPk(newLocal) : intentLocal;
                    if (intentLocal) {
                        oldIntentsId.push(intentLocal.id)
                        const exLs = intentExists.keyByTextGrouped[intentProcessedWithoutPunct].filter(r => r.intent_id === intentLocal.id);
                        if (exLs) {
                            examples.push(...exLs)
                        }
                    }
                    continue;
                }
                if (intentLocal) {
                    oldIntentsId.push(intentLocal.id);
                }
                const intent = intentLocal || await this.intentModel.create({ creator_id: config.currentUserId, text_original: intentText, bot_id: config.bot_id });
                intentLocal = intent;
                const intentExample = await this.intentExampleModel.create({
                    intent_id: intent.id,
                    creator_id: config.currentUserId,
                    text: null,
                    text_without_punctuation_marks: intentProcessedWithoutPunct,
                });
                intentExists.keyByTextGrouped[intentProcessedWithoutPunct] = [
                    intentExample,
                ];
                examples.push(intentExample);
            }
        }

        return {
            oldIntentsId,
            newExamples: examples,
        };
    }

    public async addResponse(responseText: string, intent_id: number, config: IConfig) {
        return await this.responseModel.create({
            creator_id: config.currentUserId,
            text: responseText,
            intent_id: intent_id,
        });
    }
}
