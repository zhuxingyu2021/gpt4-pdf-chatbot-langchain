import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas';
import { ConversationalRetrievalQAChain } from 'langchain/chains';

const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_TEMPLATE = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

{context}

Question: {question}
Helpful answer in markdown:`;

const MODEL_NAME = process.env.MODEL_NAME??'gpt-3.5-turbo'

export const makeChainPipecone = (vectorstore: PineconeStore) => {
  const model = new ChatOpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: MODEL_NAME, //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_TEMPLATE,
      questionGeneratorTemplate: CONDENSE_TEMPLATE,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};

export const makeChainRedis = (vectorstore: RedisVectorStore) => {
  const model = new ChatOpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: MODEL_NAME, //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_TEMPLATE,
      questionGeneratorTemplate: CONDENSE_TEMPLATE,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};

export const makeChainMongo = (vectorsearch: MongoDBAtlasVectorSearch) => {
  const model = new ChatOpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: MODEL_NAME, //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorsearch.asRetriever(
    ),
    {
      qaTemplate: QA_TEMPLATE,
      questionGeneratorTemplate: CONDENSE_TEMPLATE,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};
