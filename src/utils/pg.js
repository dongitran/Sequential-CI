const { Client } = require("pg");

const client = new Client({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PWD,
  port: process.env.POSTGRES_PORT,
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
