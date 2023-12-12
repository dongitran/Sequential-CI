const { ProcessDataModel } = require("../models/process-data");

exports.createData = async (req, res) => {
  try {
    const { name, process, status } = req.body;

    // Validate data
    if (!name || !process) {
      return res.status(400).json({ message: "Data invalid" });
    }

    // Check name exist
    const existingData = await ProcessDataModel.findOne({ name });
    if (existingData) {
      return res.status(400).json({ message: "Process name exist" });
    }

    const newProcessData = new ProcessDataModel({
      createdAt: new Date(),
      updatedAt: new Date(),
      name,
      process,
      status: status || "inactive",
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
    const { name, process, status } = req.body;

    // Validate data
    if (!name || !process) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // Find and update data by name
    const updatedData = await ProcessDataModel.findOneAndUpdate(
      { name },
      { process, ...(status && { status }), updatedAt: new Date() },
      { new: true }
    );

    if (!updatedData) {
      return res.status(404).json({ message: "No data found to update" });
    }

    res.json({ message: "Data updated successfully", data: updatedData });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating data", error: error.message });
  }
};
