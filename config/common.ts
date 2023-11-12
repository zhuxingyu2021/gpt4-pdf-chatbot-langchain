if ((!process.env.USE_DATABASE) || ((process.env.USE_DATABASE != "pinecone"
    && process.env.USE_DATABASE != "mongo" 
    && process.env.USE_DATABASE != "redis"))) {
    throw new Error('Invalid database type in .env file (mongo, pinecone, redis)');
  }

export const DATABASE_TYPE = process.env.USE_DATABASE ?? '';
