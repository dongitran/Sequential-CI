const { ProcessGroupModel } = require("../models/process-group");
const TelegramManager = require("./telegram-manager");
const telegramBot = require("./telegram-bot");
const { Types } = require("mongoose");

exports.createGroup = async (chatId, name, connection) => {
  let telegramManager = undefined;
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    telegramManager = new TelegramManager(bot, chatId);

    const processGroupModel = ProcessGroupModel(connection);
    const result = await processGroupModel.create({
      createdAt: new Date(),
      status: "active",
      name,
      chatId,
    });

    await telegramManager.sendMessageAndUpdateMessageId(
      `🔭 <b>Create group sucessful: ${name}</b>\nId: <code>${result._id}</code>\n`
    );
  } catch (error) {
    console.log(error, "errorerror");
    if (telegramManager) {
      await telegramManager.sendMessageAndUpdateMessageId(
        "❗️ Create group failed: " + error?.message || error
      );
    }
  }
};
