import { MongoClient } from "mongodb";
import { DATABASE_TYPE } from "@/config/common";

async function initMongo() {
    if(DATABASE_TYPE != "mongo") return null;

    const url = process.env.MONGO_URL??'mongodb://localhost:27017';
    const client = new MongoClient(url);
    return client;
}

export const mongoCli = await initMongo();