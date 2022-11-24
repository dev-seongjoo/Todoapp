require('dotenv').config();
const { PORT, MONGO_URI, COOKIE_SECRET } = process.env;
const methodOverride = require('method-override');
const express = require('express');
const { MongoClient } = require("mongodb");
const client = new MongoClient(MONGO_URI);
client.connect(console.log('connecting on MongoDB'));
const db = client.db('todoapp');
const nunjucks = require('nunjucks');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

const app = express();
app.set('view engine', 'njk')
nunjucks.configure('views', {
  express: app,
  watch: true,

});
app.use('/public', express.static('public'))
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(session({
  secret:COOKIE_SECRET,
  resave: true,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());



app.get('/', (req,res) => {
  res.render('index.njk', {
    title: '오늘의 할 일'
  })
});

app.get('/login', (req, res) => {
  res.render('login.njk', {
    title: '로그인'
  })
})

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login'
}), async (req, res)=> {
  const result = await db.collection('user').findOne({email: req.body.email, pw: req.body.pw}, console.log('확인 완료'));
  console.log(result)
  res.redirect('/')
})

app.get('/about', (req, res) => {
  res.render('about.njk', {
    title: "오늘의 할 일 이란?",
  })
})

app.get('/list', async (err, res) => {
  try {
    const post = await db.collection('post').find().toArray();
    res.render('list.njk', {
      title: 'List',
      post: post
    }) 
  } catch (err) {
    console.error(err)
  }
})

app.put('/list/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    const result = await db.collection('post').updateOne({_id: postId}, {$set: {_id: postId, title: req.body.title, date: req.body.date, contents: req.body.contents}}, console.log('수정 완료'))
    res.redirect('/list')
  } catch(err) {
    console.error(err)
  }
})

app.delete('/list/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    db.collection('post').deleteOne({_id: postId}, console.log('삭제 완료'));
    db.collection('counter').updateOne({name:'postNumber'}, { $inc: { totalPost: -1}}, console.log('변경 완료'));
    res.redirect('/list')
  } catch (err) {
    console.error(err)
  }
});

app.get('/write', (req,res) => {
  res.render('write.njk', {title: 'Write'});
});

app.post('/write', async (req, res) => {
    const result = await db.collection('counter').findOne({name: 'postNumber'});
    const totalPost = result.totalPost;
    db.collection('post').insertOne({_id: totalPost+1,title: req.body.title, date: req.body.date, contents: req.body.contents}, console.log('저장 완료 '));
    db.collection('counter').updateOne({name:'postNumber'}, { $inc: { totalPost: +1}}, console.log('변경 완료'));
    res.redirect('/');
})

app.listen(PORT, () => {
  console.log('listening on 8080')
});

module.exports = app;