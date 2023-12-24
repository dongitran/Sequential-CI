const { Types } = require("mongoose");
const { Schema } = require("mongoose");

const ProcessData = new Schema({
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date || undefined || null,
  status: String,
  name: String,
  chatId: String,
  cloneFrom: {
    type: Types.ObjectId,
    ref: "sequential_ci_process_datas",
  },
  process: Schema.Types.Mixed,
});

const ProcessDataModel = (connection) => {
  return connection.model("sequential_ci_process_datas", ProcessData);
};

module.exports = { ProcessData, ProcessDataModel };
