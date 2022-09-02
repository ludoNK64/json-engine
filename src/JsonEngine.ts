import YAML from 'yaml'
import { attribute, digraph, toDot } from 'ts-graphviz'
// import { Place, Transition, Flow } from './types'
import { BindingsList } from './BindingsList'


const hpccWasm = require('@hpcc-js/wasm')
const fs = require('fs')



/**
 * @class JSON Engine
 */
class JsonEngine {

	system : any[]
	isYaml : Boolean
	transitions : any[]
	places : Map<String, any> = new Map()
	varBindingMap:Map<String, any> = new Map() // (variable, value) pairs
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

	/**
	 * Run the entire system representation a.k.a execute all transitions.
	 * 
	 * @return {void}
	 */
	execute() {
		// Output system graph
		this.toSVG('G.svg')

		let iter = 1 // to change filename after each loop

		this.transitions.forEach(t => {
			// Maybe check if current transition input places
			// have values (to know if already run) before 
			// running the function below below.
			this.executeOneTransition(t)

			// Update 'system' based on variables updates
			// We do not really need functions in it. Maybe edges labels too.
			this.system = []
			for(const place of this.places.values()) {
				this.system.push(place)
			}
			this.system.push(...this.transitions)

			// Make SVG graph
			this.toSVG(`G${iter}.svg`)

			// Output JSON or YAML text notation
			this.toFile(`G${iter}`)

			iter++
		})
	}

	/**
	 * @private
	 * Execute one transition by removing objects in the input places
	 * and create objects for output places.
	 * 
	 * @param {any} transition : transition object
	 * @return {void}
	 */
	private executeOneTransition(transition:any) {
		const equations = transition.equations
		let equationsMap:Map<String, any[]> = new Map()

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
			// bind them
			if(Array.isArray(_var)) {
				_var.forEach((v, index) => this.varBindingMap.set(v, _place.value[index]))
				// this.bindingsList.expandList(_var, _place.value)
			} else { // string
				this.varBindingMap.set(_var, _place.value[0])
				// this.bindingsList.expand(_var, _place.value)
			}
			const fnCall = Array.isArray(_var) ? "expandList" : "expand"
			this.bindingsList[fnCall](_var, _place.value)
			// make it empty
			_place.value = []
		})

		// Fill output places
		transition.outplaces.forEach(outPlace => {
			const _place = this.places.get(outPlace[0]) // get by id
			const _vars = outPlace[1] // get variables

			if(Array.isArray(_vars)) {
				let out = []
				_vars.forEach(v => {
					if(equationsMap.has(v)) { // get value from the function run
						const _params = equationsMap.get(v) // ['f', 'z']
						// 'f' then value of 'z'
						out.push(this.fnMap.get(_params[0]).get( this.varBindingMap.get(_params[1])) )
					} else { // just add the value
						out.push(this.varBindingMap.get(v))
					}
					// fill value of the place
					_place.value = out
				})
			}
		})
	}

	/**
	 * @private
	 * Output graph notation into a JSON/YAML file.
	 * 
	 * @param filename {String} : output filename without extension
	 * @return {void}
	 */
	private toFile(filename:String) {
		const dest = './output/' + (this.isYaml ? `yaml/${filename}.yaml` : `json/${filename}.json`)
		fs.writeFileSync(dest, this.isYaml ? YAML.stringify(this.system) : JSON.stringify(this.system))
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
//										Main 					    	     //
/////////////////////////////////////////////////


const engine = new JsonEngine('./json/system-fig12.json')

engine.execute()
