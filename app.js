// const path = require('path');
import { ApolloServer } from '@apollo/server';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import { expressMiddleware as apolloExpress } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './graphql/resolvers.js';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { Auth } from './middleware/auth.js';
dotenv.config();
const app = express();
function getHttpContext({ req }) {
  if (req.auth) {
    return { userId: req.auth.sub };
  }
  return {};
}

app.use(cors());
app.use(bodyParser.json()); // application/json

app.use(Auth);

const typeDefs = await readFile('./graphql/schema.graphql', 'utf-8');

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer({ schema });
await apolloServer.start();
app.use('/graphql', apolloExpress(apolloServer, { context: getHttpContext }));
const DBURL = process.env.DB_URL;

mongoose
  .connect(DBURL)
  .then((result) => {
    console.log('Connected to DB!');
    app.listen(8080);
  })
  .catch((err) => console.log(err));
