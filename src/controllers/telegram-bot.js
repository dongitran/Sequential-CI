require("dotenv").config();
const { Telegraf } = require("telegraf");

// Define bot
let bot;
let messageCurrent = "";
let messageId = null;

function init() {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  bot.start((ctx) => ctx.reply("Hello, I'm sequential ci bot~"));
  return bot.launch();
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
}

async function sendMessageCurrent() {
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
