import { attribute, digraph, toDot } from 'ts-graphviz'

const fs = require('fs')
const hpccWasm = require('@hpcc-js/wasm')


class RGTransition {
  name!:string
  target!: ReachableState
}

export class ReachableState {
  data: any[]
  name: string = ''
  outGoingTransition: RGTransition[]=[]
}

export class ReachabilityGraph {
  stateMap: Map<string, ReachableState> = new Map()

  /**
   * SVG image
   * @param {string} outputFilename
   */
  toSVG(outputFilename:string) {
    const gNodes:Map<String, any> = new Map()

    const G = digraph('G', (g) => {
      // gNodes.set('system', g.node('system'))

      // create nodes
      for(const v of this.stateMap.values()) {
        gNodes.set(v.name, g.node(v.name))
      }
      // create edges
      for(const v of this.stateMap.values()) {
        for(const t of v.outGoingTransition) {
          const src = gNodes.get(v.name)
          const tgt = gNodes.get(t.target.name)

          g.edge([src, tgt], {
            [attribute.label]: t.name
          })
        }
      }
    })
    // Output image file
    hpccWasm.graphvizSync().then(graphviz => {
      const svg = graphviz.layout(toDot(G), "svg", "dot")
      fs.writeFileSync('./output/svg/' + outputFilename, svg)
    });

    console.log(`Graph '${outputFilename}' generated.`)
  }

  /**
   * JSON notation.
   * @param {string} outputFilename 
   */
  toJSON(outputFilename:string) {
    // console.log("JSON file done")
  }
}

