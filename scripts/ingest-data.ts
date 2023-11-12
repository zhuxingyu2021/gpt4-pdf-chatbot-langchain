import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { RedisVectorStore } from 'langchain/vectorstores/redis';
import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas';
import { pinecone } from '@/utils/pinecone-client';
import { redisCli} from '@/utils/redis-client';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { MONGO_DBNAME, MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME, MONGO_COLLECTION_NAME } from '@/config/mongo';
import { REDIS_INDEX_NAME } from '@/config/redis';
import { DATABASE_TYPE } from '@/config/common';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { mongoCli } from '@/utils/mongo-client';

/* Name of directory to retrieve your files from 
   Make sure to add your PDF files inside the 'docs' folder
*/
const filePath = 'docs';

export const run = async () => {
  try {
    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new PDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();

    switch(DATABASE_TYPE){
      case "pinecone":{
        if(pinecone != null){
          const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

          //embed the PDF documents
          await PineconeStore.fromDocuments(docs, embeddings, {
            pineconeIndex: index,
            namespace: PINECONE_NAME_SPACE,
            textKey: 'text',
          });
        }

        break;
      }
      case "redis":{

        if(redisCli != null){
          //embed the PDF documents
          await RedisVectorStore.fromDocuments(docs, embeddings, {
            redisClient: redisCli,
            indexName: REDIS_INDEX_NAME,
          });
        }

        break;
      }

      case "mongo":{
        if(mongoCli != null){
          await MongoDBAtlasVectorSearch.fromDocuments(docs, embeddings, {
            collection: mongoCli.db(MONGO_DBNAME).collection(MONGO_COLLECTION_NAME),
            indexName: MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME,
            textKey: "text",
            embeddingKey: "embedding",
          })
        }

        break;
      }
    }

    
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }finally{
    if(redisCli != null){
      redisCli.disconnect();
    }
    if(mongoCli != null){
      mongoCli.close();
    }
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
