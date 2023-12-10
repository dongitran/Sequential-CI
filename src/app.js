const { get } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const { parseCurlString } = require("./utils/curl-parser");
const { performRequest } = require("./utils/axios");
const { CONFIG } = require("../config");
const { delayWithAsync } = require("./utils/common");
const connectToLogMongo = require("./config/log");

async function test() {
  let parameters = {};
  try {
    parameters = {};
    let index = 0;
    for (const processItem of CONFIG.process) {
      switch (processItem.name) {
        case "generate-data": {
          if (processItem?.parameters) {
            for (const parameterKey of Object.keys(processItem.parameters)) {
              const value = eval(processItem.parameters[parameterKey]);

              parameters[parameterKey] = value;
            }
          }
          break;
        }
        case "api": {
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

          index++;

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
        case "postgres": {
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
        case "delay": {
          await delayWithAsync(Number(processItem.timeMs));
          break;
        }
      }
    }
    console.log(parameters, "parameters");
  } catch (error) {}
}

async function startApp() {
  await connectToLogMongo();

  await test();
}

module.exports = { startApp };
