const axios = require("axios");
const FormData = require("form-data");

async function performRequest(requestOptions) {
  try {
    const { method, url, headers, data } = requestOptions;

    if (
      data &&
      headers["Content-Type"]?.toLowerCase()?.includes("application/json")
    ) {
      headers["Content-Type"] = "application/json";
    } else if (data) {
      headers["Content-Type"] = "multipart/form-data";
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      requestOptions.data = formData;
    }

    const response = await axios({
      method,
      url,
      headers,
      data: requestOptions.data,
      decompress: true,
    });

    return response.data;
  } catch (error) {
    //console.error("Error:", error);
    console.error("Error:", error?.response?.data);
    throw error;
  }
}

module.exports = { performRequest };
