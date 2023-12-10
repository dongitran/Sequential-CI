const { Schema, model } = require("mongoose");

const ProcessData = new Schema({
  createdAt: Date,
  updatedAt: Date,
  name: String,
  content: Schema.Types.Mixed,
});

const ProcessDataModel = model("sequential_ci_process_datas", ProcessData);

module.exports = { ProcessData, ProcessDataModel };
