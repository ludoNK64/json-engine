module.exports = {
  f: x => x,
  g: x => "O", // accept coin
  h: x => "1", // ready to dispense -> dispense candy
  is_coin: x => x === "o",
  not_coin: x => x !== "o",
}
