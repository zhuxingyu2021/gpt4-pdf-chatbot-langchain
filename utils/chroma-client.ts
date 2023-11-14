import { ChromaClient } from "chromadb";
import { DATABASE_TYPE } from "@/config/common";

async function initChroma() {
    if(DATABASE_TYPE != "chroma") return null;

    const url = process.env.CHROMA_URL??'http://localhost:8000';
    const client = new ChromaClient({
        path: url
    });
    return client;
}

export const chromaCli = await initChroma();