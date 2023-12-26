const { Types, Schema } = require("mongoose");

const ProcessGroupConfigStep = new Schema({
  createdAt: Date,
  updatedAt: Date,
  messageId: Number,
  groupId: {
    type: Types.ObjectId,
    ref: "sequential_ci_process_groups",
  },
  processDataId: {
    type: Types.ObjectId,
    ref: "sequential_ci_process_datas",
  },
  step: String,
});

const ProcessGroupConfigStepModel = (connection) => {
  return connection.model(
    "sequential_ci_process_group_config_steps",
    ProcessGroupConfigStep
  );
};

module.exports = { ProcessGroupConfigStep, ProcessGroupConfigStepModel };
