// const path = require('path');
import { ApolloServer } from "@apollo/server";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { readFile } from "fs/promises";
import { expressMiddleware as apolloExpress } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./graphql/resolvers.js";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Auth } from "./middleware/auth.js";
dotenv.config();
const app = express();
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(bodyParser.json()); // application/json
function getHttpContext({ req, res, next }) {
  const authHeader = req.get("authorization");
  if (!authHeader) {
    return { isAuth: false };
  }
  const token = authHeader.split(" ")[1];

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return { isAuth: false };
  }
  if (!decodedToken) {
    req.isAuth = false;
    return { isAuth: false };
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  return { userId: decodedToken.userId, isAuth: true };
}

const typeDefs = await readFile("./graphql/schema.graphql", "utf-8");

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer({ schema });
await apolloServer.start();
app.use("/graphql", apolloExpress(apolloServer, { context: getHttpContext }));
const DBURL = process.env.DB_URL;

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  console.log(message);
  res.status(status).json({ message: message, data: data });
});
mongoose
  .connect(DBURL)
  .then(result => {
    console.log("Connected to DB!");
    app.listen(8080);
  })
  .catch(err => console.log(err));
