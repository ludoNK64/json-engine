import { attribute, digraph, toDot } from 'ts-graphviz'

const fs = require('fs')
const hpccWasm = require('@hpcc-js/wasm')


interface State {
  data: any[],
  sources: String[],
  transition: String
}


/**
 * Make a key with places values (only) sorted
 * @param {any[]} sys [description]
 */
function _keyFromPlacesValue(sys:any[])
{
  let key = ""
  sys.filter(el => el.type === 'place').forEach(place => {
     key += place.value.sort().join('')
  })
  return key
}


/**
 * @class ReachabilityGraph
 */
class ReachabilityGraph {

  // Used to store sorted string notation as key && filename as value
  memo:Map<String,String> = new Map()
  // Used to store filenames as key and their state as value
  nodes:Map<String,State> = new Map()

  /**
   * Run function
   * @param {String} dir : the directory which must contain 
   * 'json' & 'svg' subfolders.
   */
  run(dir) {
    const jsonDir = `${dir}/json`
    const svgDir = `${dir}/svg`

    try {
      const filenames = fs.readdirSync(jsonDir)

      filenames.forEach(filename => {
        const jsonPath = `${jsonDir}/${filename}`
        const svgPath = svgDir +'/'+ filename.split('.')[0] + '.svg'
        const json = JSON.parse( fs.readFileSync(jsonPath, 'utf8') )
        const key = _keyFromPlacesValue(json) // sorted string notation
        const obj = json.pop()
        let src = obj.src === null ? 'system' : obj.src.split('/').slice(-1)[0] // only the filename

        if(this.memo.has(key)) { // existing reached state?
          // update target 'sources' state array
          const _src = this.memo.get(key)
          const targetState = this.nodes.get(_src)

          if(this.nodes.has(src) && !targetState.sources.includes(src)) {
            targetState.sources.push(src)
          }
          // delete notation and SVG files
          fs.unlink(jsonPath, err => {
            if(err) throw err
            fs.unlink(svgPath, err => {
              if(err) throw err
              console.log(`DELETED (json, svg): '${jsonPath}', ${svgPath}`)
            })
          })
        } else { // new one
          this.nodes.set(filename, {
            data: json,
            sources: [ src ], 
            transition: obj.transition
          })
          // Memorize this key state with its filename graph notation
          this.memo.set(key, filename)
        }
      })
    } catch(e) { console.log(e) }

    this.toSVG('ReachabilityGraph.svg')
    this.toJSON('ReachabilityGraph.json')
  }


  /**
   * Make SVG
   * @param {String} outputFilename 
   */
  private toSVG(outputFilename:String) {
    const gNodes:Map<String, any> = new Map()

    const G = digraph('G', (g) => {
      gNodes.set('system', g.node('system'))

      // create nodes
      for(const k of this.nodes.keys()) {
        gNodes.set(k, g.node(k.toString()))
      }
      // create edges
      for(const entry of this.nodes.entries()) {
        const state = entry[1]

        for(const s of state.sources) {
          const src = gNodes.get(s)
          const tgt = gNodes.get(entry[0])

          if( !(src && tgt)) continue

          g.edge([src, tgt], {
            [attribute.label]: state.transition.toString()
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
   * Output a JSON file
   * @return {void}
   */
  private toJSON(outputFilename:String)
  {
    let data = []
    this.nodes.set("system", {data:[],sources:[],transition:""})

    for(let entry of this.nodes.entries()) {

      let successors = []
      for(let _entry of this.nodes.entries()) {
        if(entry[0] !== _entry[0] && _entry[1].sources.includes(entry[0])) {
          successors.push({
            target: _entry[0],
            transition: _entry[1].transition
          })
        }
      }

      data.push({
        id: entry[0],
        // data: entry[1].data,
        successors: successors,
      })
    }

    try {
      fs.writeFileSync('./output/json/' + outputFilename, JSON.stringify(data))
      console.log(`JSON notation '${outputFilename}' generated.`)
    } catch(e) { console.error(e) }
  }
}


 
// RUN

new ReachabilityGraph().run('./output')
