 var pg = require('pg');
var pt = require('./peticiones')

var nodemailer = require('nodemailer')

var diasDeLaSemana = ['sudapo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

var transporter = nodemailer.createTransport({
  service: 'Mailgun',
    auth: {
      user: 'postmaster@sandboxbfd316c13dde4a9dab861546ffd36ce9.mailgun.org', // postmaster@sandbox[base64 string].mailgain.org
      pass: 'xdloljuisio69' // You set this.
    }
});

var debug = false
var mailOptions = []

console.log("SCHEDULING RESERVAS")
//setTimeout(hacerReservas, Math.floor(Math.random()*30000) + 30000)

var exact_min = 00

checkTime();

if(exact_min == 00)exact_min = 60

if(debug)console.log("DEBUG")

function checkTime(){
	let date = new Date();
	if(date.getMinutes() == exact_min - 1){
		if(exact_min == 60)date.setHours(date.getHours() + 1)
		date.setMinutes(exact_min%60)
		date.setSeconds(0)
		date.setMilliseconds(0)
		
		console.log(date)
		
		setTimeout(hacerReservas, date - new Date());
	}
	else setTimeout(checkTime, 3000);
}



function hacerReservas(){
	console.log("EMPEZANDO RESERVAS con estos milli: " + new Date().getMilliseconds().toString());
	pg.connect(process.env.DATABASE_URL, function(err, client, done){
			if(err){
				console.log("ERROR AL CONECTAR A LA BASE DE DATOS POR LA NIT");
			}else{
				client.query("SELECT programacion, token, email FROM reservas WHERE programacion NOT LIKE '[]'", function(err, result){
					done();
					if(err){
						console.log("ERROR AL EFECTUAR LA QUERY DE LA NIT");
					}else{
						
						realDate = new Date();
						if(realDate.getHours() > 8)realDate.setDate(realDate.getDate() + 1)
						console.log("Real date: " + realDate.getDate())
					
						var reservas_fallidas = []
						var reservas_index = []
						var idHorario = []
					
						result.rows.forEach(function(usuario){
							
							mailOptions[usuario.email] = {
							  from: 'crossfit-heces@megustacomermierda.com',
							  to: 'bolito2hd@gmail.com',
							  subject: 'Informe reservas',
							  text: 'RESERVAS CORRECTAS:\n\n'
							}
							
							mailOptions[usuario.email].to = usuario.email;
							if(usuario.email == 'oscar_alvarez62@hotmail.es')mailOptions[usuario.email].to = 'bolito2hd@gmail.com';
							
							var accessToken = usuario.token;
							
							reservas_fallidas[usuario.email] = 0
							reservas_index[usuario.email] = 0
							
							let reservas_parsed = JSON.parse(usuario.programacion)
							
							reservas_parsed.forEach(function(reserva){
								var fechaReserva = new Date(realDate);
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
								var encontrada = false;
								
								pt.disponibilidad(accessToken, fechaObj, function(body){
									var info = "-realdate: "+ realDate.getDate() + ",dayofweek: " + realDate.getDay() +",diferencia: " + diferencia + ", idCrossfit: 92874\n\n";						
									
									for(var i = 0; i < body.d.zones.length; i++){
										for(var j = 0; j < body.d.zones[i].datas.length; j++){
											var data = body.d.zones[i].datas[j];
											
											info += '-idActividad: ' + data.idActividad + ', hora actividad: ' + data.hora.hours + ':' + data.hora.minutes +', idHorarioActividad: '+ data.idHorarioActividad.toString() + '\n';
											
											if(data.idActividad == 92874 && data.hora.hours == reserva.hora && data.hora.minutes == reserva.minuto){
												encontrada = true;
												
												if(usuario.email == 'oscar_alvarez62@hotmail.es')idHorario.push(data.idHorarioActividad)
												
												var sesion = {'idHorarioActividad':data.idHorarioActividad, "fecha":{"hora":data.hora.hours, "minuto":data.hora.minutes, "ano":ano, "mes":mes, "dia":dia}};
												pt.reservarCB(function(code, message){
													if(code != 0 && code != 410){
														mailOptions[usuario.email].text = "La reserva del "+ diasDeLaSemana[reserva.dia] + " " + dia + " a las " + reserva.hora + ":" + reserva.minuto +" ha fallado con el siguiente mensaje:\n" + message + "\n_______________________\n\n" + mailOptions[usuario.email].text;
														reservas_fallidas[usuario.email]++
													}
													if(code == 0){
														mailOptions[usuario.email].text += "La reserva del "+ diasDeLaSemana[reserva.dia] + " " + dia + " a las " + reserva.hora + ":" + reserva.minuto +" se ha realizado correctamente con el siguiente mensaje:\n" + message + "\n_______________________\n\n";
													}
													console.log("Reserva #" + reservas_index[usuario.email].toString() + ": " + new Date().getMilliseconds().toString())
													if(reservas_index[usuario.email] == reservas_parsed.length - 1){
															console.log("Reservas acabadas para " + usuario.email.toString());
															console.log(idHorario)
															
															mailOptions[usuario.email].text = "RESERVAS FALLIDAS: \n\n" + mailOptions[usuario.email].text;
															
															if(reservas_fallidas[usuario.email] == 1)mailOptions[usuario.email].subject = reservas_fallidas[usuario.email].toString() + ' RESERVA FALLIDAS'
															else mailOptions[usuario.email].subject = reservas_fallidas[usuario.email].toString() + ' RESERVAS FALLIDAS'
																
															if(!debug || usuario.email == 'oscar_alvarez62@hotmail.es'){
																transporter.sendMail(mailOptions[usuario.email], function(error, info){
																	if (error) {
																		console.log(error);
																	} else {
																		console.log('Email sent: ' + info.response);
																	}
																});
															}
													
														}
														reservas_index[usuario.email]++
												}, sesion, accessToken);
												break;
											}
										}
									}
									if(!encontrada){
										mailOptions[usuario.email].text = "La reserva del "+ diasDeLaSemana[reserva.dia] + " " + dia + " a las " + reserva.hora + ":" + reserva.minuto +" ha fallado ya que no existe. Igual está cerrado el gym o han cambiado la hora.\n\n\nInfo extra de reservas disponibles ese día:\n\n"+info+"\n_______________________\n\n" + mailOptions[usuario.email].text;
										
										reservas_fallidas[usuario.email]++
										
										console.log("Reserva #" + reservas_index[usuario.email].toString() + ": " + new Date().getMilliseconds().toString())
										if(reservas_index[usuario.email] == reservas_parsed.length - 1 && reservas_fallidas[usuario.email] > 0){

											console.log("Reservas acabadas para " + usuario.email.toString());
											console.log(idHorario)
										
											if(reservas_fallidas[usuario.email] == 1)mailOptions[usuario.email].subject = reservas_fallidas[usuario.email].toString() + ' RESERVA FALLIDAS'
											else mailOptions[usuario.email].subject = reservas_fallidas[usuario.email].toString() + ' RESERVAS FALLIDAS'
												
											mailOptions[usuario.email].text = "RESERVAS FALLIDAS: \n\n" + mailOptions[usuario.email].text;
										
											if(!debug || usuario.email == 'oscar_alvarez62@hotmail.es'){
																transporter.sendMail(mailOptions[usuario.email], function(error, info){
																	if (error) {
																		console.log(error);
																	} else {
																		console.log('Email sent: ' + info.response);
																	}
																});
															}
										}
										reservas_index[usuario.email]++
									}
								});
							});
						});
					}
				});
			}
		});
}