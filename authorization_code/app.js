require("dotenv").config({ path: __dirname + "/../../.env" })
const {
  CLIENT_ID,
  REDIRECT_URI,
  CLIENT_SECRET,
  REACT_APP_URL,
  SPOTIFY_PORT,
} = process.env
var express = require("express") // Express web server framework
var request = require("request") // "Request" library
// var cors = require("cors")
var querystring = require("querystring")
var cookieParser = require("cookie-parser")

var client_id = CLIENT_ID // Your client id
var client_secret = CLIENT_SECRET // Your secret
var redirect_uri = REDIRECT_URI // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = ""
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

var stateKey = "spotify_auth_state"

var app = express()

app.use(express.static(__dirname + "/public")).use(cookieParser())

app.get("/login", function (req, res) {
  var state = generateRandomString(16)
  res.cookie(stateKey, state)

  // your application requests authorization
  const scope =
    "user-read-private user-read-email user-read-playback-state user-modify-playback-state playlist-read-collaborative playlist-modify-public playlist-read-private playlist-modify-private"
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id,
        scope,
        redirect_uri,
        state,
      })
  )
})

app.get("/callback", (req, res) => {
  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null
  const state = req.query.state || null
  const storedState = req.cookies ? req.cookies[stateKey] : null

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    )
  } else {
    res.clearCookie(stateKey)
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    }

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token,
          refresh_token = body.refresh_token

        const options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        }

        // use the access token to access the Spotify Web API
        request.get(options, (error, response, body) => {
          console.log(body)
        })

        // we can also pass the token to the browser to make requests from there
        res.redirect(
          REACT_APP_URL +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
            })
        )
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        )
      }
    })
  }
})

app.get("/refresh_token", function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token,
    },
    json: true,
  }

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token
      res.send({ access_token })
    }
  })
})

// console.log("Listening on 8888")
app.listen(SPOTIFY_PORT, () =>
  console.log(`Spotify API server listeningon ${SPOTIFY_PORT}`)
)
