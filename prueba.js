function reservar(obj){
	esperar(function(){
		console.log(obj)
	})
}

function esperar(cb){
	setTimeout(cb, 1000)
}

reservar({'i': 0})
reservar({'i': 1})