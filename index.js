const { parseCurlString } = require("./src/utils/curlParser");
const { performRequest } = require("./src/utils/axios");
const { CONFIG } = require("./config");

for (const processItem of CONFIG.process) {
  const requestOptions = parseCurlString(processItem.curl);
  performRequest(requestOptions)
    .then((responseData) => {
      console.log(responseData, "responseData");
      // Xử lý dữ liệu trả về nếu cần
    })
    .catch((error) => {
      // Xử lý lỗi nếu có
    });
}
