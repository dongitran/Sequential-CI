const { Schema } = require("mongoose");

const ProcessData = new Schema({
  createdAt: Date,
  updatedAt: Date,
  status: String,
  name: String,
  chatId: String,
  process: Schema.Types.Mixed,
});

const ProcessDataModel = (connection) => {
  return connection.model("sequential_ci_process_datas", ProcessData);
};

module.exports = { ProcessData, ProcessDataModel };
