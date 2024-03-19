const { ProcessGroupModel } = require("../models/process-group");
const TelegramManager = require("../modules/telegram-manager");
const telegramBot = require("../modules/telegram-bot");

exports.listGroup = async (chatId, connection, messageThreadId) => {
  let telegramManager = undefined;
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    telegramManager = new TelegramManager(bot, chatId, messageThreadId);

    const processGroupModel = ProcessGroupModel(connection);
    const groups = await processGroupModel
      .find(
        {
          chatId,
          messageThreadId,
          $or: [
            { deletedAt: { $eq: null } },
            { deletedAt: { $exists: false } },
          ],
        },
        "name"
      )
      .lean();

    console.log(groups, "groups");
    let msgResponse = `You haven't created any group yet`;
    if (groups.length > 0) {
      const emoji = "⚙️";
      msgResponse = "<b>Group:</b>\n";
      groups.forEach((item) => {
        msgResponse += `${emoji} ${item.name} - <code>${item._id}</code>\n`;
      });
    }

    await telegramManager.sendMessageAndUpdateMessageId(msgResponse);
  } catch (error) {
    console.log(error, "List group error");
    if (telegramManager) {
      await telegramManager.sendMessageAndUpdateMessageId(
        "❗️ Create group failed: " + error?.message || error
      );
    }
  }
};

exports.createGroup = async (chatId, name, connection, messageThreadId) => {
  let telegramManager = undefined;
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    telegramManager = new TelegramManager(bot, chatId, messageThreadId);

    const processGroupModel = ProcessGroupModel(connection);
    const result = await processGroupModel.create({
      createdAt: new Date(),
      status: "active",
      name,
      chatId,
      messageThreadId,
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
