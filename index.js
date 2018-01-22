const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var request = require('request')
var app = express()
var schedule = require('node-schedule')
var pg = require('pg');

app
	.set('view engine', 'ejs')
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));
	
app.use(express.json());
app.use(express.urlencoded());

app.get('/', function(req, res){
	res.render('index');
});
	
function login(email, pass, callback){
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
app.get('/horario', function(req, res){
	accessToken = req.query.accessToken.toString();
	console.log("Cargando horario");
	res.render('horario', {accessToken:accessToken});
});
	
app.post('/login', function(req, res){
	email = req.body.email;
	pass = req.body.pass;
	
	console.log(email);
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query("SELECT * FROM reservas WHERE email LIKE '"+email.toString()+"' AND pass LIKE '"+pass.toString()+"'", function(err, result) {
			done();
			if (err)
			{ console.error(err); res.send("Error " + err); }
			else
			{ 
				if(result.rows.length == 0){
					console.log("nuevo usuario");
					login(email, pass, function(newaccessToken){
						if(newaccessToken == 420){
							res.send("USUARIO O CONTRASEÑA INCORRECTA");
						}else{
							console.log("Token: "+newaccessToken);
							client.query("INSERT INTO reservas(email, pass, token) VALUES ('"+email.toString()+"','"+pass.toString()+"','"+newaccessToken.toString()+"')", function(err2, result2){
								if(err2){
									console.log("error metiendo al usuario");
									console.log(err2);
								}
							});
							
							newaccessToken = encodeURIComponent(newaccessToken);
							return res.redirect('/horario?accessToken='+newaccessToken);
						}
					});
				}else{
					console.log("usuario existente");
					var accessToken = result.rows[0].token;
					console.log("Token: "+accessToken);
					accessToken = encodeURIComponent(accessToken);
					return res.redirect('/horario?accessToken='+accessToken);
				}
				
			}
		});
	});
	
	
});
function disponibilidad(accessToken, fechaObj, callback){
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
}

app.get('/borrarProg', function(req, res){
	var accessToken = req.query.accessToken;
	var programacion = JSON.parse(req.query.programacion);
	var index = req.query.Submit;
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done){
		if(err){
			console.log("Error al conectar a la base de datos para borrar una reserva programada");
			res.send("Error al conectar a la base de datos para borrar una reserva programada, te jodes y vas a crossfit");
		}else{
			programacion.splice(index, 1);
			client.query("UPDATE reservas SET programacion = '" + JSON.stringify(programacion) + "' WHERE token = '" + accessToken + "'", function(err, result){
				if(err){
					console.log("Error al intentar borrar una reserva programada");
					res.send("Error al intentar borrar una reserva programada, te jodes y vas a crossfit");
				}else{
					console.log("Se ha borrado la reserva");
					res.send("Se ha borrado la reserva, ya puedes viciar al lol tranquilo pedazo de pussy");
				}
			});
		}
	});
});

function sortProg(a, b){
	return a.dia - b.dia;
}

app.get('/programacion', function(req, res){
	var accessToken = req.query.accessToken;
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done){
		if(err){
			console.log("Error al conectar a la base de datos para ver reservas programadas");
			res.send("Error al conectar a la base de datos para ver reservas programadas");
		}else{
			client.query("SELECT programacion FROM reservas WHERE token LIKE '" + accessToken + "'", function(err, result){
				done();
				if(err){
					console.log("Error al intentar ver reservas programadas");
					res.send("Error al intentar ver reservas programadas");
				}else{
					var convertTable = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
					
					res.render('programacion', {programacion:JSON.parse(result.rows[0].programacion), convertTable:convertTable, accessToken:accessToken});
				}
			});
		}
	});
})

