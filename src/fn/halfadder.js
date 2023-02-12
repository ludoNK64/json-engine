module.exports = {
  f: (x,y) => x+y,
  g: (x,y) => x+y-10,
  h: (x,y) => x+y >= 10 ? 1 : 0, // carry
  ge10: (x,y) => x+y >= 10,
  lt10: (x,y) => x+y < 10,
}
