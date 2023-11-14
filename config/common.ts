if ((!process.env.USE_DATABASE) || ((process.env.USE_DATABASE != "pinecone"
    && process.env.USE_DATABASE != "mongo" 
    && process.env.USE_DATABASE != "redis"
    && process.env.USE_DATABASE != "chroma"))) {
    throw new Error('Invalid database type in .env file (mongo, pinecone, redis, chroma)');
  }

export const DATABASE_TYPE = process.env.USE_DATABASE ?? '';
