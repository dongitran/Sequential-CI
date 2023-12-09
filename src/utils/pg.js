const { Client } = require("pg");

const client = new Client({
  host: "0.0.0.0",
  database: "sequentialci",
  user: "sequentialci",
  password: "sequentialci",
  port: 5432,
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL!");
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
  }
}

async function disconnectDB() {
  try {
    await client.end();
    console.log("Disconnected from PostgreSQL!");
  } catch (error) {
    console.error("Error disconnecting from PostgreSQL:", error);
  }
}

module.exports = {
  client,
  connectDB,
  disconnectDB,
};
