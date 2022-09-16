export interface State {
  done: Boolean
  data: Array<any>
  certificate: String
  transition: {name:String, src:State}
}


export class ReachabilityGraph {
  StateMap : Map<String, State> = new Map()

  add(hash:String, state:State) {
    this.StateMap.set(hash, state)
  }

  has(hash:String) {
    return this.StateMap.has(hash)
  }

  values() {
    return this.StateMap.values()
  }

  size() {
    return this.StateMap.size
  }
}
