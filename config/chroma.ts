import {DATABASE_TYPE} from "@/config/common"

if ((DATABASE_TYPE == "chroma") && ((!process.env.CHROMA_COLLECTION))) {
  throw new Error('Missing chroma collection name in .env file');
}

const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION ?? '';

export { CHROMA_COLLECTION };