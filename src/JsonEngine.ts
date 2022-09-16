import YAML from 'yaml'
import { attribute, digraph, toDot } from 'ts-graphviz'
// import { Place, Transition, Flow } from './types'
import { BindingsList } from './BindingsList'
import { State, ReachabilityGraph } from './ReachabilityGraph'


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


  constructor(filename:String) {
    this.isYaml = filename.endsWith('.yaml')

    this.init(filename)
  }

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

      // Set places map
      sys.filter(el => el.type === 'place').forEach(place => {
        this.places.set(place.id, place)
      })

      // set transitions array
      this.transitions = sys.filter(el => el.type === 'transition')

      // Set functions map
      sys.filter(el => Array.isArray(el)).forEach(fn => {
        const _f = this.fnMap.get(fn[0])
        if(typeof _f !== 'undefined') {
          _f.set(fn[1], fn[2])
        } else { // 'f' => ('shirt', 'price')
          this.fnMap.set(fn[0], new Map([ [fn[1], fn[2]] ]))
        }
      })
      // Set system
      this.system = sys

    } catch (err) {
      console.error(err)
    }
  }

  private systemToString() {
     return this.isYaml ? YAML.stringify(this.system) : JSON.stringify(this.system)
  }

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

  private initFromStateData(sys:any[]) {
    sys.filter(el => el.type === 'place').forEach(place => {
      this.places.set(place.id, place)
    })
    // set transitions array
    this.transitions = sys.filter(el => el.type === 'transition')
  }

  /**
   * Run the entire system representation a.k.a execute all transitions.
   * 
   * @return {void}
   */
  execute() {
    // Output system graph
    this.toSVG('G.svg')

    const sysState:State = {
      done: true,
      data: this.system,
      certificate: '',
      transition: {name:'',src:null}
    }

    let iter = 1 // to change filename after each loop

    // Execute system notation
    this.transitions.forEach(t => {
      // Maybe check if current transition input places
      // have values (to know if already run) before 
      // running the function below below.
      this.executeOneTransition(t, iter, sysState)
      
      iter++
    })

    // Execute reached states
    for(const state of rgraph.values()) {
      if(! state.done) {
        this.initFromStateData(state.data)

        this.transitions.forEach(t => {
          // Maybe check if current transition input places
          // have values (to know if already run) before 
          // running the function below below.
          this.executeOneTransition(t, iter, state)
          
          iter++
        })
        state.done = true
      }
    }

    // console.log("ReachabilityGraph Size: ", rgraph.size())
  }

  /**
   * @private
   * Execute one transition by removing objects in the input places
   * and create objects for output places.
   * 
   * @param {any} transition : transition object
   * @return {void}
   */
  private executeOneTransition(transition:any, iter:Number, srcState:State) {
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
      
      // use of BindingList
      const fn = Array.isArray(_var) ? "expandList" : "expand"
      this.bindingsList[fn](_var, _place.value)

      // Keep original values
      initialInPlacesValue.set(inPlace[0], _place.value)
    })

    // Use of BindingList to bind functions calls results
    for(const k of equationsMap.keys()) {
      const v = equationsMap.get(k)
      for(const m of this.bindingsList.bindings) {
        this.bindingsList.expandEquation(k, v[1], _ => {
          return this.fnMap.get(v[0]).get(_)
        })
      }
    }

    // Keep track of initial values for out places
    const initialOutPlacesValue:Map<String, any[]> = new Map()
    transition.outplaces.forEach(outPlace => {
      initialOutPlacesValue.set(outPlace[0], this.places.get(outPlace[0]).value)
    })

    // Make different outputs per iteration
    let _iter = 1

    for(const m of this.bindingsList.bindings) {
      // fill output places
      transition.outplaces.forEach(outPlace => {
        const _place = this.places.get(outPlace[0]) // get by id
        const _vars = outPlace[1] // get variables
        const outValue = []

        _vars.forEach(v => {
          outValue.push(m.get(v))
        })

        const initialInValue = initialOutPlacesValue.get(outPlace[0])
        _place.value = initialInValue.length > 0 ? [...initialInValue, outValue] : [outValue]
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

      const hash = this.systemToString()

      if(! rgraph.has(hash)) {
        rgraph.add(hash, {
          done: false,
          data: this.system,
          certificate: '',
          transition: {name: transition.id, src:srcState}
        })
        // output SVG
        this.toSVG(`G${iter}-${_iter}.svg`)
            
        // output notation
        this.toNotation(`G${iter}-${_iter}`)
      }

      _iter++
    }
  }

  /**
   * @private
   * Output graph notation into a JSON/YAML file.
   * 
   * @param filename {String} : output filename without extension
   * @return {void}
   */
  private toNotation(filename:String) {
    const dest = './output/' + (this.isYaml ? `yaml/${filename}.yaml` : `json/${filename}.json`)
    fs.writeFileSync(dest, this.systemToString())
    console.log(`Text '${dest}' written.`)
  }

  /**
   * @private
   * Create the SVG graph image
   * 
   * @param {String} outputFilename
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


const engine = new JsonEngine('./json/system.json')

engine.execute()
