const { parseCurlString } = require("./src/utils/curlParser");
const { performRequest } = require("./src/utils/axios");
const { get } = require("lodash");
const { v4: uuidv4 } = require("uuid");

const { CONFIG } = require("./config");

async function test() {
  const parameters = {};
  let index = 0;
  for (const processItem of CONFIG.process) {
    switch (processItem.name) {
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
        if (index == 3) {
          console.log(requestOptions, "adsf94");
        }

        const result = await performRequest(requestOptions);

        if (processItem?.parameters) {
          for (const parameterKey of Object.keys(processItem.parameters)) {
            if (!processItem.parameters[parameterKey]) {
              parameters[parameterKey] = result;
            } else {
              parameters[parameterKey] = get(
                result,
                processItem.parameters[parameterKey]
              );
            }
          }
        }
        break;
      }
      case "postgres": {
        break;
      }
    }
  }
  console.log(parameters, "parameters");
}

test();
