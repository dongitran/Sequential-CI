const axios = require("axios");

async function performRequest(requestOptions) {
  try {
    const response = await axios({
      method: requestOptions.method,
      url: requestOptions.url,
      headers: requestOptions.headers,
      data: requestOptions.data,
      decompress: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

module.exports = { performRequest };
