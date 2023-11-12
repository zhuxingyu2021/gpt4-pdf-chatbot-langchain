import { createClient } from 'redis';
import { DATABASE_TYPE } from '@/config/common';

async function initRedis() {
  if(DATABASE_TYPE != "redis") return null;
  const redisClient = createClient();
  // Connect to the Redis server
  await redisClient.connect();

  // Send a PING command to the Redis server
  const pong = await redisClient.ping();
  
  // If the server responds with PONG, the service is available
  if (pong === 'PONG') {
    console.log('Redis service is available.');
  } else {
    console.log('Redis service is available but responded with:', pong);
  }

  return redisClient
}

export const redisCli = await initRedis();
