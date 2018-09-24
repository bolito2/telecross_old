var pt = require('./peticiones')

	var sesion = {
	'idHorarioActividad': '453212',
	"fecha": {
		"hora": '10',
		"minuto": '00',
		"ano": '2018',
		"mes": '09',
		"dia": '29'
	}
};
var accessToken ='eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZFVzZXIiOjgxODMwNDMsInRva2VuVHlwZSI6MCwiZGF0ZUNyZWF0aW9uIjoiMjAxOC0wMS0yMyAxNjowNjoxOSIsImV4cCI6MTgzMjA4MzU3OSwidG9rZW4iOiI0MGE0MjZjYy02YTgyLTQxZTEtYTc2My0wZjEzOGZmOTk4NDAifQ.XP2mC5ONJ5y2tUbXq45AbcRia7ecYN0kriD9akloTzo'

pt.reservarCB(function (code, message) {
	console.log(code)
	console.log(message)
	
}, sesion, accessToken)
