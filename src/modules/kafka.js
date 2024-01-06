/**
 * Class KafkaMessenger to send messages to Kafka
 */
const { Kafka } = require("kafkajs");

class KafkaMessenger {
  /**
   * Constructor of the class
   * @param {string} brokers - List of brokers, separated by commas
   */
  constructor(brokers) {
    this.kafka = new Kafka({
      clientId: new Date().getTime().toString(),
      brokers: brokers.split(","),
    });
    this.producer = this.kafka.producer();
  }

  /**
   * Send message to Kafka
   * @param {string} topic - Kafka topic
   * @param {string | number} key - Message key
   * @param {string} value - Message content
   */
  async sendMessage(topic, key, value) {
    try {
      await this.producer.connect();

      const message = {
        key: key.toString(),
        value: value.toString(),
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      await this.producer.disconnect();
    } catch (error) {
      console.error("Error sending to Kafka:", error);
    }
  }
}

module.exports = KafkaMessenger;
