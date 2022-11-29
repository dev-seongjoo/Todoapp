const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt')

const db = require('../models/index')

module.exports = () => {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, async (email, pw, done) => {
    try {
    const user = await db.collection('user').findOne({email: email});
    if (!user) { return done(null, false, { message: 'Incorrect username or password.' }, console.log('Incorrect email.')) }
    const hash = user.pw;
    const result = await bcrypt.compare(pw, hash)
    if(!result) {
      return done(null, false, { message: 'Incorrect username or password.' }, console.log('Incorrect password.'));
    }  
    return done(null, user)
    } catch {
      if (err) { return done(err); }
    }
    }));
}

