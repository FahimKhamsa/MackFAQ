import { Inject, Injectable, Logger } from "@nestjs/common";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { PineconeStore } from "@langchain/pinecone";
import { ILargeFilesProcessingApiConfig } from "../large-files-processing.constants";
import { makeChain } from "./utils/makechain";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { PineconeClient } from "@pinecone-database/pinecone";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { ConversationChain, ConversationalRetrievalQAChain, LLMChain } from "langchain/chains";
import { BufferMemory, ConversationSummaryMemory } from "langchain/memory";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { SynchronousInMemoryDocstore } from "langchain/dist/stores/doc/in_memory";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
import { OpenAI } from "@langchain/openai";

function escapeBraces(inputString) {
  // Escape "{" with "{{" and "}" with "}}"
  return inputString.replace(/({|})/g, match => {
      return match === '{' ? '{{' : '}}';
  });
}

@Injectable()
export class TrainingLoaderService {
  private logger = new Logger(TrainingLoaderService.name);

  constructor(@Inject('LARGE_FILES_PROCESSING_API_CONFIG') private largeFilesProcessingConfig: ILargeFilesProcessingApiConfig) {
  }

  private async getPineconeClient() {
    const pinecone = new PineconeClient();

    await pinecone.init({
      environment: this.largeFilesProcessingConfig.PINECONE_ENVIRONMENT ?? '', //this is in the dashboard
      apiKey: this.largeFilesProcessingConfig.PINECONE_API_KEY ?? '',
    });

    return pinecone;
  }

  public async processWithConversationChainOnly(message: string, messagesHistory: { question: string, answer: string }[], config: { abortController: AbortController, humanPrefix?: string, aiPrefix?: string, prompt?: string }) {
    if (!config.aiPrefix) {
      config.aiPrefix = 'AI';
    }
    
    if (!config.humanPrefix) {
      config.humanPrefix = 'Human';
    }

    if (!config.prompt) {
      config.prompt = '';
    }
    
    const model = new ChatOpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo', openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY, });

    const memory = new BufferMemory({
      aiPrefix: config.aiPrefix,
      humanPrefix: config.humanPrefix,
      memoryKey: "chat_history", // Must be set to "chat_history"
    });

    for (const message of messagesHistory) {
      await memory.saveContext({ question: message.question }, { text: message.answer });
    }

    const chain = new LLMChain({
      memory: memory,
      llm: model,
      verbose: true,
      // prompt: ChatPromptTemplate.fromPromptMessages([
      //   SystemMessagePromptTemplate.fromTemplate(
      //     config.prompt,
      //   ),
      //   HumanMessagePromptTemplate.fromTemplate(`Chat History:\n{chat_history}\n\n${config.humanPrefix}:\n{human_message}\n${config.aiPrefix}:`)
      // ]).
      prompt: new PromptTemplate({ inputVariables: ['chat_history', 'human_message'], template: `${escapeBraces(config.prompt)}\n\nChat History:\n{chat_history}\n\n${config.humanPrefix}:\n{human_message}\n\n${config.aiPrefix}:` })
    })

    return {
      getAnswerFromChain: () => chain.call({ human_message: message, signal: config.abortController.signal }).then(r => r.text),
    }
  }

  public async processWithConversationChain(message: string, messagesHistory: { question: string, answer: string }[], docsData: string[], config: { abortController: AbortController, humanPrefix?: string, aiPrefix?: string, prompt?: string }) {
    if (!config.aiPrefix) {
      config.aiPrefix = 'AI';
    }
    
    if (!config.humanPrefix) {
      config.humanPrefix = 'Human';
    }

    if (!config.prompt) {
      config.prompt = 'Your answer must be like a standart human message, be interesting';
    }

    const model = new ChatOpenAI({ temperature: 0.1, modelName: 'gpt-3.5-turbo', openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY, });
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments(docsData);
    const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings({ openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY, }));

    // const memory = new BufferMemory({
    //   memoryKey: "chat_history", // Must be set to "chat_history"
    // });

