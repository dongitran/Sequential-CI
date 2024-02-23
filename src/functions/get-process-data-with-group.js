const { ProcessDataModel } = require("../models/process-data");
const { ProcessGroupModel } = require("../models/process-group");

function convertArrayToObject(arr) {
  const grouped = arr.reduce((acc, obj) => {
    if (obj.groupId?._id?.toString()) {
      if (!acc[obj.groupId?._id?.toString()]) {
        acc[obj.groupId?._id?.toString()] = [];
      }
      acc[obj.groupId?._id?.toString()].push(obj);
    } else {
      acc["notAssignGroup"] = acc["notAssignGroup"] || [];
      acc["notAssignGroup"].push(obj);
    }
    return acc;
  }, {});

  const result = { group: [] };

  for (const key in grouped) {
    if (key !== "notAssignGroup") {
      result.group.push({
        id: key,
        name: grouped[key][0].groupId.name,
        processList: grouped[key],
      });
    }
  }

  if (grouped["notAssignGroup"]) {
    result["notAssignGroup"] = grouped["notAssignGroup"];
  }

  return result;
}

exports.getProcessDataWithGroup = async (chatId, connection) => {
  const processDataModel = ProcessDataModel(connection);
  ProcessGroupModel(connection);
  const allProcessData = await processDataModel
    .find(
      {
        chatId,
        $or: [{ deletedAt: { $eq: null } }, { deletedAt: { $exists: false } }],
      },
      "name groupId"
    )
    .populate({
      path: "groupId",
      model: "sequential_ci_process_groups",
      select: "name",
    })
    .lean();

  const result = convertArrayToObject(allProcessData);
  return result;
};
