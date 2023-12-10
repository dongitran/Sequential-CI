const { ProcessDataModel } = require("../models/process-data");

exports.createData = async (req, res) => {
  try {
    const { name, content } = req.body;

    // Validate data
    if (!name || !content) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Check name exist
    const existingData = await ProcessDataModel.findOne({ name });
    if (existingData) {
      return res.status(400).json({ message: "Đã tồn tại process với tên này" });
    }

    const newProcessData = new ProcessDataModel({
      createdAt: new Date(),
      updatedAt: new Date(),
      name,
      content,
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
