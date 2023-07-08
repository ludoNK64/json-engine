module.exports = {
  f1: (x,y) => x+y,
  g1: (x,y) => x+y-10,
  h1: (x,y) => x+y >= 10 ? 1 : 0, // carry
  h_ge10: (x,y) => x+y >= 10,
  h_lt10: (x,y) => x+y < 10,

  f2: (x,y,z) => x+y+z,
  g2: (x,y,z) => x+y+z-10,
  h2: (x,y,z) => x+y+z >= 10 ? 1 : 0, // carry
  f_ge10: (x,y,z) => x+y+z >= 10,
  f_lt10: (x,y,z) => x+y+z < 10,
}
