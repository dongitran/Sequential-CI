const { isEmpty } = require("lodash");

function parseCurlString(curlData) {
  const options = {};
  const headers = {};
  curlData = curlData.replace(/\n/g, "");

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
  if (dataMatches) {
    options.data = JSON.parse(dataMatches[1]);
  } else {
    const formDataRegex = /--form '([^=]+)=([^']+)'/g;
    const formData = {};

    let match;
    while ((match = formDataRegex.exec(curlData)) !== null) {
      const [, key, value] = match;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      formData[trimmedKey] = trimmedValue.replace(/"/g, "");
    }

    options.data = formData;
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  // Check method
  if (isEmpty(options.data)) {
    options.method = "get";
  } else {
    if (curlData.toLowerCase().includes("patch")) {
      options.method = "patch";
    } else {
      options.method = "post";
    }
  }

  options.headers = headers;

  return options;
}

module.exports = { parseCurlString };
