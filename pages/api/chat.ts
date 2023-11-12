import type { NextApiRequest, NextApiResponse } from 'next';
import { DATABASE_TYPE } from '@/config/common';
import { runPipeconeChain, runMongoChain, runRedisChain } from '@/utils/runchain';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history } = req.body;

  console.log('question', question);
  console.log('history', history);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  try {
    switch (DATABASE_TYPE){
      case "pinecone":{
        const response = await runPipeconeChain(sanitizedQuestion, history);
        console.log('response', response);
        res.status(200).json(response);
        break;
      }
      case "redis":{
        const response = await runRedisChain(sanitizedQuestion, history);
        console.log('response', response);
        res.status(200).json(response);
        break;
      }
      case "mongo":{
        const response = await runMongoChain(sanitizedQuestion, history);
        console.log('response', response);
        res.status(200).json(response);
        break;
      }
    }

  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
