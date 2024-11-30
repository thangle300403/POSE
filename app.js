const express = require('express');
const ejsLayout = require('express-ejs-layouts');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser')

// Create an Express application
const app = express();
const hostname = '127.0.0.1';
const port = 3069;

// Set the layout
app.use(ejsLayout);

//import global helpers to the whole project
const helpers = require('./utils/helpers');
app.locals.helpers = helpers;
app.use(cookieParser())

// Set the views directory
app.set('views', './views');

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Set the static files directory
app.use(express.static(path.join(__dirname, 'public')));

// Enable body-parser middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var fileStoreOptions = {};
app.use(session({
    store: new FileStore(fileStoreOptions),
    secret: 'sinra tensei',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: false },
}))

// Define routes
const indexRouter = require('./routers/IndexRouter');
const adminRouter = require('./routers/AdminRouter');

//middleware
app.use((req, res, next) => {
    app.locals.currentRoute = helpers.getCurrentRoute(req.path);
    app.locals.uploadDir = __dirname + '/public/images';
    app.locals.session = req.session;
    next();
})

//router start here
app.use('/', indexRouter);
app.use('/admin', adminRouter);

// Start the server
app.listen(port, hostname, () => {
    console.log(`Running on port ${hostname}:${port}`);
});
