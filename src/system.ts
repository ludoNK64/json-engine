import { attribute, digraph, toDot } from 'ts-graphviz'
import { Place, Transition, Flow } from './types'


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
      placesMap.set(n.id, g.node(n.id, {
      	[attribute.label]: n.value.join(' ')
      	// [attribute.xlabel]: "External Label"
      }))
    })

    transitions.forEach(t => {
      const transitionNode = g.node(t.id, {
      	[attribute.shape]: 'box', 
      	[attribute.label]: t.value.join(' ')
      	// [attribute.xlabel]: "External Label"
      })

      t.inplaces.forEach(inPlace => {
      	let [id, label] = [...inPlace]

      	if(Array.isArray(label)) {
      		label = '(' + label.join(', ') + ')'
      	}
        g.edge([placesMap.get(id), transitionNode], {[attribute.label]: label})
      })

      t.outplaces.forEach(outPlace => {
      	let [id, label] = [...outPlace]

      	if(Array.isArray(label)) {
      		label = '(' + label.join(', ') + ')'
      	}
        g.edge([transitionNode, placesMap.get(id)], {[attribute.label]: label})
      })
    })
  });

  const dot = toDot(G)
  
  hpccWasm.graphvizSync().then(graphviz => {
      const svg = graphviz.layout(dot, "svg", "dot")
      fs.writeFileSync('./svg/system.svg', svg)
  });

  console.log("Graph generated.")

  return dot
}





////////////////////////////////////////////////////////
// Main 
////////////////////////////////////////////////////////


try {
  const data = fs.readFileSync('./json/system.json', 'utf8')

  makeGraph(JSON.parse(data))

} catch (err) {
  console.error(err)
}

