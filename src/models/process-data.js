const { Schema, model } = require("mongoose");

const ProcessData = new Schema({
  createdAt: Date,
  updatedAt: Date,
  status: String,
  name: String,
  process: Schema.Types.Mixed,
});

const ProcessDataModel = model("sequential_ci_process_datas", ProcessData);

module.exports = { ProcessData, ProcessDataModel };
