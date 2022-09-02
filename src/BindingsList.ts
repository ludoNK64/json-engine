class BindingsList {
  bindings:Map<String,String>[] = []

  expand(varName:String, valueList:String[]) {
    if(this.bindings.length === 0) {
      for(const v of valueList) {
        const newMap:Map<String, String> = new Map()
        newMap.set(varName, v)
        this.bindings.push(newMap)
      }
    } else {
      const oldList = this.bindings
      this.bindings = []
      for(const oldMap of oldList) {
        for(const v of valueList) {
          const newMap:Map<String, String> = new Map(JSON.parse(JSON.stringify(Array.from(oldMap)))) // clone
          newMap.set(varName, v)
          this.bindings.push(newMap)
        }
      }
    }
  }

  expandEquation(symbolTable, varName, userFunction)
  {
    const oldBindings = this.bindings 
    this.bindings = []

    for(const oldMap of oldBindings) {
      const values:String[] = userFunction(symbolTable, oldMap, varName)
      for(const v of values) {
        // ...
        break
      }
    }
  }

  expandList(varNames:String[], valuesList:String[][]) {
    for(let i = 0 ; i < varNames.length ; i++) {
      const valueList = [valuesList[0][i]]
      for(let j = 1 ; j < valuesList.length ; j++) {
        valueList.push(valuesList[j][i])
      }
      this.expand(varNames[i], valueList)
    }
  }

  toString () {
    if(this.bindings.length === 0) return ""

    // Print keys
    const m0 = this.bindings[0]
    const keys = []
    for(const k of m0.keys()) keys.push(k)

    console.log(keys.join(", "))

    // Print values
    for(const m of this.bindings) {
      const values = []
      for(const v of m.values()) values.push(v)

      console.log(values.join(", "))
    }
  }
}


//////////////////////// Example ///////////////////////
let vars = new BindingsList()
vars.expand("y", ["V1", "V2"])
vars.expandList(["x", "z"], [["Alice", "shirt"], ["Bob", "shoes"]])
console.log(vars.toString())
////////////////////////////////////////////////////////


export {BindingsList}
