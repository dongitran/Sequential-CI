const { get, omit, find, isEmpty } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const mysql = require("mysql2/promise");
const { PROCESS_STATUS, PROCESS_NAME } = require("../constants/process-data");
const { ProcessDataModel } = require("../models/process-data");
const { delayWithAsync } = require("../utils/common");
const { parseCurlString } = require("../utils/curl-parser");
const { performRequest } = require("../utils/axios");
const telegramBot = require("./telegram-bot");
const Joi = require("joi");
const { parse, stringify } = require("flatted");
const connectToMongo = require("../config/mongo");
const { ProcessLogModel } = require("../models/process-log");
const { PROCESS_LOG_STATUS } = require("../constants/process-log");
const TelegramManager = require("./telegram-manager");
const KafkaMessage = require("./kafka");
const { Types } = require("mongoose");

const cronJobProcess = async (connection, chatId) => {
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    const telegramManager = new TelegramManager(bot, chatId);

    const processDataModel = ProcessDataModel(connection);
    const allProcessData = await processDataModel.find({
      //chatId,
      status: PROCESS_STATUS.ACTIVE,
    });

    await telegramManager.sendMessageAndUpdateMessageId(
      "🛸 <b>Start running all process</b>\n"
    );

    const idIntervalSendMessage = setInterval(async () => {
      await telegramManager.sendMessageCurrent(true);
    }, 1500);
    for (const processValue of allProcessData) {
      let parameters = {};
      console.log(`Running: ${processValue.name}`);
      await telegramManager.sendMessageAndUpdateMessageId(
        `🚁 <b>${processValue.name}</b>`
      );

      const processLogModel = ProcessLogModel(connection);
      const result = await processLogModel.create({
        createdAt: new Date(),
        processId: processValue._id,
        processName: processValue.name,
        status: PROCESS_LOG_STATUS.START,
        process: [],
      });
      const _idLog = result._id;

      try {
        for (let index = 0; index < processValue.process.length; index++) {
          const processItem = processValue.process[index];
          let subProcess, inputProcess;
          [parameters, resultProcessItem, subProcess, inputProcess] =
            await runProcessItem(
              processItem,
              parameters,
              telegramManager,
              connection,
              false
            );

          if (!isEmpty(subProcess)) {
            // Add mark subprocess with flag subProcess: true
            subProcess = subProcess.map((item) => ({
              ...item,
              isSubProcess: true,
            }));
            processValue.process = [
              ...processValue.process.slice(0, index + 1),
              ...subProcess,
              ...processValue.process.slice(index + 1),
            ];
          }

          await processLogModel.findOneAndUpdate(
            { _id: _idLog },
            {
              $push: {
                process: {
                  name: processItem.name,
                  description: processItem.description,
                  result: resultProcessItem,
                  inputProcess,
                },
              },
            },
            { new: true }
          );
        }
      } catch (error) {
        console.log(error, "Error item");
      }

      await telegramManager.appendMessageAndEditMessage(
        ` (<a href="${process.env.URL}/detail/${_idLog}">Detail</a>)`
      );
      telegramManager.clearMessageId();
      await delayWithAsync(3000);
    }
    clearInterval(idIntervalSendMessage);
  } catch (error) {
    console.log(error, "Error process");
  }
};

