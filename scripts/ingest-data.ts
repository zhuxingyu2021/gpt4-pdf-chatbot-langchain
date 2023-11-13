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
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { Document } from 'langchain/document';

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID??''
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY??''
const AWS_REGION = process.env.AWS_REGION??''
const AWS_BUCKET = process.env.AWS_BUCKET??''

const s3Client = new S3Client({
   region: AWS_REGION ,
   credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

async function listPdfFiles(bucketName: string): Promise<string[]> {
  const params = {
    Bucket: bucketName,
  };

  let isTruncated = true;
  let continuationToken: string | undefined;
  let pdfFiles: string[] = [];

  while (isTruncated) {
    const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(
      new ListObjectsV2Command({ ...params, ContinuationToken: continuationToken })
    );

    // Filter and collect the PDF files
    const pdfKeys = Contents?.filter((item) => item.Key?.endsWith('.pdf')).map((item) => item.Key!) || [];
    pdfFiles = pdfFiles.concat(pdfKeys);

    isTruncated = IsTruncated || false;
    continuationToken = NextContinuationToken;
  }

  return pdfFiles;
}

async function downloadPdfFile(bucketName: string, key: string): Promise<Blob> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const { Body } = await s3Client.send(command);

  if (Body instanceof Readable) {
    // Convert the Node stream to a Blob
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      Body.on("data", (chunk) => chunks.push(chunk));
      Body.on("end", () => {
        const blob = new Blob(chunks, { type: 'application/pdf' });
        resolve(blob);
      });
      Body.on("error", reject);
    });
  } else {
    // Handle non-stream body types here, if necessary
    throw new Error("Expected a stream for the S3 object body.");
  }
}

export const run = async () => {
  try {
    const s3Keys = await listPdfFiles(AWS_BUCKET);
    const s3Objs = await Promise.all(s3Keys.map(key => downloadPdfFile(AWS_BUCKET, key)));
    const rawDocsPerKey = await Promise.all(s3Objs.map(obj => new PDFLoader(obj).load()));
    
    let rawDocs: Document<Record<string, any>>[] = []
    for (let index = 0; index < s3Keys.length; index++) {
      const key = s3Keys[index];
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
