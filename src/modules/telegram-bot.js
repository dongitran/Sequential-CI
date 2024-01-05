require("dotenv").config();
const { Telegraf } = require("telegraf");

// Define bot
let bot;

function init() {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  bot.start((ctx) => ctx.reply("Hello, I'm sequential ci bot~"));

  bot.launch();

  return bot;
}

function getBot() {
  return bot;
}

module.exports = {
  init,
  getBot,
};
