import YAML from 'yaml'
import { attribute, digraph, toDot } from 'ts-graphviz'
// import { Place, Transition, Flow } from './types'
import { BindingsList } from './BindingsList'
import { ReachabilityGraph, ReachableState } from './ReachabilityGraph'
import { ExistFinallyOperator } from './operators/EF'


const hpccWasm = require('@hpcc-js/wasm')
const fs = require('fs')
const rgraph:ReachabilityGraph = new ReachabilityGraph()


/**
 * @class JSON Engine
 */
class JsonEngine {

  system : any[]
  isYaml : Boolean
  transitions : any[]
  places : Map<String, any> = new Map()
  fnMap: Map<String, Map<String, String>> = new Map()
  bindingsList:BindingsList = new BindingsList()
  // Used as a stack of filenames to execute 
  // transitions in them after reading
  fileslist:String[] = []
  fn: {}

  /**
   * @private
   * Initialize class atrributes after reading the file.
   * 
   * @param {String} filename
   * @return {void}
   */
  private init(filename:String) {
    try {
      const data = fs.readFileSync(filename, 'utf8')
      const sys = this.isYaml ? YAML.parse(data) : JSON.parse(data)

      this.initFromStateData(sys.state)

      this.fn = require(sys.functions)

      // Set functions map
      /*sys.filter(el => Array.isArray(el)).forEach(fn => {
        const _f = this.fnMap.get(fn[0])
        if(typeof _f !== 'undefined') {
          _f.set(fn[1], fn[2])
        } else { // 'f' => ('shirt', 'price')
          this.fnMap.set(fn[0], new Map([ [fn[1], fn[2]] ]))
        }
      })*/
  
    } catch (e) { console.error(e) }
  }

  /**
   * Make a stringify version
   * @param {any} append : whatever to append to the system array
   *
   * @return {string}
   */
  private systemToString(append:any='') {
    this.system.push(append)
    return this.isYaml ? YAML.stringify(this.system) : JSON.stringify(this.system)
  }

  /**
   * Make a key with places values (only) sorted
   * @param {any[]} sys [description]
   */
  private hashKeyFromSystem() {
    let key = ""
    this.system.filter(el => el.type === 'place').forEach(place => {
       key += place.value.sort().join('')
    })
    return key
  }

  /**
   * Update system JSON array
   */
  private updateSystem() {
    // 'system' based on variables updates
    // We do not really need functions in it. Maybe edges labels too.
    this.system = []
    for(const place of this.places.values()) {
      // sort place value HERE
      this.system.push(place)
    }
    this.system.push(...this.transitions)
  }

  /**
   * Init 'places' & 'transitions' from a system JSON notation
   * @param {any[]} state [description]
   */
  private initFromStateData(state:any[]) {
    // Set places map
    state.filter(el => el.type === 'place').forEach(place => {
      this.places.set(place.id, place)
    })
    // set transitions array
    this.transitions = state.filter(el => el.type === 'transition')
    // set system
    this.system = state
  }

  /**
   * Run the entire system representation a.k.a execute all transitions.
   * 
   * @return {void}
   */
  run(filename:String) {
    this.isYaml = filename.endsWith('.yaml')
    this.init(filename)

    // Output system graph
    this.toSVG('G.svg')

    let iter = 1 // to change filename after each loop

    const initState:ReachableState = {
      name: 'system',
      data: this.system,
      outGoingTransition: []
    }

    rgraph.stateMap.set('system', initState)

    // Execute system notation
    this.transitions.forEach(t => {
      // Maybe check if current transition input places
      // have values (to know if already run) before 
      // running the function below below.
      this.executeOneTransition(t, iter, null, initState)
      iter++
    })

    // Execute reached states by reading outputed files
    while(this.fileslist.length > 0)
    {
      try {
        const filename = this.fileslist.pop()
        const data = fs.readFileSync(filename, 'utf8')
        const sys = this.isYaml ? YAML.parse(data) : JSON.parse(data)
        this.initFromStateData(sys) // it's only the state array here

        const currentState:ReachableState = rgraph.stateMap.get(this.hashKeyFromSystem())

        this.transitions.forEach(t => {
          this.executeOneTransition(t, iter, filename, currentState)
          iter++
        })
      } catch(e) { console.log(e) }
    }

    // Reachability graph outputs
    rgraph.toSVG('ReachabilityGraph.svg')
    // rgraph.toJSON('ReachabilityGraph.json')
  }

