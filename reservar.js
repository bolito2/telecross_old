 var pg = require('pg');
var pt = require('./peticiones')

var nodemailer = require('nodemailer')

var transporter = nodemailer.createTransport({
  auth: {
    user: 'postmaster@sandboxbfd316c13dde4a9dab861546ffd36ce9.mailgun.org',
    pass: '74df866f81a7c17890f52ca22a3ea34c-116e1e4d-a879b076'
  }
});

var mailOptions = {
  from: 'crossfit-heces@mailgun.org',
  to: 'bolito2hd@gmail.com',
  subject: 'Informe reservas',
  text: 'That was easy!'
};

pg.connect(process.env.DATABASE_URL, function(err, client, done){
		if(err){
			console.log("ERROR AL CONECTAR A LA BASE DE DATOS POR LA NIT");
		}else{
			client.query("SELECT programacion, token, email FROM reservas WHERE programacion NOT LIKE '[]'", function(err, result){
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
											var returnCode = pt.reservar(0, sesion, accessToken);
											
											mailOptions.text = usuario.email+ " a las " + reserva.hora + ":" + reserva.minuto +" con resultado " + returnCode;
											transporter.sendMail(mailOptions, function(error, info){
											  if (error) {
												console.log(error);
											  } else {
												console.log('Email sent: ' + info.response);
											  }
											});
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