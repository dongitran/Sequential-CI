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
} = require("./modules/process");
const telegramBot = require("./modules/telegram-bot");
const app = express();
const cron = require("node-cron");
const { ProcessDataModel } = require("./models/process-data");
const { ProcessLogModel } = require("./models/process-log");
const { getDataByKey } = require("./utils/common");
const { MessageResponse } = require("./constants/message-response");
const { createGroup } = require("./controllers/process-group");
const { Markup } = require("telegraf");
const { ProcessGroupModel } = require("./models/process-group");
const {
  ProcessGroupConfigStepModel,
} = require("./models/process-group-config-step");
const { linkProcessToGroup } = require("./controllers/process-data");
const { isEmpty } = require("lodash");
const {
  getProcessDataWithGroup,
} = require("./functions/get-process-data-with-group");

async function startApp() {
  const connection = await connectToMongo(process.env.MONGO_URI);

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(express.static("public"));
  app.use(express.static(path.join(__dirname, "public")));
  app.get("/detail/:id", (req, res) => {
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
    console.log(JSON.stringify(ctx), "ctxctx");
    try {
      // Check command run process
      const chatId = ctx?.update?.message?.chat?.id;
      const msg = ctx?.update?.message?.text?.trim();

      const replyToMessage = ctx?.update?.message?.reply_to_message;

      if (replyToMessage) {
        const messageIdReply = replyToMessage?.message_id;
        const processGroupConfigStepModel =
          ProcessGroupConfigStepModel(connection);
        // Get config step
        const processGroupConfigStep = await processGroupConfigStepModel.find({
          messageId: messageIdReply,
        });
        const step = processGroupConfigStep[0]?.step;
        if (step === "waiting-select-group") {
          // Get group id from group name
          const processGroupModel = ProcessGroupModel(connection);
          const processGroup = await processGroupModel.find({
            name: ctx?.update?.message?.text?.trim(),
          });
          const groupId = processGroup[0]._id;

          // Get list process for user select
          const processDataModel = ProcessDataModel(connection);
          const processDatas = await processDataModel.find({
            chatId,
            $or: [{ groupId: { $exists: false } }, { groupId: null }],
          });
          console.log(processDatas, "processDatas");
          const replyKeyboard = Markup.keyboard([
            ...processDatas.map((item) => {
              return [item?.name];
            }),
          ]);
          const keyboard = replyKeyboard.reply_markup;
          const result = await ctx.reply("Select process:", {
            reply_markup: keyboard,
          });

          // Update process group config steps
          await processGroupConfigStepModel.findOneAndUpdate(
            {
              messageId: messageIdReply,
            },
            {
              messageId: result?.message_id,
              groupId,
              step: "waiting-select-process",
            }
          );
          return;
        } else if (step === "waiting-select-process") {
          const processDataModel = ProcessDataModel(connection);
          const processDatas = await processDataModel.find({
            name: ctx?.update?.message?.text,
          });
          const processDataId = processDatas[0]._id;

          const processGroupConfigStepModel =
            ProcessGroupConfigStepModel(connection);
          // Update process group config steps
          const result = await processGroupConfigStepModel.findOneAndUpdate(
            {
              messageId: messageIdReply,
            },
            {
              processDataId,
              step: "waiting-link",
            }
          );
          console.log(result, "resultresult");

          await linkProcessToGroup(
            chatId,
            connection,
            processDataId,
            result?.groupId?.toString()
          );

          ctx.reply("🛩 Link process to group successful!", {
            reply_markup: { remove_keyboard: true },
          });
          return;
        }
      }

      if (msg?.trim() === "/runall") {
        cronJobProcess(connection, chatId);
      } else if (msg?.substring(0, 5) == "/run:") {
        runProcessWithName(msg?.substring(5).trim(), connection, chatId);
      } else if (msg?.substring(0, 5) === "/list") {
        const result = await getProcessDataWithGroup(chatId, connection);
        const emoji = "⚙️";
        const listResponse = [];
        if (result?.group && !isEmpty(result?.group)) {
          result.group.forEach((item) => {
            listResponse.push(`⭐️ ${item.name}:`);
            if (!isEmpty(item?.processList)) {
              item.processList.forEach((item) => {
                listResponse.push(
                  `     ${emoji} <code><b>${item.name}</b></code>`
                );
              });
            }
          });
        }
        if (result?.notAssignGroup && !isEmpty(result?.notAssignGroup)) {
          listResponse.push(`\n👽 Not assigned group::`);
          result.notAssignGroup.forEach((item) => {
            listResponse.push(`     ${emoji} <code><b>${item.name}</b></code>`);
          });
        }
        await ctx.replyWithHTML(
          listResponse.join("\n") || MessageResponse.TRY_IT
        );
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
        const groupName = msg?.substring(13)?.trim();
        await createGroup(chatId, groupName, connection);
      } else if (msg?.substring(0, 10) === "/grouplink") {
        // TODO: check not process assign to group
        const processGroupModel = ProcessGroupModel(connection);
        const processGroups = await processGroupModel.find({ chatId });

        const replyKeyboard = Markup.keyboard([
          ...processGroups.map((item) => {
            return [item?.name];
          }),
        ]);
        const keyboard = replyKeyboard.reply_markup;
        const result = await ctx.reply("Select group:", {
          reply_markup: keyboard,
        });

        const processGroupConfigStepModel =
          ProcessGroupConfigStepModel(connection);
        await processGroupConfigStepModel.create({
          createdAt: new Date(),
          messageId: result?.message_id,
          step: "waiting-select-group",
        });
      } else if (msg?.substring(0, 7) === "/cancel") {
        ctx.reply("🛩 Ok!", {
          reply_markup: { remove_keyboard: true },
        });
      }
    } catch (error) {
      console.log(error, "error when process message received");
    }
  });

  //  await test();
  cron.schedule("*/15 * * * *", async () => {
    // await cronJobProcess(connection, process.env.TELEGRAM_GROUP_ID);
  });
}

module.exports = { startApp };
