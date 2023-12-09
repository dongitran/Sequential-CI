function parseCurlString(curlData) {
  const options = {};
  const headers = {};

  // Trích xuất thông tin URL
  const urlMatches = curlData.match(/curl '(.+?)'/);
  if (urlMatches) {
    options.url = urlMatches[1];
  }

  // Trích xuất thông tin Headers
  const headerMatches = curlData.match(/-H '(.*?)'/g);
  if (headerMatches) {
    headerMatches.forEach((match) => {
      const [, header] = match.match(/-H '(.*?)'/);
      const [key, value] = header.split(": ");
      headers[key] = value;
    });
  }

  // Trích xuất thông tin Data
  const dataMatches = curlData.match(/--data-raw '(.+?)'/);
  if (dataMatches) {
    options.data = JSON.parse(dataMatches[1]);
  }

  options.method = "post";
  options.headers = headers;

  return options;
}

module.exports = { parseCurlString };
