require("dotenv").config();
const mongoose = require("mongoose");
let connection = {};

const connectToMongo = async (mongoURI) => {
  try {
    if (connection[mongoURI]) return connection[mongoURI];

    connection[mongoURI] = await mongoose.createConnection(mongoURI);
    console.log(`Connected to MongoDB at ${mongoURI}`);
    return connection[mongoURI];
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = connectToMongo;