app.get('/disponibilidad', function(req, res){
		var index = parseInt(req.query.fecha);
		var accessToken = req.query.accessToken.toString();
		
		var fecha = new Date();
		fecha.setDate(fecha.getDate() + index)
		
		var dia = fecha.getDate();
		if(dia < 10)dia = '0' + dia.toString();
		else dia = dia.toString();
		
		var mes = fecha.getMonth() + 1;
		if(mes < 10)mes = '0' + mes.toString();
		else mes = mes.toString();
		
		var ano = fecha.getFullYear().toString();
		
		var fechaObj = {"mes":mes,"dia":dia,"ano":ano};
		console.log(fechaObj);
		
		//Ver reservas
		disponibilidad(accessToken, fechaObj, function(body){
			var reservas = body;
					sesiones = {'dia' : fechaObj, 'hora': []}
					for(var i = 0; i < reservas.d.zones.length; i++){
						for(var j = 0; j < reservas.d.zones[i].datas.length; j++){
							if(reservas.d.zones[i].datas[j].idActividad == 92874){
								sesiones.hora.push({'time': reservas.d.zones[i].datas[j].hora, 'idHorarioActividad':reservas.d.zones[i].datas[j].idHorarioActividad});
							}
						}
					}
					if(sesiones.hora.length == 0){
						res.send("No hay sesiones de cross para este día, puedes viciar al lol sin remordimientos");
					}
					else{
						res.render('disponibilidad', {sesiones:sesiones, fecha:fecha, accessToken:accessToken});
					} 
		});
});
function reservares(res, sesion, accessToken){
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
				if(body.Result == 0){
					res.write("Se ha realizado la reserva correctamente, ya puedes comer excrementos humanos tranquilo");
				}else{
					if(body.Result == 410){
						res.write("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado esta hora pedazo de n00b");
					}
					else if(body.Result == 411){
						res.write("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado otra actividad esta hora VAYA UN N33B YENDO A ALGO QUE NO ES CROSSFIT");
					}
					else if(body.Result == 401){
						res.write("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya no hay plazas disponibles yororo");
					}
					else{
						res.write("No se que heces has hecho pero has obtenido un error que no he visto en mi vida con el codigo " + body.Result.toString());
					}
				}
			}
			res.end();
		}
	);
}
function reservar(sesion, accessToken){
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
			}else{
				if(body.Result == 0){
					console.log("Se ha realizado la reserva correctamente, ya puedes comer excrementos humanos tranquilo");
				}else{
					if(body.Result == 410){
						console.log("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado esta hora pedazo de n00b");
					}
					else if(body.Result == 411){
						console.log("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado otra actividad esta hora VAYA UN N33B YENDO A ALGO QUE NO ES CROSSFIT");
					}
					else if(body.Result == 401){
						console.log("Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya no hay plazas disponibles yororo");
					}
					else{
						console.log("No se que heces has hecho pero has obtenido un error que no he visto en mi vida con el codigo " + body.Result.toString());
					}
				}
			}
		}
	);
}

