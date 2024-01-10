const { Schema, Types } = require("mongoose");

const ProcessLog = new Schema({
  createdAt: Date,
  processId: {
    type: Types.ObjectId,
    ref: "sequential_ci_process_datas",
  },
  processName: String,
  status: String,
  process: Schema.Types.Mixed,
  content: Schema.Types.Mixed,
  inputProcess: Schema.Types.Mixed,
});

const ProcessLogModel = (connection) => {
  return connection.model("sequential_ci_process_logs", ProcessLog);
};

module.exports = { ProcessLog, ProcessLogModel };
