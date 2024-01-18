const { isEmpty } = require("lodash");

function parseCurlString(curlData) {
  const options = {};
  const headers = {};
  curlData = curlData.replace(/\n/g, "");
  // Update --data-raw to --data
  curlData = curlData.replace(/--data-raw/g, "--data");

  const urlMatches = curlData.match(/'([^']+)'/);
  if (urlMatches) {
    options.url = urlMatches[1];
  }

  const headerMatches = curlData.match(/-header '(.*?)'/g);
  if (headerMatches) {
    headerMatches.forEach((match) => {
      const [, header] = match.match(/-header '(.*?)'/);
      const [key, value] = header.split(": ");
      headers[key] = value;
    });
  }

  const dataMatches = curlData.match(/--data '(.+?)'/);
  const dataMatchesWithUrlEncode = curlData.includes("--data-urlencode");
  if (dataMatchesWithUrlEncode) {
    const regex = /--data-urlencode\s+'([^']*)=([^']*)'/g;
    const data = {};

    let match;
    while ((match = regex.exec(curlData)) !== null) {
      const [, key, value] = match;
      data[key] = decodeURIComponent(value);
    }
    console.log(data, "formDataformData");

    options.data = data;
    options.urlEncode = true;
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (dataMatches) {
    options.data = JSON.parse(dataMatches[1]);
  } else {
    const formDataRegex = /--form '([^=]+)=([^']+)'/g;
    const formData = {};

    let match;
    while ((match = formDataRegex.exec(curlData)) !== null) {
      const [, key, value] = match;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      formData[trimmedKey] = trimmedValue.substring(1, trimmedValue.length - 1);
    }

    options.data = formData;
    headers["Content-Type"] = "multipart/form-data";
  }

  // Check method
  if (isEmpty(options.data) && !curlData.includes("--data")) {
    options.method = "get";
  } else {
    if (curlData.toLowerCase().includes("patch")) {
      options.method = "patch";
    } else {
      options.method = "post";
    }
  }

  options.headers = headers;

  console.log(options, "optionsoptions");

  return options;
}

module.exports = { parseCurlString };
