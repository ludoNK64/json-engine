import { attribute, digraph, toDot } from 'ts-graphviz'
const hpccWasm = require('@hpcc-js/wasm')
const fs = require('fs')


/**
 * @function MakeGraph
 * Draw a graph using graphviz and JSON notation of the graph.
 * 
 * @param json {Object} : json read from a file.
**/
function makeGraph(arr:Array<any>) 
{
  const G = digraph('G', (g) => {

    let placesMap:Map<String, any> = new Map()
    let places = arr.filter(el => el.type === 'place')
    let transitions = arr.filter(el => el.type === 'transition')

    places.forEach(n => {
      placesMap.set(n.id, g.node(n.value.join(' ')))
    })

    transitions.forEach(t => {
      const transitionNode = g.node(t.value.join(' '), {[attribute.shape]: 'box'})

      t.inplaces.forEach(inPlaceId => {
        g.edge([placesMap.get(inPlaceId), transitionNode])
      })

      t.outplaces.forEach(outPlaceId => {
        g.edge([transitionNode, placesMap.get(outPlaceId)])
      })
    })
  });

  const dot = toDot(G)
  
  hpccWasm.graphvizSync().then(graphviz => {
      const svg = graphviz.layout(dot, "svg", "dot")
      fs.writeFileSync('./svg/output.svg', svg)
  });

  console.log("Graph generated.")
  return dot
}


/**
 * @function dotToJSON
 * Output the dot notation of a graph into a JSON file.
 * 
 * @param str {String} : the dot notation
 * @param filename {String} : output filename
 */

function dotToJSON(str, filename)
{
  let nodes:Map<string, any> = new Map()

  let i = str.indexOf("{")
  const endPos = str.indexOf("}")

  while(i != endPos)
  {
    i++

    if(str[i] === '"') { 
      const substr = str.substring(i, str.indexOf(";", i)) // get until ";" (exclusive)
      const lkey = substr.substring(1, substr.indexOf('"', 2)) // get only the text inside "..."

      if(/^"[\w ]+"$/.test(substr)) { // place only
        nodes.set(lkey, {
          id: lkey.replace(/\s/g, '-'),
          type: "place",
          value: lkey.split(" ")
        })

      } else if(/box/.test(substr)) { // transition
        nodes.set(lkey, {
          id: lkey.replace(/\s/g, '-'),
          type: "transition",
          value: lkey.split(" "),
          inplaces: [],
          outplaces: []
        })

      } else if(/->/.test(substr)) { // edge
        const _pos = substr.length-2 // position of the last '"' skipping it
        const rkey = substr.substring(substr.lastIndexOf('"', _pos)+1, _pos+1)
        const lid = lkey.replace(/\s/g, '-')
        const rid = rkey.replace(/\s/g, '-')

        let node = nodes.get(lkey)

        if(node.type != "transition") {
          node = nodes.get(rkey)
        } 

        if(node.id === rid) { // right id
          node.inplaces.push(lid)
        } else { // = left id
          node.outplaces.push(rid)
        }
      } else continue 

      i += substr.length // go the next set of characters
    }
  }

  // result
  let res = []
  for(let n of nodes.values()) res.push(n)

  fs.writeFileSync(filename, JSON.stringify(res))
}




////////////////////////////////////////////////////////
// Main 
////////////////////////////////////////////////////////


try {
  const data = fs.readFileSync('./output.json', 'utf8')

  const dotNotation = makeGraph(JSON.parse(data))

  // dotToJSON(dotNotation, "output.json");
} catch (err) {
  console.error(err)
}

