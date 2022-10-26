const fs = require('fs')

interface ReachableState {
  id:String,
  successors:ReachableState[]
}



class ExistFinallyOperator {

  example: ReachableState[] = []
  todo: ReachableState[][] = []
  done: ReachableState[] = []

  /**
   * Find a final existing state
   * @param {[type]}   ReachableState start         root node of the reachability graph
   * @param {Function} cb             callback to test if the current state is the solution
   */
  find(start:ReachableState, cb:Function) { // return bool
    let firstPath = []
    firstPath.push(start)
    todo.push(firstPath)

    while(todo.length > 0) {
      let currentPath = todo.unshift()
      let currentState:ReachableState = currentPath[currentPath.length-1]

      done.push(currentState)

      if(cb(currentState)) {
        // construct the example path
        example = currentPath
        
        return true
      }

      // go for successors
      for(let next of currentState.successors) {
        if(! done.includes(next)) {
          let nextPath = [...currentPath] // copy it ?
          nextPath.push(next)
          todo.push(nextPath)
        }
      }
    }
    return false
  }
}



//////////


let states:ReachableState[] = []

try {
  const json = JSON.parse( fs.readFileSync(jsonPath, 'utf8') )
  json.forEach(el => {
    states.push({
      id: el.id,
      successors: []//?
    })
  })
}

const fn = (state:ReachableState) => {
  // Read file by using its id
  return true
}

const initState = states.filter(el => el.id === 'system')[0]

new EF().find(initState, fn)
