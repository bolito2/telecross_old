var pg = require('pg');
var pt = require('./peticiones')

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
							
							pt.disponibilidad(accessToken, fechaObj, function(body){
								for(var i = 0; i < body.d.zones.length; i++){
									for(var j = 0; j < body.d.zones[i].datas.length; j++){
										var data = body.d.zones[i].datas[j];
										if(data.idActividad == 92874 && data.hora.hours == reserva.hora && data.hora.minutes == reserva.minuto){
											var sesion = {'idHorarioActividad':data.idHorarioActividad, "fecha":{"hora":data.hora.hours, "minuto":data.hora.minutes, "ano":ano, "mes":mes, "dia":dia}};
											pt.reservar(0, sesion, accessToken);
										}
									}
								}
							});
						});
					});
					console.log("Reservas acabadas");
				}
			});
		}
	});