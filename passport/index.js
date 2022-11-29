const passport = require('passport');
const local = require('./localstrategy');
const db = require('../models/index');

module.exports = () => {
  passport.serializeUser((user, done) => {
    done(null, user.email)
  })
  
  // 로그인한 유저의 개인정보를 DB에서 찾는 역할
  passport.deserializeUser(async (email, done) => {
    const user = await db.collection('user').findOne({email: email})
    try {
      done(null, user)
    } catch (err) {
      console.error(err);
    }
  })

  local();
}