  /**
   * @private
   * Execute one transition by removing objects in the input places
   * and create objects for output places.
   * 
   * @param {any} transition : transition object
   * 
   * @return {void}
   */
  private executeOneTransition(transition:any, iter:Number, srcFilename:String, srcSate:ReachableState) {
    const equations = transition.equations
    const equationsMap:Map<String, any[]> = new Map()
    const initialInPlacesValue:Map<String, any[]> = new Map()

    if(Array.isArray(equations[0])) {
      equations.forEach(eq => {
        equationsMap.set(eq[0], eq[1])
      })
    } else {
      equationsMap.set(equations[0], equations[1]) // loop if multiple
    }

    // Bind variables from input places
    transition.inplaces.forEach(inPlace => {
      const _place = this.places.get(inPlace[0]) // get by id
      const _var = inPlace[1] // get variables

      if(typeof _var === 'number') return
      
      // use of BindingList
      const fn = Array.isArray(_var) ? "expandList" : "expand"
      this.bindingsList[fn](_var, _place.value)

      // Keep original values
      initialInPlacesValue.set(inPlace[0], _place.value)
    })

    // Empty bindings ? -> return
    if(this.bindingsList.bindings.length === 0) {
      // console.log("Leaving transition '", transition.id, "' because of empty bindings...")
      return
    }

    // Use of BindingList to bind functions calls results
    // for(const k of equationsMap.keys()) {
    //   const v = equationsMap.get(k)
    //   for(const m of this.bindingsList.bindings) {
    //     this.bindingsList.expandEquation(k, v[1], _ => {
    //       // return this.fnMap.get(v[0]).get(_)
    //       let params = v[1]
    //       let _p = v[1].split(',')
    //       _p.forEach(el => {
    //         console.log("Replacing...", el)
    //         params.replace(el, _)
    //         console.log("_ = ", _)
    //       })
    //       console.log("Call to: ", v[0], " with: ", params)
    //       return this.fn[v[0]](...params.split(','))
    //     })
    //   }
    // }

    // Keep track of initial values for out places
    const initialOutPlacesValue:Map<String, any[]> = new Map()
    transition.outplaces.forEach(outPlace => {
      initialOutPlacesValue.set(outPlace[0], this.places.get(outPlace[0]).value)
    })

    // Make different outputs per iteration
    let _iter = 1

    for(const m of this.bindingsList.bindings) {
      // Is there any predicate ?
      if(transition.predicate && !this.fn[transition.predicate](...m.values())) {
        break
      }

      // fill output places
      transition.outplaces.forEach(outPlace => {
        const _place = this.places.get(outPlace[0]) // get by id
        const _vars = outPlace[1] // get variables
        const outValue = []

        _vars.forEach(v => {
          // Compute result value
          const _fn = equationsMap.get(v)
          const _m = new Map()
          
          _fn[1].split(',').forEach(el => {
            _m.set(el, m.get(el))
          })
          
          outValue.push(this.fn[_fn[0]](..._m.values()))
        })

        const initialInValue = initialOutPlacesValue.get(outPlace[0])
        _place.value = initialInValue.length > 0 ? [...initialInValue, outValue] : outValue // [outValue]
      })

      // update in places with unused values
      transition.inplaces.forEach(inPlace => {
        const _place = this.places.get(inPlace[0]) // get by id
        let _var = inPlace[1] // get variables
        _var = Array.isArray(_var) ? _var : [_var]
        let usedValue = undefined

        if(Array.isArray(_var)) {
          usedValue = []
          _var.forEach(v => usedValue.push(m.get(v)))
        } else {
          usedValue = m.get(_var)
        }
        _place.value = initialInPlacesValue.get(inPlace[0]).filter(v => v.toString() !== usedValue.toString())
      })

      // update system attribute
      this.updateSystem()

      const hash = this.hashKeyFromSystem()
      if(! rgraph.stateMap.has(hash)) {
        const rstate:ReachableState = {
          name: `G${iter}-${_iter}`,
          data: this.system,
          outGoingTransition: []
          // transition: {name:transition.id, src:srcState}
        }
        srcSate.outGoingTransition.push({
          name: transition.value.join(' '), // || transition.id,
          target: rstate
        })

        rgraph.stateMap.set(hash, rstate)
        
        // output SVG
        this.toSVG(`G${iter}-${_iter}.svg`)
            
        // output notation
        this.toNotation(`G${iter}-${_iter}`, {
          transition: transition.id,
          src: srcFilename
        })
      } else {
        const rgt = {
          name: transition.id,
          target: rgraph.stateMap.get(hash)
        }

        if(srcSate.outGoingTransition.findIndex(el => el.name = rgt.name) === -1) {
          srcSate.outGoingTransition.push(rgt)
        }
      }

      _iter++
    }
  }

