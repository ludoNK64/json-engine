module.exports = {
  f: (x,y,z) => x+y+z,
  g: (x,y,z) => x+y+z-10,
  h: (x,y,z) => x+y+z >= 10 ? 1 : 0, // carry
  ge10: (x,y,z) => x+y+z >= 10,
  lt10: (x,y,z) => x+y+z < 10,
}
