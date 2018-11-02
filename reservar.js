var pg = require('pg');
var pt = require('./peticiones')

var nodemailer = require('nodemailer')

var diasDeLaSemana = ['HECES', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

var transporter = nodemailer.createTransport({
		service: 'Mailgun',
		auth: {
			user: 'postmaster@sandboxbfd316c13dde4a9dab861546ffd36ce9.mailgun.org', // postmaster@sandbox[base64 string].mailgain.org
			pass: 'xdloljuisio69' // You set this.
		}
	});

var debug = (process.env.debug == 'true')
var antelacion = parseInt(process.env.antelacion)

var wait_time = 1500

console.log("SCHEDULING RESERVAS WITH ANTELACION = " + antelacion.toString())

if (debug) {
	console.log("DEBUG")

	preparativos()
} else {
	checkTime(antelacion);
}


function checkTime(antelacion) {
	if (new Date().getMinutes() == (60 - antelacion)%60){
		preparativos()
	}
	else {
		setTimeout(checkTime, wait_time*3, antelacion);
	}
}

function getWaitTime(exact_min) {
	let date = new Date()

	if (exact_min % 60 == 0)
		date.setHours(date.getHours() + 1)

		date.setMinutes(exact_min % 60)
		date.setSeconds(0)
		date.setMilliseconds(0)

		console.log(date)

		return date - new Date();
}

//Fecha real española
var realDate;

function preparativos() {
	console.log("Conectando a base de datos");
	pg.connect(process.env.DATABASE_URL, function (err, client, done) {
		if (err) {
			console.log("ERROR AL CONECTAR A LA BASE DE DATOS POR LA NIT");
		} else {
			client.query("SELECT programacion, token, email FROM reservas WHERE programacion NOT LIKE '[]'", function (err, result) {
				done();
				if (err) {
					console.log("ERROR AL EFECTUAR LA QUERY DE LA NIT");
				} else {
					//Calculamos fecha del día siguiente por desfase de hora
					realDate = new Date();
					if (realDate.getHours() > 18)
						realDate.setDate(realDate.getDate() + 1)

					console.log("Real date: " + realDate.getDate())

					result.rows.forEach(function (usuario) {
						//Reservas de cada usuario
						var reservas = []

						//Mail de cada usuario
						var mailOptions = {
							from: 'crossfit-heces@megustacomermierda.com',
							to: usuario.email,
							subject: 'Informe reservas',
							text: []
						}
						//Lol
						if (usuario.email == 'oscar_alvarez62@hotmail.es'){
							mailOptions.to = 'bolito2hd@gmail.com';
						}

						//Número de fallos por usuario
						var num_reservas = {'planeadas':0, 'buscadas': 0, 'disponibles': 0, 'realizadas': 0, 'fallidas': 0}

						//Preparar fecha de cada reserva
						JSON.parse(usuario.programacion).forEach(function (reserva) {
							num_reservas.planeadas++;

							var fechaReserva = new Date(realDate);
							let diferencia = reserva.dia - fechaReserva.getDay();
							if (diferencia <= 0){
								diferencia += 7
							}
							fechaReserva.setDate(fechaReserva.getDate() + diferencia);

							let fechaObj = toFechaObj(fechaReserva)

							reservas[diferencia] = {
								'hora': reserva.hora,
								'minuto': reserva.minuto,
								'fechaObj': fechaObj,
								'dayOfWeek': fechaReserva.getDay(),
								'diferencia': diferencia
							}
						});
						if(reservas[7] == null || reservas[7] == undefined){
							comenzarReservas(usuario, reservas, num_reservas, mailOptions)
						}
						else{
							console.log(reservas[7])
							disponibilidadLoop(usuario, reservas, num_reservas, mailOptions)
						}
					})
				}
			})
		}
	})
}

function disponibilidadLoop(usuario, reservas, num_reservas, mailOptions) {
	//TODO: Protección cambio de horario
	/*
	if (new Date().getSeconds() == 59 && new Date().getMinutes() == exact_min + 2) {
		console.log("<---No se ha podido reservar antes de las 12--->");
		return;
	}
	*/
	console.log('Checking '+ usuario.email)
	pt.disponibilidad(usuario.token, reservas[7].fechaObj, function (body) {
		if (body.d != null && body.d.count > 0) {
			console.log("<---Encontrada disponibilidad para " + usuario.email + "--->")
			comenzarReservas(usuario, reservas, num_reservas, mailOptions)
		}else{
			setTimeout(disponibilidadLoop, wait_time, usuario, reservas, num_reservas, mailOptions)
		}
	})
}
function comenzarReservas(usuario, reservas, num_reservas, mailOptions){
	console.log("<---Comenzando reservas para " + usuario.email + "--->")

	let reservas_disponibles = []
	let sesiones_disponibles = []
	reservas.forEach(function(reserva){
		pt.disponibilidad(usuario.token, reserva.fechaObj, function (body) {
			num_reservas.buscadas++;

			let encontrada = false
			let last_option = null
			if(body.d == null || body.d.count == 0){
				mailOptions.text[reserva.diferencia] = diasDeLaSemana[reserva.dayOfWeek] + " " + reserva.fechaObj.dia + "(" + reserva.hora + ":" + reserva.minuto + "): Este día no hay cross yororo"
				num_reservas.fallidas++
			}
			else{
				for (var i = 0; i < body.d.zones.length; i++) {
					for (var j = 0; j < body.d.zones[i].datas.length; j++) {
						var data = body.d.zones[i].datas[j];
						//Hay cross a esta hora
						if (data.idActividad == 92874){
							let sesion = {
								'idHorarioActividad': data.idHorarioActividad,
								"fecha": {
									"hora": data.hora.hours,
									"minuto": data.hora.minutes,
									"ano": data.yearSelected,
									"mes": data.monthSelected,
									"dia": data.daySelected
								}
							};
							last_option = sesion

							if(data.hora.hours == reserva.hora && data.hora.minutes == reserva.minuto) {
								encontrada = true
								console.log(usuario.email + ": ENCONTRADA: " + JSON.stringify(reserva) + " ---> " + JSON.stringify(sesion))
								num_reservas.disponibles++;

								mailOptions.text[reserva.diferencia] = ''

								reservas_disponibles.push(reserva)
								sesiones_disponibles.push(sesion)
							}
						}
					}
				}
				if (!encontrada) {
					if(last_option == null){
						mailOptions.text[reserva.diferencia] = diasDeLaSemana[reserva.dayOfWeek] + " " + reserva.fechaObj.dia + "(" + reserva.hora + ":" + reserva.minuto + "): Este día no hay cross yororo"
						console.log(usuario.email + ": INEXISTENTE: " + JSON.stringify(reserva))

						num_reservas.fallidas++
					}else{
						mailOptions.text[reserva.diferencia] = diasDeLaSemana[reserva.dayOfWeek] + " " + reserva.fechaObj.dia + "(" + reserva.hora + ":" + reserva.minuto + "): No disponible. Se reservará el ";
						console.log(usuario.email + ": NO ENCONTRADA: " + JSON.stringify(reserva) + " ---> " + JSON.stringify(last_option))

						num_reservas.disponibles++;

						reservas_disponibles.push(reserva)
						sesiones_disponibles.push(last_option)
					}
				}
			}
			console.log('num_reservas.planeadas=' + num_reservas.planeadas.toString())
			if(num_reservas.buscadas == num_reservas.planeadas){
				for(let i = 0; i < num_reservas.disponibles; i++){
					reservarSesion(usuario, reservas_disponibles[i], num_reservas, mailOptions, sesiones_disponibles[i])
				}
			}
		})
	})
}

function reservarSesion(usuario, reserva, num_reservas, mailOptions, sesion) {
	pt.reservarCB(function (code, message) {
		num_reservas.realizadas++

		if(code != 410){
			mailOptions.text[reserva.diferencia] += diasDeLaSemana[reserva.dayOfWeek] + " " + sesion.fecha.dia + "(" + sesion.fecha.hora + ":" + sesion.fecha.minuto + "): " + message
			if(code != 0){
				num_reservas.fallidas++
			}
		}

		console.log("<---Reserva para " + usuario.email.toString() + " terminada --->")
		if(num_reservas.realizadas == num_reservas.disponibles){
			console.log("<---Última reserva para " + usuario.email.toString() + " terminada --->")

			if (num_reservas.fallidas == 1)
				mailOptions.subject = num_reservas.fallidas.toString() + ' RESERVA FALLIDA'
			else
				mailOptions.subject = num_reservas.fallidas.toString() + ' RESERVAS FALLIDAS'

			let final_string = ''
			mailOptions.text.forEach(function(line){
				final_string += line + '\n'
			})
			mailOptions.text = final_string

			if (!debug || usuario.email == 'oscar_alvarez62@hotmail.es') {
				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
			}
		}
	}, sesion, usuario.token);
}

function toFechaObj(fecha) {
	var dia = fecha.getDate();
	if (dia < 10)
		dia = '0' + dia.toString();
	else
		dia = dia.toString();

	var mes = fecha.getMonth() + 1;
	if (mes < 10)
		mes = '0' + mes.toString();
	else
		mes = mes.toString();

	var ano = fecha.getFullYear().toString();

	return {
		"mes": mes,
		"dia": dia,
		"ano": ano
	};
}
