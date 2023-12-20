const { get } = require("lodash");
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

const cronJobProcess = async (connection) => {
  try {
    const processDataModel = ProcessDataModel(connection);
    const allProcessData = await processDataModel.find({
      status: PROCESS_STATUS.ACTIVE,
    });

    await telegramBot.sendMessageToDefaultGroup(
      "🛸 <b>Start running all process</b>\n"
    );

    const idIntervalSendMessage = setInterval(async () => {
      await telegramBot.sendMessageCurrent(true);
    }, 3500);
    for (const processValue of allProcessData) {
      parameters = {};
      console.log(`Running: ${processValue.name}`);
      await telegramBot.appendMessageAndSend(
        `--------------------------- \n🚁 Running: <b>${processValue.name}</b>\n`
      );

      try {
        for (const processItem of processValue.process) {
          parameters = await runProcessItem(processItem, parameters);
        }
        //await telegramBot.sendMessageCurrent();
      } catch (error) {
        console.log(error, "Error item");
        await telegramBot.sendMessageCurrent();
      }
      console.log(JSON.stringify(parameters), "parameters");
    }
    clearInterval(idIntervalSendMessage);

    setTimeout(async () => {
      await telegramBot.appendMessageAndSend("<b>Successful</b>");
    }, 250);
  } catch (error) {
    console.log(error, "Error process");
  }
};

const runProcessItem = async (processItem, parameters) => {
  let resultProcessItem = {};
  try {
    await telegramBot.appendMessage(`✅ ${processItem.description}\n`);
    switch (processItem.name) {
      case PROCESS_NAME.GENERATE_DATA: {
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
      case PROCESS_NAME.DELAY: {
        await delayWithAsync(Number(processItem.timeMs));
        break;
      }
      case PROCESS_NAME.API: {
        let updatedCurl = processItem.curl;
        Object.keys(parameters).forEach((key) => {
          const regex = new RegExp(`{parameters\\['${key}']}`, "g");
          updatedCurl = updatedCurl.replace(regex, parameters[key]);
        });
        // Add uuid
        while (updatedCurl.includes("{uuid}")) {
          updatedCurl = updatedCurl.replace("{uuid}", uuidv4());
        }

        const requestOptions = parseCurlString(updatedCurl);

        const result = await performRequest(requestOptions);

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
      case PROCESS_NAME.POSTGRES: {
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
      case PROCESS_NAME.MYSQL: {
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
      case PROCESS_NAME.MONGO: {
        try {
          let query = processItem.query;
          Object.keys(parameters).forEach((key) => {
            const regex = new RegExp(`{parameters\\['${key}']}`, "g");
            query = query.replace(regex, parameters[key]);
          });

          const connection = await connectToMongo(processItem?.connectString);

          const collection = connection.collection(processItem?.collection);

          const result = await collection.findOne(JSON.parse(query));

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
      case PROCESS_NAME.VALIDATE_JSON: {
        let schemaString = JSON.stringify(processItem.content);
        Object.keys(parameters).forEach((key) => {
          const regex = new RegExp(`{parameters\\['${key}']}`, "g");
          schemaString = schemaString.replace(regex, parameters[key]);
        });
        schemaString = JSON.parse(schemaString);

        const schemaObject = {};
        for (const [key, value] of Object.entries(schemaString)) {
          schemaObject[key] = eval(value);
        }

        const schema = Joi.object().keys(schemaObject);

        // TODO: check if value received is undefined
        const { error, value } = schema.validate(
          parameters[processItem["variable"]],
          { allowUnknown: true }
        );
        if (error) {
          throw error;
        }
        break;
      }
    }
  } catch (error) {
    await telegramBot.appendMessage(
      `❌ ${processItem.description}: ${
        error?.response?.data?.message ||
        error?.message ||
        JSON.stringify(parse(stringify(error))).replace(/<([^<>]+)>/g, '"$1"')
      }\n`
    );
    throw error;
  }

  return [parameters, resultProcessItem];
};

const runProcessWithName = async (name, connection) => {
  const ProcessDataModelWithConnection = ProcessDataModel(connection);
  const processValue = await ProcessDataModelWithConnection.findOne({
    name,
    //status: PROCESS_STATUS.ACTIVE,
  });

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
    await telegramBot.sendMessageToDefaultGroup(
      `--------------------------- \n🚁 Running: <b>${processValue.name}</b>\n`
    );

    const idIntervalSendMessage = setInterval(async () => {
      await telegramBot.sendMessageCurrent(true);
    }, 500);
    try {
      for (const processItem of processValue.process) {
        let resultProcessItem = {};
        [parameters, resultProcessItem] = await runProcessItem(
          processItem,
          parameters
        );

        await processLogModel.findOneAndUpdate(
          { _id: _idLog },
          {
            $push: {
              process: {
                name: processItem.name,
                description: processItem.description,
                result: resultProcessItem,
              },
            },
          },
          { new: true }
        );
      }
      //await telegramBot.sendMessageCurrent();
    } catch (error) {
      console.log(error, "Error item");
      await telegramBot.sendMessageCurrent();
    }
    console.log(JSON.stringify(parameters), "parameters");
    clearInterval(idIntervalSendMessage);

    setTimeout(async () => {
      await telegramBot.appendMessageAndSend(
        `Detail: <a href="https://fb20-2405-4802-8128-3900-502b-9b4d-c557-3bdd.ngrok-free.app/detail/${_idLog}">Click here</a>\n<b>Successful</b>`
      );
    }, 250);
  }
};

module.exports = { cronJobProcess, runProcessWithName };
