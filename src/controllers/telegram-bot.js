const { Telegraf } = require("telegraf");

function init() {
  const bot = new Telegraf(process.env.BOT_TOKEN);
  bot.start((ctx) => ctx.reply("Hello, I'm sequential ci bot~"));
  bot.launch();
}

function sendMessageToDefaultGroup(message) {
  try {
    bot.telegram.sendMessage(process.env.TELEGRAM_GROUP_ID, message, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.log("Send message error: ", error);
  }
}

module.exports = { init, sendMessageToDefaultGroup };
