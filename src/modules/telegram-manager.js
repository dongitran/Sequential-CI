const { delayWithAsync } = require("../utils/common");

require("dotenv").config();

class TelegramManager {
  constructor(bot, chatId, messageThreadId) {
    this.bot = bot;
    this.chatId = chatId;

    this.messageId = null;
    this.messageThreadId = messageThreadId;
    this.messageCurrent = "";
    this.messageUpdated = false;
    this.timeCheckSendMessage = new Date().getTime();
  }

  async sendMessageAndUpdateMessageId(message) {
    this.messageCurrent = message;

    // TODO: check preview message already was send

    let success = false,
      retryCount = 10;
    do {
      try {
        const context = await this.bot.telegram.sendMessage(
          this.chatId,
          message,
          {
            parse_mode: "HTML",
            message_thread_id: this.messageThreadId,
          }
        );
        this.messageId = context.message_id;
        this.messageUpdated = false;

        success = true;
        return context.message_id;
      } catch (error) {
        console.log(`Send message to group ${this.chatId} error: `, error);
        await delayWithAsync(2000);
        retryCount--;
      }
    } while (!success && retryCount > 0);
  }

  async appendMessageAndEditMessage(message) {
    this.messageCurrent += message;
    try {
      this.messageUpdated = false;
      const t = await this.bot.telegram.editMessageText(
        this.chatId,
        this.messageId,
        null,
        this.messageCurrent,
        {
          parse_mode: "HTML",
        }
      );

      return t;
    } catch (error) {
      console.log("append message error: ", error);
    }
  }

  async appendMessage(message) {
    this.messageCurrent += message;
    this.messageUpdated = true;
  }

  async sendMessageCurrent(checkTime) {
    // Check if not has message need update -> not process
    if (!this.messageUpdated) {
      return;
    }

    // Check time to prevent send multiple request in times
    if (checkTime) {
      const now = new Date().getTime();
      if (now - this.timeCheckSendMessage < 2000) {
        return;
      }
      this.timeCheckSendMessage = now;
    }
    this.messageUpdated = false;

    try {
      const t = await this.bot.telegram.editMessageText(
        this.chatId,
        this.messageId,
        null,
        this.messageCurrent,
        {
          parse_mode: "HTML",
        }
      );

      return t;
    } catch (error) {
      console.log("send message current error: ", error);
    }
  }

  clearMessageId() {
    this.messageId = null;
  }
}

module.exports = TelegramManager;