    const _DEFAULT_SUMMARIZER_TEMPLATE = `Progressively summarize the lines of conversation, adding onto the previous summary returning a new summary. Information from the example must not be in your answer.

EXAMPLE
Current summary:
${config.humanPrefix} asks what the ${config.aiPrefix} thinks of artificial intelligence. The ${config.aiPrefix} thinks artificial intelligence is a force for good.

New lines of conversation:
${config.humanPrefix}: I want to tell you that I realy like donuts. Why do you think artificial intelligence is a force for good?
${config.aiPrefix}: Because artificial intelligence will help humans reach their full potential.

New summary:
${config.humanPrefix} tells the ${config.aiPrefix} that ${config.humanPrefix} realy likes donuts and ${config.humanPrefix} asks what the ${config.aiPrefix} thinks of artificial intelligence. The ${config.aiPrefix} thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

    const memory = new ConversationSummaryMemory({
      memoryKey: 'chat_history',
      humanPrefix: config.humanPrefix,
      aiPrefix: config.aiPrefix,
      llm: new ChatOpenAI({ verbose: true, modelName: 'gpt-3.5-turbo', temperature: 0, openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY }),
      prompt: new PromptTemplate({
        inputVariables: ["summary", "new_lines"],
        template: _DEFAULT_SUMMARIZER_TEMPLATE,
      })
    });

    for (const message of messagesHistory) {
      await memory.saveContext({ question: message.question }, { text: message.answer });
    }

    const chain = ConversationalRetrievalQAChain.fromLLM(
      model,
      vectorStore.asRetriever(),
      {
        memory: memory,

        questionGeneratorChainOptions: {
          template:
            'Given the following chat history:\n' +
            'Chat History:\n' +
            '{chat_history}\n\n' +
            `Based on the chat history and the Human's Prompt, extract the relevant details to the Human's prompt from the chat history and create a standalone prompt following the following formula: "relevant details. Human's Prompt.". Look for the details very attentively. Addresses, names, phone numbers, prices, currencies are very important details\n\n` +
            // `Based on the chat history and the Human's Prompt, extract ONLY THE RELEVANT TO THE HUMAN'S PROMPT DETAILS from the chat history and create a standalone prompt with the following formula: [relevant details]. [Human's Prompt]:\n\n` +
            `Human's Prompt:\n` +
            '{question}\n\n' +
            // 'Standalone Prompt Format:\n' + 
            // '[relevant details] {question}\n\n' + 
            'Standalone Prompt:',
          llm: new ChatOpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo', openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY, }),
        },
        qaChainOptions: {
          type: "stuff",
          prompt: new PromptTemplate({
            template: `Instruction:
1. You are an assistant providing information and engaging in a friendly conversation.
2. Your goal is to assist the user by answering their questions based on the provided FAQ.
3. If the user asks about the address, provide the address as a response.
4. Maintain a helpful and courteous tone throughout the conversation.
5. The dialogue summary can contain some useless information to simulate a natural conversation.
6. The user's question may already be addressed in the dialogue summary, so please pay attention to the context.
${config.prompt ? '7. ' + escapeBraces(config.prompt) : ''}.\n` + // If you don't know the answer, just say that you don't know, don't try to make up an answer.
              "\nFAQ:\n{context}\n\n" +
              "Dialogue Summary: {question}\n\n" + 
              "Asisstant answer:", inputVariables: ["context", "question"]
          }),
        },
        verbose: true,
      }
    );

    const getAnswerFromChain = async () => {
      const result = await chain.call({ question: message, signal: config.abortController.signal });
      return `${result.text}`;
    }

    return {
      getAnswerFromChain: () => getAnswerFromChain()
    }
  }
  public async loadTrainingFiles(content: string, PINECONE_NAME_SPACE: string) {
    try {
      /* Split text into chunks */
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.splitDocuments([new Document({ pageContent: content })]);
      this.logger.log('split docs', docs);

      this.logger.log('creating vector store...');
      /*create and store the embeddings in the vectorStore*/
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY });
      const index = (await this.getPineconeClient()).Index(this.largeFilesProcessingConfig.PINECONE_INDEX_NAME); //change to your own index name

      //embed the PDF documents
      await PineconeStore.fromDocuments(docs, embeddings, {
        pineconeIndex: index,
        namespace: PINECONE_NAME_SPACE,
        textKey: 'text',
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to ingest your data');
    }
  }

  public async getAnswer(question: string, chat_history: [string, string][], PINECONE_NAME_SPACE: string, promptPrefix: string = null) {
    const sanitizedQuestion = question.trim().replace(/\n/g, ' ');

    console.log(PINECONE_NAME_SPACE)

    try {
      const index = (await this.getPineconeClient()).Index(this.largeFilesProcessingConfig.PINECONE_INDEX_NAME); //change to your own index name

      /* create vectorstore*/
      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({ openAIApiKey: this.largeFilesProcessingConfig.OPEN_AI_KEY }),
        {
          pineconeIndex: index,
          textKey: 'text',
          namespace: PINECONE_NAME_SPACE, //namespace comes from your config folder
        },
      );

      //create chain
      const chain = makeChain(vectorStore, this.largeFilesProcessingConfig.OPEN_AI_KEY, promptPrefix, { message_as_continuation: chat_history.length >= 1 });
      //Ask a question using chat history
      const response = await chain.call({
        question: sanitizedQuestion,
        chat_history: chat_history,
      });

      return response;
    } catch (error: any) {
      this.logger.error(error, error.stack);
    }
    return null;
  }

}
