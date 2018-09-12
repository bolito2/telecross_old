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

var mailOptions = {
  from: 'crossfit-heces@megustacomermierda.com',
  to: 'bolito2hd@gmail.com',
  subject: 'Informe reservas',
  text: 'That was easy!'
};

console.log("SCHEDULING RESERVAS")
//setTimeout(hacerReservas, Math.floor(Math.random()*30000) + 30000)
hacerReservas();

function hacerReservas(){
	console.log("EMPEZANDO RESERVAS");
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
						console.log(realDate.getDate())
						if(realDate.getHours() > 8)realDate.setDate(realDate.getDate() + 1)
						console.log(realDate.getDate())
						result.rows.forEach(function(usuario){
							var accessToken = usuario.token;
							JSON.parse(usuario.programacion).forEach(function(reserva){
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
									var info = "-realdate: "+ realDate.getDate() + ",dayofweek: " + realDate.getDay() +",diferencia: " + diferencia + "\n\n";
									for(var i = 0; i < body.d.zones.length; i++){
										for(var j = 0; j < body.d.zones[i].datas.length; j++){
											var data = body.d.zones[i].datas[j];
											
											info += '-idActividad: ' + data.idActividad + ', hora actividad: ' + data.hora.hours + ':' + data.hora.minutes + '\n';
											
											if(data.idActividad == 92874 && data.hora.hours == reserva.hora && data.hora.minutes == reserva.minuto){
												encontrada = true;
												var sesion = {'idHorarioActividad':data.idHorarioActividad, "fecha":{"hora":data.hora.hours, "minuto":data.hora.minutes, "ano":ano, "mes":mes, "dia":dia}};
												pt.reservarCB(function(code, message){
													if(code != 0 && code != 410){
														mailOptions.to = usuario.email;
														if(usuario.email == 'oscar_alvarez62@hotmail.es')mailOptions.to = 'bolito2hd@gmail.com';
														mailOptions.text = "La reserva del "+ diasDeLaSemana[reserva.dia] + " " + dia + " a las " + reserva.hora + ":" + reserva.minuto +" ha fallado con el siguiente mensaje:\n" + message;
														transporter.sendMail(mailOptions, function(error, info){
														  if (error) {
															console.log(error);
														  } else {
															console.log('Email sent: ' + info.response);
														  }
														});
													}
												}, sesion, accessToken);
											}
										}
									}
									if(!encontrada){
										mailOptions.to = usuario.email;
										if(usuario.email == 'oscar_alvarez62@hotmail.es')mailOptions.to = 'bolito2hd@gmail.com';
										mailOptions.text = "La reserva del "+ diasDeLaSemana[reserva.dia] + " " + dia + " a las " + reserva.hora + ":" + reserva.minuto +" ha fallado ya que no existe. Igual está cerrado el gym o han cambiado la hora.\n\n\nInfo extra de reservas disponibles ese día:\n"+info;
										transporter.sendMail(mailOptions, function(error, info){
											if (error) {
												console.log(error);
											} else {
												console.log('Email sent: ' + info.response);
											}
										});
									}
								});
							});
						});
						console.log("Reservas acabadas");
					}
				});
			}
		});
}