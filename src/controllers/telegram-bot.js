require("dotenv").config();
const { Telegraf } = require("telegraf");

// Define bot
let bot;
let messageCurrent = "";
let messageId = null;
let timeCheckSendMessage = 0;
let messageUpdated = false;

function init() {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  bot.start((ctx) => ctx.reply("Hello, I'm sequential ci bot~"));

  bot.on("message", async (ctx) => {
    // Check not response if using from other group
    if (
      String(ctx?.update?.message?.chat?.id) !== process.env.TELEGRAM_GROUP_ID
    ) {
      return;
    }

    const msg = ctx?.update?.message?.text;
    await ctx.replyWithHTML(msg);
    
    console.log(ctx);
  });

  bot.launch();

  return bot;
}

async function sendMessageToDefaultGroup(message) {
  messageCurrent = message;
  try {
    const context = await bot.telegram.sendMessage(
      process.env.TELEGRAM_GROUP_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
    messageId = context.message_id;
    return context;
  } catch (error) {
    console.log("Send message error: ", error);
  }
}

async function editMessageInDefaultGroup(message, context) {
  try {
    return await bot.telegram.editMessageText(
      process.env.TELEGRAM_GROUP_ID,
      context.message_id,
      null,
      message,
      { parse_mode: "HTML" }
    );
  } catch (error) {}
}

async function appendMessageAndSend(message) {
  messageCurrent += message;
  try {
    messageUpdated = false;
    const t = await bot.telegram.editMessageText(
      process.env.TELEGRAM_GROUP_ID,
      messageId,
      null,
      messageCurrent,
      {
        parse_mode: "HTML",
      }
    );

    return t;
  } catch (error) {
    console.log("append message error: ", error);
  }
}

async function appendMessage(message) {
  messageCurrent += message;
  messageUpdated = true;
}

async function sendMessageCurrent(checkTime) {
  // Check if not has message need update -> not process
  if (!messageUpdated) {
    return;
  }

  // Check time to prevent send multiple request in times
  if (checkTime) {
    const now = new Date().getTime();
    if (now - timeCheckSendMessage < 2000) {
      return;
    }
    timeCheckSendMessage = now;
  }
  try {
    const t = await bot.telegram.editMessageText(
      process.env.TELEGRAM_GROUP_ID,
      messageId,
      null,
      messageCurrent,
      {
        parse_mode: "HTML",
      }
    );

    messageUpdated = false;
    return t;
  } catch (error) {
    console.log("send message current error: ", error);
  }
}

module.exports = {
  init,
  sendMessageToDefaultGroup,
  editMessageInDefaultGroup,
  appendMessageAndSend,
  appendMessage,
  sendMessageCurrent,
};
