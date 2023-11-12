import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { AIMessage, HumanMessage } from 'langchain/schema';
import { makeChainMongo, makeChainPipecone, makeChainRedis } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { redisCli } from '@/utils/redis-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { REDIS_INDEX_NAME } from '@/config/redis';
import { MONGO_DBNAME, MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME, MONGO_COLLECTION_NAME } from '@/config/mongo';
import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas';
import { mongoCli } from '@/utils/mongo-client';

export async function runPipeconeChain(sanitizedQuestion:any, history:any) {
    if(pinecone == null){
        throw "Invalid pinecone server"
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME);

    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({}),
        {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE, //namespace comes from your config folder
        },
    );

    //create chain
    const chain = makeChainPipecone(vectorStore);

    const pastMessages = history.map((message: string, i: number) => {
        if (i % 2 === 0) {
        return new HumanMessage(message);
        } else {
        return new AIMessage(message);
        }
    });

    //Ask a question using chat history
    return chain.call({
        question: sanitizedQuestion,
        chat_history: pastMessages
    });
}

export async function runRedisChain(sanitizedQuestion:any, history:any) {
    if(redisCli == null){
        throw "Invalid redis server"
    }

    /* create vectorstore*/
    const vectorStore = new RedisVectorStore(
        new OpenAIEmbeddings({}),
        {
        redisClient: redisCli,
        indexName: REDIS_INDEX_NAME
        },
    );

    //create chain
    const chain = makeChainRedis(vectorStore);

    const pastMessages = history.map((message: string, i: number) => {
        if (i % 2 === 0) {
        return new HumanMessage(message);
        } else {
        return new AIMessage(message);
        }
    });

    //Ask a question using chat history
    return chain.call({
        question: sanitizedQuestion,
        chat_history: pastMessages
    });
}
  
export async function runMongoChain(sanitizedQuestion:any, history:any) {
    if(mongoCli == null){
        throw "Invalid mongo server"
    }

    /* create vectorsearch*/
    const vectorSearch = new MongoDBAtlasVectorSearch(
        new OpenAIEmbeddings({}),
        {
            collection: mongoCli.db(MONGO_DBNAME).collection(MONGO_COLLECTION_NAME),
            indexName: MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME,
            textKey: "text",
            embeddingKey: "embedding",
        },
    );

    //create chain
    const chain = makeChainMongo(vectorSearch);

    const pastMessages = history.map((message: string, i: number) => {
        if (i % 2 === 0) {
        return new HumanMessage(message);
        } else {
        return new AIMessage(message);
        }
    });

    //Ask a question using chat history
    return chain.call({
        question: sanitizedQuestion,
        chat_history: pastMessages
    });
}