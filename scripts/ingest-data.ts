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
import { mongoCli } from '@/utils/mongo-client';
import { pdfS3Service } from '@/utils/pdfStorage/pdfS3';
import { pdfOSSService } from '@/utils/pdfStorage/pdfOSS';
import { Document } from 'langchain/document';

const PDF_STORAGE = process.env.USE_PDF_STORAGE??''

if(PDF_STORAGE != 'oss' && PDF_STORAGE != 's3'){
  throw "Invalid pdf storage type, s3 or oss";
}

export const run = async () => {
  try {
    let pdfKeys:string[] = [];
    let pdfObjs:Blob[] = [];

    if (typeof PDF_STORAGE === 'undefined') {
      throw new Error("PDF_STORAGE environment variable is undefined");
    }

    if(PDF_STORAGE == 'oss'){
      const bucketName = process.env.OSS_BUCKET;
      if(bucketName === undefined){
        throw "Bucketname undefined";
      }
      const pdfStore = new pdfOSSService(bucketName);
      pdfKeys = await pdfStore.listPdfFiles();
      pdfObjs = await Promise.all(pdfKeys.map(key => pdfStore.downloadPdfFile(key)));
    }else if(PDF_STORAGE == 's3'){
      const bucketName = process.env.AWS_BUCKET;
      if(bucketName === undefined){
        throw "Bucketname undefined";
      }
      const pdfStore = new pdfS3Service(bucketName);
      pdfKeys = await pdfStore.listPdfFiles();
      pdfObjs = await Promise.all(pdfKeys.map(key => pdfStore.downloadPdfFile(key)));
    }

    const rawDocsPerKey = await Promise.all(pdfObjs.map(obj => new PDFLoader(obj).load()));
    
    let rawDocs: Document<Record<string, any>>[] = []
    for (let index = 0; index < pdfKeys.length; index++) {
      const key = pdfKeys[index];
      const doc = rawDocsPerKey[index].map(doc => {
          let metadata2 = doc.metadata;
          metadata2["source"] = key;
          return new Document({
            pageContent: doc.pageContent,
            metadata: metadata2
          })
      });
      rawDocs.push(... doc)
    }

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
