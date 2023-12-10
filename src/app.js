const { get } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
const express = require("express");
const bodyParser = require("body-parser");
const { parseCurlString } = require("./utils/curl-parser");
const { performRequest } = require("./utils/axios");
const { delayWithAsync } = require("./utils/common");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const { ProcessDataModel } = require("./models/process-data");
const app = express();

async function test() {
  let parameters = {};
  try {
    let index = 0;

    const allProcessData = await ProcessDataModel.find({});
    for (const processValue of allProcessData) {
      parameters = {};
      console.log(`Running: ${processValue.name}`);
      for (const processItem of processValue.process) {
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
    }
  } catch (error) {}
}

async function startApp() {
  await connectToMongo();

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(bodyParser.json());

  app.use("/api/process", processDataRoutes);

  await test();
}

module.exports = { startApp };
