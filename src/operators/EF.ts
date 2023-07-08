const fs = require('fs')

class RGTransition {
  name!:string
  target!: ReachableState
}

export class ReachableState {
  data: any[]
  name: string = ''
  outGoingTransition: RGTransition[]=[]
}

export class ExistFinallyOperator {

  example: ReachableState[] = []
  todo: ReachableState[][] = []
  done: ReachableState[] = []

  /**
   * Find a final existing state
   * @param {[type]}   ReachableState start root node of the reachability graph
   * @param {Function} cb callback to test if the current state is the solution
   */
  find(start:ReachableState, cb:Function) { // return bool
    let firstPath = []
    firstPath.push(start)
    this.todo.push(firstPath)

    while(this.todo.length > 0) {
      let currentPath:ReachableState[] = this.todo.shift()
      let currentState:ReachableState = currentPath[currentPath.length-1]

      this.done.push(currentState)

      if(cb(currentState)) {
        // construct the example path
        this.example = currentPath
        
        return true
      }

      // go for successors
      for(let next of currentState.outGoingTransition) {
        if(! this.done.includes(next.target)) {
          let nextPath = [...currentPath] // copy it ?
          nextPath.push(next.target)
          this.todo.push(nextPath)
        }
      }
    }
    return false
  }
}
