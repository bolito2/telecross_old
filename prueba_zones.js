var pt = require('./peticiones')

var fechaObj = {
  'mes' : '11',
  'dia': '05',
  'ano': '2018'
}

console.log(fechaObj)

pt.disponibilidad(process.env.token_pruebas, fechaObj, function(body){
console.log(body.d.count > 0)
  for(var i = 0; i < body.d.zones.length; i++){
    for(var j = 0; j < body.d.zones[i].datas.length; j++){
      if(body.d.zones[i].datas[j].idActividad == 92874){
        //console.log(body.d.zones[i].datas[j])
        //console.log('+++++++++++++++++++++++++++++++')
      }
    }
  }
})
