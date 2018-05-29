var clientId = process.env.client_id;
var clientSecret = process.env.client_secret;
var redirect_uri = "https://lit-hollows-38242.herokuapp.com";

const express = require('express')
const path = require('path')
const request = require('request')
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



// Authorization uri definition
var authorization_uri = oauth2.authorizationCode.authorizeURL({
  redirect_uri: redirect_uri
});


//Make it possible to show the image
app.use(express.static('public'));


// Initial page redirecting to Smart ID 
app.get('/auth', function (req, res) {

});

// Callback service parsing the authorization token and asking for the access token
app.get('/', function (req, res) {
  var code = req.query.code;
  var login = req.query.login;
  console.log(code + ", " + login);
  if (typeof code === 'undefined' && typeof login !== 'undefined') {
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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
