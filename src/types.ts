interface Place {
	id: String ;
	value: Array<String>
}

interface Flow {
	value: String = "" ; 
	from: any ;
	to: any
}

interface Transition {
	id: String ;
	value: Array<String> ;
	inPlaces: Array<String> ;
	outPlaces: Array<String> 
}


export { Place, Transition, Flow }
