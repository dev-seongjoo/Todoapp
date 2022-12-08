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
const db = require('../models/index');
const { ObjectId } = require('mongodb');

router.use((req, res, next) => {
  res.locals.user = req.user
  next()
});

router.get('/home', (req,res) => {
  if (req.user == undefined) {
    res.render('main.njk', {
      title: 'To do app',
    })
  }else{
    console.log(`${req.user.name}님 접속을 환영합니다.`);
    res.render('main.njk', {
      title: 'To do app',
    })
  }
});

router.get('/write', isLoggedIn, (req,res) => {
  res.render('write.njk', {
    title: '목표 적기',
  });
});

router.post('/write', async (req, res) => {
    const result = await db.collection('counter').findOne({name: req.user.email});
    const totalPost = result.totalPost;
    db.collection('post').insertOne({postNumber: totalPost+1,title: req.body.title, date: req.body.date, contents: req.body.contents, writer: req.user.email, writerName: req.user.name ,share: "no"}, console.log('저장 완료 '));
    db.collection('counter').updateOne({name: req.user.email}, { $inc: { totalPost: +1}}, console.log('변경 완료'));
    res.redirect('/page/home');
});

router.get('/list', isLoggedIn, async (req, res) => {
  try {
    const post = await db.collection('post').find({writer: req.user.email}).toArray();
    res.render('list.njk', {
      title: '나의 목표',
      post: post,
    }) 
  } catch (err) {
    console.error(err)
  }
});

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

router.get('/list/search', isLoggedIn, async (req, res) => {
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
    const post = await db.collection('post').aggregate(searchCondition).toArray();
    res.render('list', {
      post,
      searchCondition,
    });
  } catch(err) {
    console.error(err);
  }  
});

router.get('/mypage', isLoggedIn ,async (req, res) => {
  const result = await db.collection('user').findOne({email: req.user.email})
  if(result.imgSrc != "basic") {
    res.render('mypage.njk', {
      title: '나의 정보',
      userName: req.user.name,
    });
  } else {
    res.render('mypage.njk', {
      title: '나의 정보',
      userName: req.user.name,
    });
  }
});

router.get('/setting', isLoggedIn, (req, res) => {
  res.render('setting.njk',{
    title: '설정',
  });
});

router.post('/upload', upload.single('profile'), isLoggedIn, (req, res) => {
  const fileNmae = req.file.filename
  db.collection('user').updateOne({
    email: req.user.email,
  }, {$set: { imgSrc: `/public/img/${fileNmae}` }})
  res.redirect('/page/setting')
});

router.get('/community', isLoggedIn ,async (req, res) => {
  if(req.user) {
    const post = await db.collection('post').find({
      writer: req.user.email,
      share: "yes"
    }).toArray();
    res.render('community.njk',{
      title: '커뮤니티',
      post
  })} else {
    const post = await db.collection('post').find({
      share: "yes"
    }).toArray();
    res.render('community.njk',{
      title: '커뮤니티',
      post
    })
  }
});

router.post('/share/:id', async (req, res) => {
  const postNumber = parseInt(req.params.id) 
  db.collection('post').updateOne({
    postNumber,
    writer: req.user.email
  }, {$set: {share: "yes"}})
  res.redirect('/page/list')
});

router.get('/community/search', async (req, res) => {
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
    const post = await db.collection('post').aggregate(searchCondition).toArray();
    const postList = []
    for(let i = 0; i < post.length; i++ ) {
      if(post[i].writer != req.user.email && post[i].share == "yes") {
        postList.push(post[i])
      }
    }
    res.render('community', {
      post: postList,
      searchCondition,
    });
  } catch(err) {
    console.error(err);
  }  
});

router.get('/postDetail/:postNumber/:writer', isLoggedIn ,async (req, res) => {
  const postNumber = parseInt(req.params.postNumber)
  const post = await db.collection('post').findOne({
    postNumber,
    writer: req.params.writer
  })
  const comment = await db.collection('comment').find({
    post: post._id
  }).toArray()
  res.render('postDetail.njk',{
    title: post.title,
    post,
    comment
  })
});

router.post('/comment/:postTitle/:postNumber/:writer', isLoggedIn ,async (req, res) => {
  const postNumber = req.params.postNumber
  const writer = req.params.writer
  const post = await db.collection('post').findOne({
    title: req.params.postTitle,
    writer: req.params.writer
  })
  db.collection('comment').insertOne({
    post: post._id,
    commentWriter: req.user.name,
    commentContent: req.body.comment,
    time: new Date().toDateString()
  })
  res.redirect(`/page/postDetail/${postNumber}/${writer}`)
})

router.delete('/comment/:postTitle/:postNumber/:writer/:id', isLoggedIn, async (req, res) => {
  try {
    const postNumber = req.params.postNumber
    const writer = req.params.writer
    const commentId = new ObjectId(req.params.id)
    console.log(commentId)
    db.collection('comment').deleteOne({_id: commentId}, console.log('삭제 완료'));
    res.redirect(`/page/postDetail/${postNumber}/${writer}`)
  } catch (err) {
    console.error(err)
  }
});

module.exports = router