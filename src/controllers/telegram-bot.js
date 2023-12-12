require("dotenv").config();
const { Telegraf } = require("telegraf");

// Define bot
let bot;

function init() {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  bot.start((ctx) => ctx.reply("Hello, I'm sequential ci bot~"));
  bot.launch();
}

async function sendMessageToDefaultGroup(message) {
  try {
    return await bot.telegram.sendMessage(
      process.env.TELEGRAM_GROUP_ID,
      message,
      {
        parse_mode: "HTML",
      }
    );
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

async function appendMessageInDefaultGroup(message, context) {
  try {
    return await bot.telegram.editMessageText(
      process.env.TELEGRAM_GROUP_ID,
      context.message_id,
      null,
      context.text + '\n' + message,
      { parse_mode: "HTML" }
    );
  } catch (error) {}
}

module.exports = {
  init,
  sendMessageToDefaultGroup,
  editMessageInDefaultGroup,
  appendMessageInDefaultGroup,
};