const runProcessItem = async (
  processItem,
  parameters,
  telegramManager,
  connection,
  displayStep = true
) => {
  let resultProcessItem = {};
  let subProcess = [];
  let inputCommand = null;
  try {
    // Check to display step of process
    if (displayStep) {
      // Get emoji of process
      const emoji =
        find(PROCESS_NAME, { NAME: processItem.name })?.EMOJI || "🦠";
      const isSubProcess = processItem?.isSubProcess;
      const generateSpace = (isSubProcess) =>
        isSubProcess ? " ".repeat(8) : "";
      await telegramManager.appendMessage(
        `${generateSpace(isSubProcess)}${emoji} ${processItem.description}\n`
      );
    }

    switch (processItem.name) {
      case PROCESS_NAME.GENERATE_DATA.NAME: {
        if (processItem?.parameters) {
          for (const parameterKey of Object.keys(processItem.parameters)) {
            let commandString = processItem.parameters[parameterKey];
            Object.keys(parameters).forEach((key) => {
              const regex = new RegExp(`{parameters\\['${key}']}`, "g");
              commandString = commandString.replace(regex, parameters[key]);
            });

            const value = eval(commandString);

            parameters[parameterKey] = value;
            resultProcessItem[parameterKey] = value;
          }
        }
        break;
      }
      case PROCESS_NAME.DELAY.NAME: {
        await delayWithAsync(Number(processItem.timeMs));
        break;
      }
      case PROCESS_NAME.API.NAME: {
        let updatedCurl = processItem.curl;
        Object.keys(parameters).forEach((key) => {
          const regex = new RegExp(`{parameters\\['${key}']}`, "g");
          updatedCurl = updatedCurl.replace(regex, parameters[key]);
        });
        // Add uuid
        while (updatedCurl.includes("{uuid}")) {
          updatedCurl = updatedCurl.replace("{uuid}", uuidv4());
        }

        inputCommand = updatedCurl;
        const requestOptions = parseCurlString(updatedCurl);

        let result;
        try {
          result = await performRequest(requestOptions);
        } catch (error) {
          if (error?.response?.data) {
            result = error?.response?.data;
          } else {
            throw error;
          }
        }

        if (processItem?.parameters) {
          for (const parameterKey of Object.keys(processItem.parameters)) {
            if (!processItem.parameters[parameterKey]) {
              parameters[parameterKey] = result;
              resultProcessItem[parameterKey] = result;
            } else {
              if (processItem.parameters[parameterKey][0] != "#") {
                parameters[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
                resultProcessItem[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
              } else {
                const listKey = processItem.parameters[parameterKey].split("#");
                let tmp = get(result, listKey[1]);

                const command = listKey[2].replace("{tmp}", tmp);
                const value = eval(command);

                parameters[parameterKey] = value;
                resultProcessItem[parameterKey] = value;
              }
            }
          }
        }
        break;
      }
      case PROCESS_NAME.POSTGRES.NAME: {
        const client = new Client({
          host: processItem.config.host,
          database: processItem.config.db,
          user: processItem.config.username,
          password: processItem.config.password,
          port: processItem.config.port,
        });
        let isConnected = false;
        let result;
        try {
          await client.connect();
          isConnected = true;
          let query = processItem.query;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            query = query.replace(regex, parameters[key]);
          });
          inputCommand = query;

          result = (await client.query(query)).rows[0];
        } catch (error) {
          throw error;
        } finally {
          if (isConnected) {
            await client.end();
          }
        }

        if (processItem?.parameters) {
          for (const parameterKey of Object.keys(processItem.parameters)) {
            if (!processItem.parameters[parameterKey]) {
              parameters[parameterKey] = result;
              resultProcessItem[parameterKey] = result;
            } else {
              if (processItem.parameters[parameterKey][0] != "#") {
                parameters[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
                resultProcessItem[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
              } else {
                const listKey = processItem.parameters[parameterKey].split("#");
                let tmp = get(result, listKey[1]);

                const command = listKey[2].replace("{tmp}", tmp);
                const value = eval(command);

                parameters[parameterKey] = value;
                resultProcessItem[parameterKey] = value;
              }
            }
          }
        }
        break;
      }
      case PROCESS_NAME.MYSQL.NAME: {
        let isConnected = false;
        let result;
        let connection;
        try {
          let query = processItem.query;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            query = query.replace(regex, parameters[key]);
          });

          connection = await mysql.createConnection({
            host: processItem.config.host,
            database: processItem.config.db,
            user: processItem.config.username,
            password: processItem.config.password,
            port: processItem.config.port,
          });
          isConnected = true;
          inputCommand = query;

          const [rows, fields] = await connection.execute(query);
        } catch (error) {
          throw error;
        } finally {
          if (isConnected) {
            connection.end();
          }
        }

        if (processItem?.parameters) {
          for (const parameterKey of Object.keys(processItem.parameters)) {
            if (!processItem.parameters[parameterKey]) {
              parameters[parameterKey] = result;
            } else {
              if (processItem.parameters[parameterKey][0] != "#") {
                parameters[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
                resultProcessItem[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
              } else {
                const listKey = processItem.parameters[parameterKey].split("#");
                let tmp = get(result, listKey[1]);

                const command = listKey[2].replace("{tmp}", tmp);
                const value = eval(command);

                parameters[parameterKey] = value;
                resultProcessItem[parameterKey] = value;
              }
            }
          }
        }
        break;
      }
      case PROCESS_NAME.MONGO.NAME: {
        try {
          let query = processItem.query;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            query = query.replace(regex, parameters[key]);
          });

          const connection = await connectToMongo(processItem?.connectString);

          const collection = connection.collection(processItem?.collection);

          let result;
          if (processItem?.type === "insert") {
            console.log(query, "insert");
            inputCommand = query;
            result = await collection.insertOne(JSON.parse(query));
          } else {
            inputCommand = query;
            result = await collection.findOne(JSON.parse(query));
          }

          if (processItem?.parameters) {
            for (const parameterKey of Object.keys(processItem.parameters)) {
              if (!processItem.parameters[parameterKey]) {
                parameters[parameterKey] = result;
                resultProcessItem[parameterKey] = result;
              } else {
                if (processItem.parameters[parameterKey][0] != "#") {
                  parameters[parameterKey] = get(
                    result,
                    processItem.parameters[parameterKey]
                  );
                  resultProcessItem[parameterKey] = get(
                    result,
                    processItem.parameters[parameterKey]
                  );
                } else {
                  const listKey =
                    processItem.parameters[parameterKey].split("#");
                  let tmp = get(result, listKey[1]);

                  const command = listKey[2].replace("{tmp}", tmp);
                  const value = eval(command);

                  parameters[parameterKey] = value;
                  resultProcessItem[parameterKey] = value;
                }
              }
            }
          }
        } catch (error) {
          throw error;
        } finally {
        }

        break;
      }
      case PROCESS_NAME.KAFKA.NAME: {
        try {
          let message = processItem.message;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            message = message.replace(regex, parameters[key]);
          });
          let keyMessage = processItem.key;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            keyMessage = keyMessage.replace(regex, parameters[key]);
          });

          const brokers = processItem.config.brokers;
          const kafkaMessage = new KafkaMessage(brokers);

          inputCommand = { topic: processItem.topic, keyMessage, message };
          kafkaMessage.sendMessage(processItem.topic, keyMessage, message);
        } catch (error) {
          throw error;
        } finally {
        }

        break;
      }
      case PROCESS_NAME.VALIDATE_JSON.NAME: {
        let schema;
        if (processItem.version === "1") {
          let schemaString = JSON.stringify(processItem.content);
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            schemaString = schemaString.replace(regex, parameters[key]);
          });
          inputCommand = schemaString;
          schemaString = JSON.parse(schemaString);

          schema = eval(schemaString);
        } else {
          let schemaString = JSON.stringify(processItem.content);
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            schemaString = schemaString.replace(regex, parameters[key]);
          });
          inputCommand = schemaString;
          schemaString = JSON.parse(schemaString);

          const schemaObject = {};
          for (const [key, value] of Object.entries(schemaString)) {
            schemaObject[key] = eval(value);
          }

          schema = Joi.object().keys(schemaObject);
        }

        // TODO: check if value received is undefined
        if (!parameters[processItem["variable"]]) {
          throw "Data not found to validate";
        }
        const { error, value } = schema.validate(
          parameters[processItem["variable"]],
          { allowUnknown: true }
        );
        if (error) {
          resultProcessItem = { result: "Validate failed" };
          throw error;
        }

        resultProcessItem = { result: "Validate successful" };
        break;
      }
      case PROCESS_NAME.SUBPROCESS.NAME: {
        const rocessDataModel = ProcessDataModel(connection);
        const processData = await rocessDataModel.findOne({
          _id: new Types.ObjectId(processItem.processId),
          //chatId,
          //status: PROCESS_STATUS.ACTIVE,
          // TODO: add condition
        });
        subProcess = processData?.process;
        break;
      }
    }
  } catch (error) {
    await telegramManager.appendMessage(
      `❌ ${processItem.description}: ${
        error?.response?.data?.message ||
        error?.message ||
        JSON.stringify(parse(stringify(error))).replace(/<([^<>]+)>/g, '"$1"')
      }\n`
    );
    throw error;
  }

  return [parameters, resultProcessItem, subProcess, inputCommand];
};

