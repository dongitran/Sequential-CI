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
   * @param {string} value - Message content
   */
  async sendMessage(topic, value) {
    try {
      await this.producer.connect();

      const message = {
        key: new Date().getTime().toString(),
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
