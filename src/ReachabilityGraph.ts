class State {
  symbolTable: SymbolTable
  certificate: String
  transitions: {name:String, target:State}
}


class ReachabilityGraph {
  StateMap : Map<String, State> = new Map()
}
