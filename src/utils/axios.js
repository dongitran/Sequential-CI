const axios = require("axios");

async function performRequest(requestOptions) {
  try {
    const { method, url, headers, data } = requestOptions;

    // Kiểm tra nếu có dữ liệu và content-type là 'application/json'
    if (data && headers['Content-Type'] === 'application/json') {
      headers['Content-Type'] = 'application/json';
    } else if (data) {
      // Nếu không phải là JSON, coi như là form data
      headers['Content-Type'] = 'multipart/form-data';
      const formData = new FormData();
      Object.keys(data).forEach(key => {
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
    console.error("Error:", JSON.stringify(error));
    //throw error;
  }
}

module.exports = { performRequest };
