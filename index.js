const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express()

app
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
