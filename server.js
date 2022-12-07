require('dotenv').config();
const { PORT, COOKIE_SECRET } = process.env;
const methodOverride = require('method-override');
const express = require('express');
const nunjucks = require('nunjucks');
const passport = require('passport');
const passportConfig = require('./passport');
const session = require('express-session');
const app = express();

passportConfig();
app.set('view engine', 'njk')
nunjucks.configure('views', {
  express: app,
  watch: true,
});
app.use(session({
  secret: COOKIE_SECRET,
  resave: true,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

const authRouter = require('./routes/auth')
const pageRouter = require('./routes/page');

app.use('/public', express.static('public'))

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));

app.use('/auth', authRouter);
app.use('/page', pageRouter);

app.get('/', (req, res) => {
  res.redirect('/page/home')
})

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`)
});

module.exports = app;