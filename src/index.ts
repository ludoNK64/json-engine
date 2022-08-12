import { attribute, digraph, toDot } from 'ts-graphviz'
const hpccWasm = require('@hpcc-js/wasm')
const fs = require('fs')


/**
 * @function MakeGraph
 * Draw a graph using graphviz and JSON notation of the graph.
 * @param json {Object} : json read from a file.
**/
function makeGraph(json:object) 
{
  const arr = Object.values(json)

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
  
  hpccWasm.graphvizSync().then(graphviz => {
      const svg = graphviz.layout(toDot(G), "svg", "dot")
      fs.writeFileSync('graph.svg', svg)
  });

  console.log("Graph generated.")
}


try {
  const data = fs.readFileSync('graph.json', 'utf8')
  makeGraph(JSON.parse(data))
} catch (err) {
  console.error(err)
}

