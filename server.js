require('dotenv').config();
const { PORT, MONGO_URI, COOKIE_SECRET } = process.env;
const methodOverride = require('method-override');
const express = require('express');
const { MongoClient, AggregationCursor } = require("mongodb");
const client = new MongoClient(MONGO_URI);
client.connect(console.log('connecting on MongoDB'));
const db = client.db('todoapp');
const nunjucks = require('nunjucks');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const bcrypt = require('bcrypt')

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
  secret: COOKIE_SECRET,
  resave: true,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());



app.get('/', (req,res) => {
  if (req.user == undefined) {
    res.render('index.njk', {
      title: '오늘의 할 일',
      user: undefined
    })
  }else{
    console.log(`${req.user.name}님 접속을 환영합니다.`);
    res.render('index.njk', {
      title: '오늘의 할 일',
      user: req.user
    })
  }
});

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

function isLoggedIn(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.send('로그인이 필요합니다.')
  }
}

function isNotLoggedIn(req, res, next) {
  if (!req.user) {
    next()
  } else {
    res.send('로그인 상태로는 접근할 수 없습니다.')
  }
}

app.get('/join', isNotLoggedIn, (req, res) => {
  res.render('join.njk', {
    title: '회원가입',
  })
})

app.post('/join', isNotLoggedIn, async (req, res) => {
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
        pw: hash
      });
      db.collection('counter').insertOne({name: email, totalPost:0})
    res.redirect('/')
    }
  } catch (err) {
    console.error(err);
  }
});

app.get('/login', isNotLoggedIn,(req, res, info) => {
  res.render('login.njk', {
    title: '로그인',
    user: req.user
  });
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login'}), (req, res) => {
  res.redirect('/');
});

app.get('/about', (req, res) => {
  res.render('about.njk', {
    title: "오늘의 할 일 이란?",
    user: req.user
  })
})

app.get('/logout', (req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

app.get('/write', isLoggedIn, (req,res) => {
  res.render('write.njk', {
    title: 'Write',
    user: req.user
  });
});

app.post('/write', async (req, res) => {
    const result = await db.collection('counter').findOne({name: req.user.email});
    const totalPost = result.totalPost;
    db.collection('post').insertOne({postNumber: totalPost+1,title: req.body.title, date: req.body.date, contents: req.body.contents, writer: req.user.email}, console.log('저장 완료 '));
    db.collection('counter').updateOne({name: req.user.email}, { $inc: { totalPost: +1}}, console.log('변경 완료'));
    res.redirect('/');
})

app.get('/list', isLoggedIn, async (req, res) => {
  try {
    const post = await db.collection('post').find({writer: req.user.email}).toArray();
    res.render('list.njk', {
      title: 'List',
      post: post,
      user: req.user
    }) 
  } catch (err) {
    console.error(err)
  }
})

app.put('/list/:id', isLoggedIn, async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    db.collection('post').updateOne({postNumber: postId}, {$set: {postNumber: postId, title: req.body.title, date: req.body.date, contents: req.body.contents, writer: req.user.email}}, console.log('수정 완료'))
    res.redirect('/list')
  } catch(err) {
    console.error(err)
  }
})

app.delete('/list/:id', isLoggedIn, async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    db.collection('post').deleteOne({postNumber: postId}, console.log('삭제 완료'));
    db.collection('counter').updateOne({name: req.user.email}, { $inc: { totalPost: -1}}, console.log('변경 완료'));
    res.redirect('/list')
  } catch (err) {
    console.error(err)
  }
});

app.get('/search', isLoggedIn, async (req, res) => {
  try{
    const searchCondition  = [
      {
        $search: {
          index: 'titleSearch',
          text: {
            query: req.query.value,
            path: 'title'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
          }
        }
      }
    ]
    const result = await db.collection('post').aggregate(searchCondition).toArray();
    console.log(result)
    res.render('list', {
      post: result,
      searchCondition,
      user: req.user
    });
  } catch(err) {
    console.error(err);
  }  
})

app.get('/mypage', isLoggedIn ,(req, res) => {
  res.render('mypage.njk', {
    title: '나의 정보',
    userName: req.user.name,
    user: req.user
  })
})

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`)
});

module.exports = app;