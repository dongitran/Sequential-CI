const { get } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const { PROCESS_STATUS, PROCESS_NAME } = require("../constants/process-data");
const { ProcessDataModel } = require("../models/process-data");
const { delayWithAsync } = require("../utils/common");
const { parseCurlString } = require("../utils/curl-parser");
const { performRequest } = require("../utils/axios");
const telegramBot = require("./telegram-bot");

const cronJobProcess = async () => {
  try {
    const allProcessData = await ProcessDataModel.find({
      status: PROCESS_STATUS.ACTIVE,
    });

    let context = await telegramBot.sendMessageToDefaultGroup(
      "🛸 <b>Start running all process</b>\n"
    );
    for (const processValue of allProcessData) {
      parameters = {};
      console.log(`Running: ${processValue.name}`);
      context = await telegramBot.appendMessageAndSend(
        `--------------------------- \n🚁 Running: <b>${processValue.name}</b>\n`
      );
      try {
        for (const processItem of processValue.process) {
          switch (processItem.name) {
            case PROCESS_NAME.GENERATE_DATA: {
              if (processItem?.parameters) {
                for (const parameterKey of Object.keys(
                  processItem.parameters
                )) {
                  const value = eval(processItem.parameters[parameterKey]);

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
                for (const parameterKey of Object.keys(
                  processItem.parameters
                )) {
                  if (!processItem.parameters[parameterKey]) {
                    parameters[parameterKey] = result;
                  } else {
                    if (processItem.parameters[parameterKey][0] != "#") {
                      parameters[parameterKey] = get(
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
              await client.connect();

              let query = processItem.query;
              Object.keys(parameters).forEach((key) => {
                const regex = new RegExp(`{parameters\\['${key}']}`, "g");
                query = query.replace(regex, parameters[key]);
              });
              const result = (await client.query(query)).rows[0];
              await client.end();

              if (processItem?.parameters) {
                for (const parameterKey of Object.keys(
                  processItem.parameters
                )) {
                  if (!processItem.parameters[parameterKey]) {
                    parameters[parameterKey] = result;
                  } else {
                    if (processItem.parameters[parameterKey][0] != "#") {
                      parameters[parameterKey] = get(
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
                    }
                  }
                }
              }
              break;
            }
          }
          context = await telegramBot.appendMessage(
            `✅ ${processItem.description}\n`
          );
        }
        await telegramBot.sendMessageCurrent();
      } catch (error) {
        console.log(error, "Error item");
      }
      console.log(parameters, "parameters");
    }
  } catch (error) {
    console.log(error, "Error process");
  }
};

module.exports = { cronJobProcess };
