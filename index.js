var clientId = process.env.client_id;
var clientSecret = process.env.client_secret;
var redirect_uri = "https://lit-hollows-38242.herokuapp.com";

const express = require('express')
const path = require('path')
const request = require('request')
const socketio = require('socket.io');
const cors = require('cors')


const PORT = process.env.PORT || 5000

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  //ssl: true
});

const whitelist = ['http://localhost:5000', 'http://localhost:8000', 'https://lapsepolvemaagia.netlify.com']
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

const app = express()
app.use(cors(corsOptions))
.use(express.static(path.join(__dirname, 'public')))
.use(express.json())
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs')

const server = require('http').Server(app)
const io = socketio(server)


// set up db listener
var pg_client;
pool.connect()
  .then(client => { client.query('LISTEN newload'); pg_client = client; })
  .then(res => {});

//const query_result = await pg_client.query('LISTEN newload');

// set up socket updating
io.on('connection', (client) => {
  console.log("Client connected");
  client.on('disconnect', () => console.log("client disconnected"));

  client.emit('connected', { connected: true });

  client.on('subscribe-load-counter', () => {
    console.log("client subscribed to load counter");
    
    pg_client.on('notification', (counter) => {
      client.emit('load-count', counter);
    })
    
    pg_client.query('UPDATE realtime SET counter = counter + 1')
    
  })
})



// database test
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

const oauth2 = require('simple-oauth2').create({
  client: {
    id: clientId, 
    secret: clientSecret, 
  },
  auth: {
    tokenHost: 'https://id.smartid.ee',
    tokenPath: '/oauth/access_token',
  }
  //authorizationPath: '/oauth/authorize'
});


// Authorization uri definition
var authorization_uri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: redirect_uri
});


//Make it possible to show the image
app.use(express.static('public'));


// Initial page redirecting to Smart ID 
app.get('/', function (req, res) {
      res.send('<h3>Hello Socket World!</h3>')
});

// Callback service parsing the authorization token and asking for the access token
app.get('/auth', function (req, res) {
  var code = req.query.code;
  var login = req.query.login;
  console.log(code + ", " + login);
  if (typeof code === 'undefined' && typeof login !== 'undefined') {
    console.log("auth uri", authorization_uri)  
    res.redirect(authorization_uri);
      return;
  } else if (typeof code !== 'undefined') {
      oauth2.authorizationCode.getToken({
          code: code,
          redirect_uri: redirect_uri
      }, saveToken);
  } else {
      var url = req.protocol + '://' + req.get('host')
      var pageHtml = '<strong>Click the image below to start login</strong><br>'
              + '<a href="?login=true"><img src="'+url+'/eidas.jpg"></img></a>';
      res.send(pageHtml);
  }


  function saveToken(error, result) {
      if (error) {
          console.log('Access Token Error', error.message);
      }
      console.log("Saving token");
      token = oauth2.accessToken.create(result);
      request({
          url: 'https://id.smartid.ee/api/v2/user_data',
          headers: {
              "Authorization": "Bearer " + token.token.access_token
          }

      }, function (err, userResult) {
          console.log("Got result");
          console.log(userResult.body);
          res.send(userResult.body);
      });
  }

});

app.put('/fingerprint', async (req, res) => {
  //console.log(req.body)
  const q_new_user = {
    text: `INSERT INTO users 
    (device_hash, user_agent, language, color_depth, pixel_ratio, hardware_concurrency, resolution, available_resolution, timezone_offset, session_storage, local_storage, indexed_db, open_database, cpu_class, navigator_platform, do_not_track, regular_plugins, canvas, webgl, adblock, has_lied_languages, has_lied_resolution, has_lied_os, has_lied_browser, touch_support, js_fonts) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
    ON CONFLICT DO NOTHING
    `,
    values: req.body,
  }
  const q_visit = {
    text: "INSERT INTO visits (device_hash) VALUES ($1)", 
    values: [req.body[0]],
  }

  try {
    const client = await pool.connect()
    const result_new = await client.query(q_new_user)
    const result_visit = await client.query(q_visit)
    res.send({new: result_new.rowCount, visit: result_visit.rowCount});
    //console.log(result_new)
    //console.log(result_visit)
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
})

server.listen(PORT, () => console.log(`Listening on ${ PORT }`))
