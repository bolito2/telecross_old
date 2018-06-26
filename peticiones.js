request = require('request');

module.exports = {
	reservar: function(res, sesion, accessToken){
		const options = {
		  method: 'POST',
		  uri: 'http://trainingymapp.com/admin/api/socios/reservas/reservarApp',
		  body: sesion,
		  json: true,
			headers:{
				'content-type': 'application/json',
				'accessToken': accessToken,
				'idCentro': '2394',
				'X-origen': '0'
			}
		}
		
		request(options, function(error, response, body){
			if(error){
				console.log(error);
				res.write(error);
			}else{
				if(res != 0){
					if(body.Result == 0){
						res.write("Reserva instantanea: Se ha realizado la reserva correctamente, ya puedes comer excrementos humanos tranquilo");
					}else{
						if(body.Result == 410){
							res.write("Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya has reservado esta hora pedazo de n00b");
						}
						else if(body.Result == 411){
							res.write("Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya has reservado otra actividad esta hora VAYA UN N33B YENDO A ALGO QUE NO ES CROSSFIT");
						}
						else if(body.Result == 401){
							res.write("Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya no hay plazas disponibles yororo");
						}
						else{
							res.write("Reserva instantanea: No se que heces has hecho pero has obtenido un error que no he visto en mi vida con el codigo " + body.Result.toString());
						}
					}
				}
			}
			if(res != 0)res.end();
		});
	},
	reservarCB: function(cb, sesion, accessToken){
		const options = {
		  method: 'POST',
		  uri: 'http://trainingymapp.com/admin/api/socios/reservas/reservarApp',
		  body: sesion,
		  json: true,
			headers:{
				'content-type': 'application/json',
				'accessToken': accessToken,
				'idCentro': '2394',
				'X-origen': '0'
			}
		}
		
		request(options, function(error, response, body){
			if(error){
				console.log(error);
				cb(error);
			}else{
					if(body.Result == 0){
						cb(0,"Reserva instantanea: Se ha realizado la reserva correctamente, ya puedes comer excrementos humanos tranquilo)");
					}else if(body.Result == 410){
							cb(410,"Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya has reservado esta hora pedazo de n00b)");
						}
						else if(body.Result == 411){
							cb(411, "Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya has reservado otra actividad esta hora VAYA UN N33B YENDO A ALGO QUE NO ES CROSSFIT)");
						}
						else if(body.Result == 401){
							cb(401,"(Reserva instantanea: Me cago en mis putos excrementos ha habido un error con el codigo " + body.Result.toString() + " que creo que significa que ya no hay plazas disponibles yororo)");
						}
						else{
							cb(body.Result, "Reserva instantanea: No se que heces has hecho pero has obtenido un error que no he visto en mi vida con el codigo " + body.Result.toString());
						}
				}
		});
	},
	disponibilidad: function(accessToken, fechaObj, callback){
		request({
			uri: 'http://trainingymapp.com/admin/api/socios/reservas/disponibilidadApp',
			method: 'POST',
			json: true,
			headers: {
				'accessToken': accessToken,
				'idCentro': '2394'
			},
			body:fechaObj
			}, function(error, response, body){
				if(error){
					console.log(error);
				}else{
					callback(body);
				}
			}
		);
	},
	login: function(email, pass, callback){
		const options = {
		  method: 'POST',
		  uri: 'https://trainingymapp.com/tgapi/tgapi.asmx/login?idTgCustom=312',
		  body: {'user':email.toString(), 'pass':pass.toString()},
		  json: true
		}
		
		request(options, function(error, response, body){
				if(error){
					console.log(error);
					callback(error.toString());
				}else{
					if(JSON.parse(body.d.d).Centros.length == 0){
						callback(420);
					}else{
						callback(JSON.parse(body.d.d).Centros[0].accessToken);
					}
				}
			}
		);
	}
}