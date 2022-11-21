require('dotenv').config();
const { PORT, MONGO_URI } = process.env;
const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;

app.use(express.urlencoded({extended: true}));

app.get('/', (req,res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/write', (req,res) => {
    res.sendFile(__dirname + '/views/write.html');
});

app.post('/add', (req, res) => {
    console.log(req.body)
    res.send('전송 완료')
})

MongoClient.connect(MONGO_URI, (err, client) => {
    if (err) return console.error(err);
		console.log("Connecting on MongoDB")
    //서버띄우는 코드 여기로 옮기기
    app.listen(PORT, () => {
      console.log('listening on 8080')
    });
});