const runProcessWithName = async (
  nameOrId,
  connection,
  chatId,
  messageThreadId
) => {
  // Create object telegram manager
  const bot = telegramBot.getBot();
  const telegramManager = new TelegramManager(bot, chatId, messageThreadId);

  // Get process
  const ProcessDataModelWithConnection = ProcessDataModel(connection);
  console.log(
    {
      name: nameOrId,
      chatId,
      messageThreadId,
      //status: PROCESS_STATUS.ACTIVE,
    },
    "query"
  );
  let processValue = await ProcessDataModelWithConnection.findOne({
    name: nameOrId,
    chatId,
    messageThreadId,
    //status: PROCESS_STATUS.ACTIVE,
  });
  console.log(processValue, "processValue");

  if (!processValue) {
    if ((nameOrId.length = 24)) {
      // TODO: validate hex string
      processValue = await ProcessDataModelWithConnection.findOne({
        _id: new Types.ObjectId(nameOrId),
        //chatId,
      });
    }

    if (!processValue) {
      await telegramManager.sendMessageAndUpdateMessageId(
        `--------------------------- \n<b>${nameOrId}</b> not exists\n`
      );
      return;
    }
  }

  const processLogModel = ProcessLogModel(connection);
  const result = await processLogModel.create({
    createdAt: new Date(),
    processId: processValue._id,
    processName: processValue.name,
    status: PROCESS_LOG_STATUS.START,
    process: [],
  });
  const _idLog = result._id;

  if (processValue) {
    parameters = {};
    console.log(`Running: ${processValue.name}`);
    await telegramManager.sendMessageAndUpdateMessageId(
      `--------------------------- \n🚁 Running: <b>${
        processValue.name
      }</b>\nId: <code>${processValue._id.toString()}</code>\n---------------------------\n`
    );

    const idIntervalSendMessage = setInterval(async () => {
      await telegramManager.sendMessageCurrent(true);
    }, 500);
    try {
      for (let index = 0; index < processValue.process.length; index++) {
        const processItem = processValue.process[index];
        let resultProcessItem = {},
          subProcess,
          inputProcess;

        [parameters, resultProcessItem, subProcess, inputProcess] =
          await runProcessItem(
            processItem,
            parameters,
            telegramManager,
            connection
          );

        if (!isEmpty(subProcess)) {
          // Add mark subprocess with flag subProcess: true
          subProcess = subProcess.map((item) => ({
            ...item,
            isSubProcess: true,
          }));
          processValue.process = [
            ...processValue.process.slice(0, index + 1),
            ...subProcess,
            ...processValue.process.slice(index + 1),
          ];
        }

        await processLogModel.findOneAndUpdate(
          { _id: _idLog },
          {
            $push: {
              process: {
                name: processItem.name,
                description: processItem.description,
                result: resultProcessItem,
                inputProcess,
              },
            },
          },
          { new: true }
        );
      }
    } catch (error) {
      console.log(error, "Error item");
      await telegramManager.sendMessageCurrent(false);
    }
    console.log(JSON.stringify(parameters), "parameters");
    clearInterval(idIntervalSendMessage);

    setTimeout(async () => {
      await telegramManager.appendMessageAndEditMessage(
        `Detail: <a href="${process.env.URL}/detail/${_idLog}">Click here</a>\n<b>Successful</b>`
      );
    }, 250);
  }
};

