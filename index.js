const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/times', (req, res) => {
    let result = ""
    const times = process.env.times || -1
    for (var i = 0; i < times; i++) {
      result += i + " "
      
    }
    res.send(result)
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
