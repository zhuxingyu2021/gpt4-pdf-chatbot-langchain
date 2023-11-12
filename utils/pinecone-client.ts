import { PineconeClient } from '@pinecone-database/pinecone';
import { DATABASE_TYPE } from '@/config/common';

if ((DATABASE_TYPE == "pinecone") && (!process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_API_KEY)) {
  throw new Error('Pinecone environment or api key vars missing');
}

async function initPinecone() {
  if(DATABASE_TYPE != "pinecone") return null;

  try {
    const pinecone = new PineconeClient();

    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT ?? '', //this is in the dashboard
      apiKey: process.env.PINECONE_API_KEY ?? '',
    });

    return pinecone;
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to initialize Pinecone Client');
  }
}

export const pinecone = await initPinecone();
