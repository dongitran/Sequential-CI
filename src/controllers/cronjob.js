const { get } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const { PROCESS_STATUS, PROCESS_NAME } = require("../constants/process-data");
const { ProcessDataModel } = require("../models/process-data");
const { delayWithAsync } = require("../utils/common");
const { parseCurlString } = require("../utils/curl-parser");
const { performRequest } = require("../utils/axios");
const telegramBot = require("./telegram-bot");
const Joi = require("joi");
const { parse, stringify } = require("flatted");

const cronJobProcess = async () => {
  try {
    const allProcessData = await ProcessDataModel.find({
      status: PROCESS_STATUS.ACTIVE,
    });

    await telegramBot.sendMessageToDefaultGroup(
      "🛸 <b>Start running all process</b>\n"
    );

    const idIntervalSendMessage = setInterval(async () => {
      await telegramBot.sendMessageCurrent(true);
    }, 500);
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
        await telegramBot.sendMessageCurrent();
      } catch (error) {
        console.log(error, "Error item");
        await telegramBot.sendMessageCurrent();
      }
      console.log(JSON.stringify(parameters), "parameters");
    }
    clearInterval(idIntervalSendMessage);
  } catch (error) {
    console.log(error, "Error process");
  }
};

const runProcessItem = async (processItem, parameters) => {
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
            } else {
              if (processItem.parameters[parameterKey][0] != "#") {
                parameters[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
              } else {
                const listKey = processItem.parameters[parameterKey].split("#");
                let tmp = get(result, listKey[1]);

                const command = listKey[2].replace("{tmp}", tmp);
                const value = eval(command);

                parameters[parameterKey] = value;
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
            } else {
              if (processItem.parameters[parameterKey][0] != "#") {
                parameters[parameterKey] = get(
                  result,
                  processItem.parameters[parameterKey]
                );
              } else {
                const listKey = processItem.parameters[parameterKey].split("#");
                let tmp = get(result, listKey[1]);

                const command = listKey[2].replace("{tmp}", tmp);
                const value = eval(command);

                parameters[parameterKey] = value;
              }
            }
          }
        }
        break;
      }
      case PROCESS_NAME.VALIDATE_JSON: {
        const schemaString = processItem.content;

        const schemaObject = {};
        for (const [key, value] of Object.entries(schemaString)) {
          schemaObject[key] = eval(value);
        }

        const schema = Joi.object().keys(schemaObject);

        const { error, value } = schema.validate(
          parameters[processItem["variable"]]
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
        error?.message || JSON.stringify(parse(stringify(error)))
      }\n`
    );
    throw error;
  }

  return parameters;
};

const runProcessWithName = async (name) => {
  const processValue = await ProcessDataModel.findOne({
    name,
    //status: PROCESS_STATUS.ACTIVE,
  });
  console.log(
    {
      name,
      status: PROCESS_STATUS.ACTIVE,
    },
    "49jadsf"
  );
  console.log(processValue);
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
        parameters = await runProcessItem(processItem, parameters);
      }
      await telegramBot.sendMessageCurrent();
    } catch (error) {
      console.log(error, "Error item");
      await telegramBot.sendMessageCurrent();
    }
    console.log(JSON.stringify(parameters), "parameters");
    clearInterval(idIntervalSendMessage);

    await telegramBot.appendMessageAndSend("<b>Successful</b>");
  }
};

module.exports = { cronJobProcess, runProcessWithName };
