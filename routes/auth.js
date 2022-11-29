const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcrypt')
const { isLoggedIn ,isNotLoggedIn } = require('./middlewares');
const db = require('../models/index')

router.get('/login', isNotLoggedIn,(req, res, info) => {
  res.render('login.njk', {
    title: '로그인',
    user: req.user
  });
});

router.post('/login', passport.authenticate('local', {failureRedirect: '/auth/login'}), (req, res) => {
  res.redirect('/page/home');
});

router.get('/logout', isLoggedIn,(req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/page/home');
    });
  });
});

router.get('/join', isNotLoggedIn, (req, res) => {
  res.render('join.njk', {
    title: '회원가입',
  })
})

router.post('/join', isNotLoggedIn, async (req, res) => {
  const { name, email, pw } = req.body
  try{
    const exUser = await db.collection('user').findOne({email: email});
    if(exUser) { 
      res.send('이미 존재하는 계정입니다.') 
    } else {
      const hash = await bcrypt.hash(pw, 12) 
      db.collection('user').insertOne({
        name, 
        email, 
        pw: hash,
        imgSrc: "basic"
      });
      db.collection('counter').insertOne({name: email, totalPost:0})
    res.redirect('/page/home')
    }
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;