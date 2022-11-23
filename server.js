require('dotenv').config();
const { PORT, MONGO_URI } = process.env;
const methodOverride = require('method-override');
const express = require('express');
const { MongoClient } = require("mongodb");
const client = new MongoClient(MONGO_URI);
client.connect(console.log('connecting on MongoDB'));
const db = client.db('todoapp');
const nunjucks = require('nunjucks');

const app = express();
app.set('view engine', 'njk')
nunjucks.configure('views', {
  express: app,
  watch: true,

});

app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'))

app.get('/', (req,res) => {
  res.render('index.njk', {
    title: 'To Do App'
  })
});

app.get('/write', (req,res) => {
  res.render('write.njk', {title: 'Write'});
});

app.post('/add', async (req, res) => {
    console.log(req.body)
    const result = await db.collection('counter').findOne({name: 'postNumber'});
    const totalPost = result.totalPost;
    db.collection('post').insertOne({_id: totalPost+1,title: req.body.title, date: req.body.date, contents: req.body.contents});
    db.collection('counter').updateOne({name:'postNumber'}, { $inc: { totalPost: +1}});
    res.redirect('/');
})

app.get('/list', async (err, res) => {
  const post = await db.collection('post').find().toArray();
  res.render('list.njk', {
    title: 'List',
    post: post
  }) 
})

app.delete('/list/:id', async (req, res, err) => {
  try {
    console.log(req.params.id)
    const result = await db.collection('post').deleteOne({_id: req.params.id}, console.log('삭제 완료'));
    console.log(result)
    res.redirect('/list')
  } catch (err) {
    console.error(err)
  }

});

app.listen(PORT, () => {
  console.log('listening on 8080')
});

module.exports = app;