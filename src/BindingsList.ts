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

  // This must be call after all variables bindings.
  expandEquation(varName, paramKeyName, userFunction)
  {
    for(const m of this.bindings) {
      m.set(varName, userFunction(m.get(paramKeyName)))
    }
  }

  expandList(varNames:String[], valuesList:String[][]) {
    // Bind first tuple of variables values
    for(const _map of this.bindings) {
      for(let i = 0 ; i < varNames.length ; i++) {
        _map.set(varNames[i], valuesList[0][i])
      }
    }

    // Bind remaining tuples in valuesList
    const oldList = this.bindings
    this.bindings = []

    for(const m of oldList) this.bindings.push(m)

    for(let i = 1 ; i < valuesList.length ; i++) {
      for(const _map of oldList) {
        const newMap:Map<String, String> = new Map(JSON.parse(JSON.stringify(Array.from(_map))))
        for(let j = 0 ; j < varNames.length ; j++) {
          newMap.set(varNames[j], valuesList[i][j])      
        }
        this.bindings.push(newMap)
      }
    }
  }

  toString () {
    if(this.bindings.length === 0) return ""

    // Print keys
    const m0 = this.bindings[0]
    const keys = []
    for(const k of m0.keys()) keys.push(k)

    let str = keys.join(", ") +"\n"

    // Print values
    for(const m of this.bindings) {
      const values = []
      for(const v of m.values()) values.push(v)

      str += values.join(", ") + "\n"
    }

    return str
  }
}


//////////////////////// Example ///////////////////////
let vars = new BindingsList()
vars.expand("y", ["V1", "V2"])
vars.expandList(["x", "z"], [["Alice", "shirt"], ["Bob", "shoes"]])
vars.expandEquation("m", "z", (z) => {
  return ({"shirt":"50 EUR", "shoes":"120 EUR"})[z]
})
console.log(vars.toString())
////////////////////////////////////////////////////////


export {BindingsList}
