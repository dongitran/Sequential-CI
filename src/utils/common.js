async function delayWithAsync(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getDataByKey(inputString, key) {
  const pattern = new RegExp(`\\b${key}\\s+"([^"]+)"`);

  // using regex
  const match = inputString.match(pattern);

  if (match && match.length >= 2) {
    return match[1]; 
  } else {
    return undefined;
  }
}

module.exports = { delayWithAsync, getDataByKey };
