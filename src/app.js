const express = require("express");
const bodyParser = require("body-parser");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const { cronJobProcess, runProcessWithName } = require("./controllers/cronjob");
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
  const bot = await telegramBot.init();
  bot.on("message", async (ctx) => {
    // Check not response if using from other group
    if (
      String(ctx?.update?.message?.chat?.id) !== process.env.TELEGRAM_GROUP_ID
    ) {
      return;
    }

    // Check command run process
    const msg = ctx?.update?.message?.text;
    console.log(msg.substring(0, 2), "49akdjf");
    if (msg.substring(0, 2) == "--") {
      await runProcessWithName(msg.substring(2));
    }

    console.log(ctx);
  });

  //  await test();
  cron.schedule("* * * * *", async () => {
    //await cronJobProcess();
  });
}

module.exports = { startApp };
