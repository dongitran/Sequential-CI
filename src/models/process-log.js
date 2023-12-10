const { Schema, model } = require("mongoose");

const ProcessLog = new Schema({
  createdAt: Date,
  content: Schema.Types.Mixed,
});

const ProcessLogModel = model("sequential_ci_process_logs", ProcessLog);

module.exports = { ProcessLog, ProcessLogModel };
