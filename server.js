require('dotenv').config()
const express = require('express')
const app = express();
const ejs = require('ejs')
const path = require('path')
const expressLayout = require('express-ejs-layouts')
const PORT = process.env.PORT || 3300;
const mongoose = require('mongoose')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('express-flash')
const MongoDbStore = require('connect-mongo')(session)
const passport = require('passport')
const Emitter = require('events')
const secret = require('./app/config/secret')


//database connection
const url = 'mongodb://localhost/pizza';
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once('open', () => {
    console.log('Database-Connnection-Successfull...');
})
// .catch(err => {
//     console.log('Connection-Failed...')
// });


let mongoStore = new MongoDbStore({
    mongooseConnection: connection,
    collection: "sessions"
})

//event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//session-config
app.use(cookieParser())
app.use(session({
    secret: secret.secretKey,
    resave: true,
    saveUninitialized: true,
    store: mongoStore,
    
    cookie: { maxAge: 1000 * 60 * 60 * 24} // 24 hours
}))

//passport config
const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

// use flash as middleware
app.use(flash())


//ASSET 
//WHERE ARE THEY(ASSET)
// app.use(express.static('public'))

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

//global middleware
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

app.use



// set template engine 
app.use(expressLayout)
app.set('views', path.join(__dirname, '/resource/views'))
app.set('view engine', 'ejs')

require('./routes/web')(app)
app.use((req, res) => {
    res.status(404).render('errors/404')
})

const server = app.listen(PORT, () => {
    console.log("listening on port 3300")
})


const io = require('socket.io')(server)
io.on('connection', (socket) => {
    //join 
    // console.log(socket.id)
    socket.on('join', (orderId) => {
        socket.join(orderId)
    })

})


eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})


eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})

