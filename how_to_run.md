1. First run `npm install yarn -g` to install yarn globally (if you haven't already).
2. run `yarn install`
3. run `cp scripts/azure.js node_modules/langchain/dist/util/azure.js`
4. Set up your `.env` file

- Copy `.env.example` into `.env`
- Edit `.env` file

5. 
For redis:

run `docker run --name my-redis -p 6379:6379 -d redislabs/redisearch` if use redis for backend storage.

For mongodb:

a. create mongodb atlas account https://cloud.mongodb.com/

b. config your mongodb cluster

c. edit `.env` file and change `MONGO_URL` to the url provided by mongodb atlas

6. run `mkdir docs`, and copy `.pdf` file to directory `docs`

7. run `npm run ingest` to generate embedding vectors which will be stored into the backend database.

8. (For mongodb, you must create index) Go to the Search tab within your cluster, then select Create Search Index. Using the JSON editor option, add an index to the collection you wish to use.
```json
{
  "mappings": {
    "fields": {embeddings
      "embedding": [
        {
          "dimensions": 1536,
          "similarity": "euclidean",
          "type": "knnVector"
        }
      ]
    }
  }
}
```

9. run `npm run dev`

10. Launch your preferred web browser and navigate to http://localhost:3000 to access the local development environment.