app.get('/reservar', function(req, res){
	var sesion = JSON.parse(req.query.sesion);
	var accessToken = req.query.accessToken.toString();
	var repetir = req.query.repetir;
	
	console.log(sesion);
	
	if(repetir == 'yee' || repetir == 'nein'){
		pg.connect(process.env.DATABASE_URL, function(err, client, done){
			if(err){
				console.log("Error al conectarse a la base de datos:" + err);
				res.send("Error al conectarse a la base de datos:" + err);
			}
			else{
				client.query("SELECT programacion FROM reservas WHERE token LIKE '"+accessToken + "'", function(err, result){
					done();
					if(err){
						console.log("Error al programar la reserva:" + err);
						res.write("Error al programar la reserva:" + err + "\n");
						reservares(res, sesion, accessToken);
					}else{
						var programacion = JSON.parse(result.rows[0].programacion);
						var index = -1;
						for(var i = 0; i < programacion.length; i++){
							var evento = programacion[i];
							var mes = parseInt(sesion.fecha.mes) -1;
							if(mes < 0)mes += 12;
							var fechaSesion = new Date(sesion.fecha.ano, mes, sesion.fecha.dia);
							if(evento.hora == sesion.fecha.hora && evento.minuto == sesion.fecha.minuto &&
							evento.dia == fechaSesion.getDay()){
								index = i;
								console.log("repe");
								break;
							}
						}
						if(index != -1){
							if(repetir == 'yee'){
								res.write("Ya tienes programada esta reserva n00b\n");
								reservares(res, sesion, accessToken);
								
							}else{
								programacion.splice(index, 1);
								console.log(programacion);
								programacion = JSON.stringify(programacion);
								client.query("UPDATE reservas SET programacion='" + programacion + "' WHERE token LIKE '" + accessToken + "'", function(err, result){
									done();
									if(err){
										console.log("Error al quitar la reserva:" + err);
										res.write("Error al quitar la reserva:" + err+ "\n");
									}else{
										res.write("Se ha desprogramado la reserva pedazo de pussy, ya puedes viciarte al lol tranquilo\n");
									}
									res.end();
								});
							}	
						}else{
							if(repetir == 'yee'){
								var mes = parseInt(sesion.fecha.mes) -1;
								if(mes < 0)mes += 12;
								var fechaProg = new Date(sesion.fecha.ano, mes, sesion.fecha.dia, 1, 0 ,0 ,0);
								var newProg = {'dia':fechaProg.getDay(), 'hora':sesion.fecha.hora, 'minuto':sesion.fecha.minuto};
								programacion.push(newProg);
								programacion.sort(sortProg);
								console.log(programacion);
								programacion = JSON.stringify(programacion);
								
								client.query("UPDATE reservas SET programacion='" + programacion + "' WHERE token LIKE '"+ accessToken + "'", function(err, result){
									done();
									if(err){
										console.log("Error al programar la reserva:" + err);
										res.write("Error al programar la reserva:" + err+ "\n");
									}else{
										res.write("Se ha programado la reserva correctamente, a ver si es verdad que vienes a esta sesion todas las semanas\n");
									}
									reservares(res, sesion, accessToken);
								});
							}else{
								res.write("No tienes esta reserva programada n33b\n");
								res.end();
							}
						}
					}
				});
			}
		});
	}else{
		reservares(res, sesion, accessToken);
	}
});

var j = schedule.scheduleJob({hour:00, minute:15}, function(expDate){
	console.log('Expected date: ' + expDate);
	console.log('Actual date: ' + new Date());
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done){
		if(err){
			console.log("ERROR AL CONECTAR A LA BASE DE DATOS POR LA NIT");
		}else{
			client.query("SELECT programacion, token FROM reservas WHERE programacion NOT LIKE '[]'", function(err, result){
				done();
				if(err){
					console.log("ERROR AL EFECTUAR LA QUERY DE LA NIT");
				}else{
					result.rows.forEach(function(usuario){
						var accessToken = usuario.token;
						JSON.parse(usuario.programacion).forEach(function(reserva){
							var fechaReserva = new Date();
							var diferencia = reserva.dia - fechaReserva.getDay();
							if(diferencia > 0)fechaReserva.setDate(fechaReserva.getDate() + diferencia);
							else fechaReserva.setDate(fechaReserva.getDate() + diferencia + 7);
							
							var dia = fechaReserva.getDate();
							if(dia < 10)dia = '0' + dia.toString();
							else dia = dia.toString();
							
							var mes = fechaReserva.getMonth() + 1;
							if(mes < 10)mes = '0' + mes.toString();
							else mes = mes.toString();
							
							var ano = fechaReserva.getFullYear().toString();
							
							var fechaObj = {"mes":mes,"dia":dia,"ano":ano};
							
							disponibilidad(accessToken, fechaObj, function(body){
								for(var i = 0; i < body.d.zones.length; i++){
									for(var j = 0; j < body.d.zones[i].datas.length; j++){
										var data = body.d.zones[i].datas[j];
										if(data.idActividad == 92874 && data.hora.hours == reserva.hora && data.hora.minutes == reserva.minuto){
											var sesion = {'idHorarioActividad':data.idHorarioActividad, "fecha":{"hora":data.hora.hours, "minuto":data.hora.minutes, "ano":ano, "mes":mes, "dia":dia}};
											reservar(sesion, accessToken);
										}
									}
								}
							});
						});
					});
				}
			});
		}
	});
})