  /**
   * @private
   * Output graph notation into a JSON/YAML file.
   * 
   * @param filename {String} : output filename without extension
   * @param {any} append : whatever to append to the system array
   * 
   * @return {void}
   */
  private toNotation(filename:String, append:any) {
    const dest = './output/' + (this.isYaml ? `yaml/${filename}.yaml` : `json/${filename}.json`)
    fs.writeFileSync(dest, this.systemToString(append))
    console.log(`Text '${dest}' written.`)
    this.fileslist.push(dest)
  }

  /**
   * @private
   * Create the SVG graph image
   * 
   * @param {String} outputFilename
   * 
   * @return {void}
   */
  private toSVG(outputFilename:String) {
    let placeNodesMap:Map<String, any> = new Map()

    const G = digraph('G', (g) => {

      for(let n of this.places.values()) {
        placeNodesMap.set(n.id, g.node(n.id, {
          [attribute.label]: n.value.join(' ')
          // [attribute.xlabel]: "External Label"
        }))
      }

      this.transitions.forEach(t => {
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
          g.edge([placeNodesMap.get(id), transitionNode], {[attribute.label]: label})
        })

        t.outplaces.forEach(outPlace => {
          let [id, label] = [...outPlace]

          if(Array.isArray(label)) {
            label = label.length > 1 ? '(' + label.join(', ') + ')' : label[0]
          }
          g.edge([transitionNode, placeNodesMap.get(id)], {[attribute.label]: label})
        })
      })
    });
    
    hpccWasm.graphvizSync().then(graphviz => {
        const svg = graphviz.layout(toDot(G), "svg", "dot")
        fs.writeFileSync('./output/svg/' + outputFilename, svg)
    });

    console.log(`Graph '${outputFilename}' generated.`)
  }
}






/////////////////////////////////////////////////
//                    Main                     //
/////////////////////////////////////////////////


// Execute transitions
new JsonEngine().run('./json/a100.json')


/*function compare(arr1, arr2) {
  let res = true
  if(Array.isArray(arr1) && Array.isArray(arr2)) {
    arr1.forEach((el, index) => {
      if(el !== arr2[index]) res = false
    })
    return res
  }
  return arr1 == arr2
}


// Exist Finally Operator
function v1ShoesPredicate(state:ReachableState) {
  const places = state.data.filter(el => el.type === 'place')

  for(const place of places) {
    if(place.value.findIndex(arr => compare(arr, ['V1', 'shoes'])) !== -1) {
      return true
    }
  }
  return false
}

// init state
const systemState:ReachableState = rgraph.stateMap.get('system')

const ef = new ExistFinallyOperator()

if(ef.find(systemState, v1ShoesPredicate)) {
  console.log("FOUND PATH:")
  let path = ""
  for(const state of ef.example) {
    path += state.name + " -> "
  }
  path += "/"
  console.log(path)
} else {kb
  console.log("NOT FOUND")
}*/

