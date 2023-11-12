import {DATABASE_TYPE} from "@/config/common"

if ((DATABASE_TYPE == "redis") && (!process.env.REDIS_INDEX_NAME)) {
    throw new Error('Missing redis index name in .env file');
  }

export const REDIS_INDEX_NAME = process.env.REDIS_INDEX_NAME ?? '';