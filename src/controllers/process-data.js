require("dotenv").config();
const connectToMongo = require("../config/mongo");
const { ProcessDataModel } = require("../models/process-data");
const { PROCESS_STATUS } = require("../constants/process-data");
const { Types } = require("mongoose");

exports.createData = async (req, res) => {
  try {
    const { name, status, chatId } = req.body;

    // Validate data
    if (!name || !req.body.process) {
      return res.status(400).json({ message: "Data invalid" });
    }

    // Check name exist
    const connection = await connectToMongo(process.env.MONGO_URI);
    const processDataModel = ProcessDataModel(connection);
    const existingData = await processDataModel.findOne({ name });
    if (existingData) {
      return res.status(400).json({ message: "Process name exist" });
    }

    const newProcessData = new processDataModel({
      createdAt: new Date(),
      updatedAt: new Date(),
      name,
      process: req.body.process,
      status: status || PROCESS_STATUS.INACTIVE,
      chatId,
    });

    const savedData = await newProcessData.save();

    res
      .status(201)
      .json({ message: "Data created successfully", data: savedData });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating data", error: error.message });
  }
};

exports.updateDataByName = async (req, res) => {
  try {
    const { name, status } = req.body;

    // Validate data
    if (!name || !req.body.process) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // Find and update data by name
    const connection = await connectToMongo(process.env.MONGO_URI);
    const processDataModel = ProcessDataModel(connection);
    const updatedData = await processDataModel.findOneAndUpdate(
      { name },
      {
        process: req.body.process,
        ...(status && { status }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedData) {
      return res.status(404).json({ message: "No data found to update" });
    }

    res.json({ message: "Data updated successfully", data: updatedData });
  } catch (error) {
    console.log(error, "Update data error");
    res
      .status(400)
      .json({ message: "Error updating data", error: error.message });
  }
};

exports.linkProcessToGroup = async (chatId, connection, processId, groupId) => {
  try {
    const processDataModel = ProcessDataModel(connection);

    await processDataModel.findOneAndUpdate(
      { _id: new Types.ObjectId(processId.toString()), chatId },
      {
        groupId: new Types.ObjectId(groupId.toString()),
      }
    );
  } catch (error) {
    console.log(error, "Link process to group error");
  }
};
