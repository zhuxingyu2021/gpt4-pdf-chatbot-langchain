import {DATABASE_TYPE} from "@/config/common"

if ((DATABASE_TYPE == "mongo") && ((!process.env.MONGO_DBNAME) || (!process.env.MONGO_COLLECTION_NAME))) {
  throw new Error('Missing mongo database/collection name in .env file');
}

const MONGO_DBNAME = process.env.MONGO_DBNAME ?? '';
const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME ?? '';
const MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME = process.env.MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME ?? 'default';

export { MONGO_DBNAME, MONGO_COLLECTION_NAME, MONGO_ATLAS_VECTOR_SEARCH_INDEX_NAME };
