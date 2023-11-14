import type { NextApiRequest, NextApiResponse } from 'next';
import { DATABASE_TYPE } from '@/config/common';
import { pinecone } from '@/utils/pinecone-client';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PINECONE_NAME_SPACE, PINECONE_INDEX_NAME } from '@/config/pinecone';
import { redisCli } from '@/utils/redis-client';
import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { REDIS_INDEX_NAME } from '@/config/redis';
import { mongoCli } from '@/utils/mongo-client';
import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas';
import { MONGO_DBNAME, MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME, MONGO_COLLECTION_NAME } from '@/config/mongo';
import { chromaCli } from '@/utils/chroma-client';
import { Chroma } from 'langchain/vectorstores/chroma';
import { CHROMA_COLLECTION } from '@/config/chroma';
import { makeChain } from '@/utils/makechain';
import { AIMessage, HumanMessage } from 'langchain/schema';

function getVectorStore(){
  switch (DATABASE_TYPE){
    case "pinecone":{
      if(pinecone == null){
        throw "Invalid pinecone server"
      }

      const index = pinecone.Index(PINECONE_INDEX_NAME);

      /* create vectorstore*/
      return new PineconeStore(
          new OpenAIEmbeddings({}),
          {
            pineconeIndex: index,
            textKey: 'text',
            namespace: PINECONE_NAME_SPACE, //namespace comes from your config folder
          },
      );
    }
    case "redis":{
      if(redisCli == null){
        throw "Invalid redis server"
      }

      /* create vectorstore*/
      return new RedisVectorStore(
          new OpenAIEmbeddings({}),
          {
          redisClient: redisCli,
          indexName: REDIS_INDEX_NAME
          },
      );
    }
    case "mongo":{
      if(mongoCli == null){
          throw "Invalid mongo server"
      }

      /* create vectorsearch*/
      return new MongoDBAtlasVectorSearch(
          new OpenAIEmbeddings({}),
          {
              collection: mongoCli.db(MONGO_DBNAME).collection(MONGO_COLLECTION_NAME),
              indexName: MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME,
              textKey: "text",
              embeddingKey: "embedding",
          },
      );
    }
    case "chroma":{
      if(chromaCli == null){
        throw "Invalid chroma server"
      }

      /* create vectorsearch*/
      return new Chroma(
          new OpenAIEmbeddings({}),
          {
              index: chromaCli,
              collectionName: CHROMA_COLLECTION,
          },
      );
    }
  }

  throw "Unknown database type";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history } = req.body;

  console.log('question', question);
  console.log('history', history);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  try {
    const vectorstore = getVectorStore();

    //create chain
    const chain = makeChain(vectorstore);

    const pastMessages = history.map((message: string, i: number) => {
        if (i % 2 === 0) {
        return new HumanMessage(message);
        } else {
        return new AIMessage(message);
        }
    });

    //Ask a question using chat history
    const response = await chain.call({
        question: sanitizedQuestion,
        chat_history: pastMessages
    });

    console.log('response', response);
    res.status(200).json(response);

  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