const cloneProcess = async (
  id,
  connection,
  chatId,
  messageThreadId,
  newName
) => {
  let telegramManager = undefined;
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    telegramManager = new TelegramManager(bot, chatId, messageThreadId);

    // Get process
    const processDataModel = ProcessDataModel(connection);
    const processValue = await processDataModel.findOne({
      _id: new Types.ObjectId(id),
      //status: PROCESS_STATUS.ACTIVE,
    });

    // Validate chat id
    if (processValue.chatId === chatId) {
      throw `The process has already been exists`;
    }

    const result = await processDataModel.create({
      ...omit(processValue, ["_id"]),
      ...(newName && { name: newName }),
      createdAt: new Date(),
      chatId,
      messageThreadId,
      cloneFrom: processValue._id,
    });

    await telegramManager.sendMessageAndUpdateMessageId(
      `🌐 <b>Clone process sucessful</b>\nId: <code>${result._id.toString()}</code>\n`
    );
  } catch (error) {
    if (telegramManager) {
      await telegramManager.sendMessageAndUpdateMessageId(
        "❗️" + error?.message || error
      );
    }
  }
};

const deleteProcess = async (id, connection, chatId) => {
  let telegramManager = undefined;
  try {
    // Create object telegram manager
    const bot = telegramBot.getBot();
    telegramManager = new TelegramManager(bot, chatId);

    // Get process
    const processDataModel = ProcessDataModel(connection);
    const processValue = await processDataModel.findOne({
      _id: new Types.ObjectId(id),
      chatId,
      //status: PROCESS_STATUS.ACTIVE,
    });

    if (!processValue) {
      throw "Process not found";
    }

    if (processValue.deletedAt) {
      throw "Your process has been deleted.";
    }

    await processDataModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
      },
      {
        deletedAt: new Date(),
      }
    );

    await telegramManager.sendMessageAndUpdateMessageId(
      `🔒 <b>Delete process sucessful</b>\nId: <code>${id}</code>\n`
    );
  } catch (error) {
    if (telegramManager) {
      await telegramManager.sendMessageAndUpdateMessageId(
        `❗️${error?.message || error}`
      );
    }
  }
};

module.exports = {
  cronJobProcess,
  runProcessWithName,
  cloneProcess,
  deleteProcess,
};
