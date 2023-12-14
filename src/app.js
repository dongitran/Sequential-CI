const express = require("express");
const bodyParser = require("body-parser");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const { cronJobProcess } = require("./controllers/cronjob");
const telegramBot = require("./controllers/telegram-bot");
const app = express();
const cron = require("node-cron");

async function startApp() {
  await connectToMongo();

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(bodyParser.json());

  app.use("/api/process", processDataRoutes);

  // Init telegram bot
  telegramBot.init();

  //  await test();
  cron.schedule("* * * * *", async () => {
    //await cronJobProcess();
  });
  //  await cronJobProcess();
}

module.exports = { startApp };
