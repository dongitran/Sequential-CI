async function delayWithAsync(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { delayWithAsync };
