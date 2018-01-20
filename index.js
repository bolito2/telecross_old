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
	console.log(pass);
	
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
							res.redirect('/horario?accessToken='+newaccessToken);
						}
					});
				}else{
					console.log("usuario existente");
					var accessToken = result.rows[0].token;
					console.log("Token: "+accessToken);
					accessToken = encodeURIComponent(accessToken);
					res.redirect('/horario?accessToken='+accessToken);
				}
				
			}
		});
	});
	
	
});
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
					var reservas = body;
					sesiones = {'dia' : fechaObj, 'hora': []}
					for(var i = 0; i < reservas.d.zones.length; i++){
						for(var j = 0; j < reservas.d.zones[i].datas.length; j++){
							if(reservas.d.zones[i].datas[j].idActividad == 92874){
								sesiones.hora.push({'time': reservas.d.zones[i].datas[j].hora, 'idHorarioActividad':reservas.d.zones[i].datas[j].idHorarioActividad});
							}
						}
					}
					if(sesiones.dia.length == 0){
						res.send("No hay sesiones de cross para este día");
					}
					else{
						res.render('disponibilidad', {sesiones:sesiones, fecha:fecha, accessToken:accessToken});
					} 
				}
			}
		);
});
app.get('/reservar', function(req, res){
	var sesion = JSON.parse(req.query.sesion);
	var accessToken = req.query.accessToken.toString();
	console.log(sesion);
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
					res.render('reservar', {texto:"Se ha realizado la reserva correctamente, ya puedes comer excrementos humanos tranquilo"});
				}else{
					if(body.Result == 410){
						res.render('reservar', {texto:"Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado esta hora pedazo de n00b"});
					}
					else if(body.Result == 411){
						res.render('reservar', {texto:"Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya has reservado otra actividad esta hora VAYA UN N33B YENDO A ALGO QUE NO ES CROSSFIT"});
					}
					else if(body.Result == 401){
						res.render('reservar', {texto:"Me cago en mis putos excrementos ha habido un error con el código " + body.Result.toString() + " que creo que significa que ya no hay plazas disponibles yororo"});
					}
					else{
						res.render('reservar', {texto:"No se que heces has hecho pero has obtenido un error que no he visto en mi vida con el codigo " + body.Result.toString()});
					}
				}
				
			}
		}
	);
});

var j = schedule.scheduleJob({hour:15, minute:53}, function(expDate){
	console.log('Expected date: ' + expDate);
	console.log('Actual date: ' + new Date());
})