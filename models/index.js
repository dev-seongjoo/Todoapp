require('dotenv').config();
const { MONGO_URI } = process.env;
const { MongoClient } = require("mongodb");
const client = new MongoClient(MONGO_URI);
client.connect(console.log('connecting on MongoDB'));
const db = client.db('todoapp');

module.exports = db;