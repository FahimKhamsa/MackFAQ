import { OpenAI } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import {
  LLMChain,
  loadQAChain,
  ChatVectorDBQAChain,
  ConversationalRetrievalQAChain,
} from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
IF THE QUESTION IS IN FRENCH THEN YOU MUST LEAVE THE QUESTION IN FRENCH. IF THE QUESTION IS IN ENGLISH YOU MUST LEAVE THE QUESTION IN ENGLISH.
Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);

const defaultPrompt = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.`;

export const makeChain = (
  vectorstore: PineconeStore,
  apiKey: string,
  promptPrefix: string = null,
  config: { message_as_continuation?: boolean } = {},
) => {
  if (!promptPrefix) {
    promptPrefix = defaultPrompt;
  }

  if (config.message_as_continuation) {
    promptPrefix += `\nRemember the Question is not the first user's message in the conversation. User must be sure your answer is the continuation of the covnersation`;
  }

  const QA_PROMPT = PromptTemplate.fromTemplate(`${promptPrefix}.

{context}

Question: {question}
Helpful answer in markdown:`);

  const questionGenerator = new LLMChain({
    llm: new OpenAI({ temperature: 0, openAIApiKey: apiKey }),
    prompt: CONDENSE_PROMPT,
  });

  const docChain = loadQAChain(
    //change modelName to gpt-4 if you have access to it
    new OpenAI({
      temperature: 0,
      modelName: 'gpt-3.5-turbo',
      openAIApiKey: apiKey,
    }),
    {
      type: 'stuff',
      prompt: QA_PROMPT,
    },
  );

  return new ConversationalRetrievalQAChain({
    retriever: vectorstore.asRetriever(4),
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
  });

  return new ChatVectorDBQAChain({
    vectorstore,
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    k: 4, //number of source documents to return. Change this figure as required.
  });
};
