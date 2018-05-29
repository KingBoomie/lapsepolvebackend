const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

app.get('/db', async (req, res) => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT * FROM test_table');
    res.render('pages/db', result);
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
})

app
  .get('/', (req, res) => res.render('pages/index'))
  .get('/times', (req, res) => {
    let result = ""
    const times = process.env.times || 5
    for (var i = 0; i < times; i++) {
      result += i + " "
      
    }
    res.send(result)
  })

app
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
