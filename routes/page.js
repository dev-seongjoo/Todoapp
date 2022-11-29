const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/img')
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.email}.jpg`);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    var ext = path.extname(file.originalname);
    if(ext !== '.jpg' && ext !== '.jpeg') {
        return cb(new Error('JPG만 업로드할 수 있습니다.'))
    }
    cb(null, true)
  },
  limits: {
    fileSize: 1024 * 1024 * 5
  }
});
const { isLoggedIn } = require('./middlewares');
const db = require('../models/index')

router.get('/home', (req,res) => {
  if (req.user == undefined) {
    res.render('main.njk', {
      title: '오늘의 할 일',
      user: undefined
    })
  }else{
    console.log(`${req.user.name}님 접속을 환영합니다.`);
    res.render('main.njk', {
      title: '오늘의 할 일',
      user: req.user
    })
  }
});

router.get('/about', (req, res) => {
  res.render('about.njk', {
    title: "오늘의 할 일 이란?",
    user: req.user
  })
})

router.get('/write', isLoggedIn, (req,res) => {
  res.render('write.njk', {
    title: 'Write',
    user: req.user
  });
});

router.post('/write', async (req, res) => {
    const result = await db.collection('counter').findOne({name: req.user.email});
    const totalPost = result.totalPost;
    db.collection('post').insertOne({postNumber: totalPost+1,title: req.body.title, date: req.body.date, contents: req.body.contents, writer: req.user.email}, console.log('저장 완료 '));
    db.collection('counter').updateOne({name: req.user.email}, { $inc: { totalPost: +1}}, console.log('변경 완료'));
    res.redirect('/page/home');
})

router.get('/list', isLoggedIn, async (req, res) => {
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

router.put('/list/:id', isLoggedIn, async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    db.collection('post').updateOne({postNumber: postId}, {$set: {postNumber: postId, title: req.body.title, date: req.body.date, contents: req.body.contents, writer: req.user.email}}, console.log('수정 완료'))
    res.redirect('/page/list')
  } catch(err) {
    console.error(err)
  }
})

router.delete('/list/:id', isLoggedIn, async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    db.collection('post').deleteOne({postNumber: postId}, console.log('삭제 완료'));
    db.collection('counter').updateOne({name: req.user.email}, { $inc: { totalPost: -1}}, console.log('변경 완료'));
    res.redirect('/page/list')
  } catch (err) {
    console.error(err)
  }
});

router.get('/search', isLoggedIn, async (req, res) => {
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

router.get('/mypage', isLoggedIn ,async (req, res) => {
  const result = await db.collection('user').findOne({email: req.user.email})
  if(result.imgSrc != "basic") {
    console.log('등록한 이미지')
    res.render('mypage.njk', {
      title: '나의 정보',
      userName: req.user.name,
      user: req.user,
    });
  } else {
    console.log('기본 이미지')
    res.render('mypage.njk', {
      title: '나의 정보',
      userName: req.user.name,
      user: req.user,
    });
  }
});

router.get('/setting', isLoggedIn, (req, res) => {
  res.render('setting.njk',{
    title: '설정',
    user: req.user
  });
});

router.post('/upload', upload.single('profile'), isLoggedIn, (req, res) => {
  console.log('업로드 완료')
  const fileNmae = req.file.filename
  db.collection('user').updateOne({
    email: req.user.email,
  }, {$set: { imgSrc: `/public/img/${fileNmae}` }})
  res.redirect('/page/setting')
});

module.exports = router