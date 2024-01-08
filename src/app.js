require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const {
  cronJobProcess,
  runProcessWithName,
  cloneProcess,
  deleteProcess,
} = require("./controllers/process");
const telegramBot = require("./controllers/telegram-bot");
const app = express();
const cron = require("node-cron");
const { ProcessDataModel } = require("./models/process-data");
const { ProcessLogModel } = require("./models/process-log");
const TelegramManager = require("./controllers/telegram-manager");
const { getDataByKey } = require("./utils/common");
const { MessageResponse } = require("./constants/message-response");
const {
  createGroup,
  linkProcessToGroup,
} = require("./controllers/process-group");
const { Telegraf, Markup } = require("telegraf");

async function startApp() {
  const connection = await connectToMongo(process.env.MONGO_URI);

  const processLogModel = ProcessLogModel(connection);
  const data = await processLogModel.create({ createdAt: new Date() });
  console.log(data._id.toString(), "4adfkj");

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(express.static("public"));
  //app.use(express.static(path.join(__dirname, 'public')));
  app.get("/detail/:id", (req, res) => {
    const detailId = req.params.id;
    // Render your HTML file with the detailId
    res.sendFile(path.join(__dirname, "public", "detail.html"));
  });
  app.get("/api/detail/:id", async (req, res) => {
    const detailId = req.params.id;

    const processLogModel = ProcessLogModel(connection);
    const data = await processLogModel.find({ _id: detailId });

    res.json(data);
  });

  app.get("/api/data", async (req, res) => {
    try {
      res.json({});
    } catch (error) {
      res.status(404).json({ error: "Không thể lấy dữ liệu từ API" });
    }
  });

  app.use(bodyParser.json());

  app.use("/api/process", processDataRoutes);

  // Init telegram bot
  const bot = await telegramBot.init();

  bot.on("message", async (ctx) => {
    console.log(ctx?.update?.message?.chat?.id, "ctxctx");
    console.log(ctx?.update?.message?.reply_to_message, "ctxctx");
    const ProcessDataModelWithConnection = ProcessDataModel(connection);
    // Check command run process
    const chatId = ctx?.update?.message?.chat?.id;
    const msg = ctx?.update?.message?.text?.trim();
    if (msg?.trim() === "/runall") {
      cronJobProcess(connection);
    } else if (msg?.substring(0, 5) == "/run:") {
      runProcessWithName(msg?.substring(5).trim(), connection, chatId);
    } else if (msg?.substring(0, 5) === "/list") {
      const allProcessData = await ProcessDataModelWithConnection.find({
        chatId,
        $or: [{ deletedAt: { $eq: null } }, { deletedAt: { $exists: false } }],
      });
      const emoji = "⚙️";
      const replyMessage = allProcessData
        .map(
          (item) =>
            `${emoji} <b>${
              item.name
            }</b> \n Id: <code>${item._id.toString()}</code>`
        )
        .join("\n");
      await ctx.replyWithHTML(replyMessage || MessageResponse.TRY_IT);
    } else if (msg?.substring(0, 5) === "/help") {
      const emojiList = "📊";
      const emojiRun = "🚀";
      const emojiHelp = "👽";
      const replyMessage = `<b>List of available commands:</b>\n\n`;
      const listCommand = `${emojiList} <b>/list:</b> Display all available processes\n`;
      const runCommand = `${emojiRun} <b>/run:{process}</b> Run a specific process\n`;
      const helpCommand = `${emojiHelp} <b>/help:</b> Show available commands and their usage\n`;

      await ctx.replyWithHTML(
        replyMessage + listCommand + runCommand + helpCommand
      );
    } else if (msg?.substring(0, 7) === "/clone:") {
      const command = msg?.substring(7)?.trim();
      const id = command?.split(" ")[0];
      const newName = getDataByKey(command, "name");
      await cloneProcess(id, connection, chatId, newName);
    } else if (msg?.substring(0, 8) === "/delete:") {
      const command = msg?.substring(8)?.trim();
      const id = command?.split(" ")[0];
      await deleteProcess(id, connection, chatId);
    } else if (msg?.substring(0, 13) === "/groupcreate:") {
      const groupName = msg?.substring(13);
      await createGroup(chatId, groupName, connection);
    } else if (msg?.substring(0, 10) === "/grouplink") {
      //const ids = msg?.substring(11).split("-");
      //const groupId = ids[0];
      //const processId = ids[1];
      //await linkProcessToGroup(chatId, connection, groupId, processId);

      const replyKeyboard = Markup.keyboard([
        ["Option 1"],
        ["Option 3"],
        ["Option 1"],
        ["Option 3"],
        ["Option 1"],
        ["Option 3"],
        ["Option 1"],
        ["Option 3"],
        ["Option 1"],
        ["Option 3"],
      ]);

      // Lấy bàn phím được thiết lập
      const keyboard = replyKeyboard.reply_markup;

      // Gửi tin nhắn với bàn phím reply
      return ctx.reply("Chọn một tùy chọn:", { reply_markup: keyboard });
    }
  });

  //  await test();
  cron.schedule("*/15 * * * *", async () => {
    // await cronJobProcess(connection);
  });
}

module.exports = { startApp };
