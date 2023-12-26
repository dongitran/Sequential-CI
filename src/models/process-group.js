const { Types, Schema } = require("mongoose");

const ProcessGroup = new Schema({
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date || undefined || null,
  status: String,
  name: String,
  chatId: String,
  processDataIds: [
    { type: Types.ObjectId, ref: "sequential_ci_process_datas" },
  ],
});

const ProcessGroupModel = (connection) => {
  return connection.model("sequential_ci_process_groups", ProcessGroup);
};

module.exports = { ProcessGroup, ProcessGroupModel };
