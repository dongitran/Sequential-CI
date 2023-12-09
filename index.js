const { parseCurlString } = require("./src/utils/curlParser");
const { performRequest } = require("./src/utils/axios");
const { get } = require("lodash");

const { CONFIG } = require("./config");

async function test() {
  const parameters = {};
  let index = 0;
  for (const processItem of CONFIG.process) {
    let updatedCurl = processItem.curl;
    Object.keys(parameters).forEach((key) => {
      const regex = new RegExp(`{parameters\\['${key}']}`, "g");
      updatedCurl = updatedCurl.replace(regex, parameters[key]);
    });

    const requestOptions = parseCurlString(updatedCurl);

    index++;

    const result = await performRequest(requestOptions);

    if (processItem?.parameters) {
      for (const parameterKey of Object.keys(processItem.parameters)) {
        parameters[parameterKey] = get(
          result,
          processItem.parameters[parameterKey]
        );
      }
    }
  }
}


test();
