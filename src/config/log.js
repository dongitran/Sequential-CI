require("dotenv").config();
const mongoose = require("mongoose");

const connectToLogMongo = async () => {
  try {
    await mongoose.connect(process.env.LOG_MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to Log MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

module.exports = connectToLogMongo;
