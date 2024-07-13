const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const userRoutes = require('./routes/user-routes');

const app = express();

const axios = require('axios');

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(userRoutes);

app.get('/user-health', (_, res) => {
  res.status(200).json({ message: 'user-Api 정상 운영중' });
});

app.get('/auth-health', async (_, res, next) => {
  try {
    const response = await axios.get(
      `http://${process.env.AUTH_API_ADDRESSS}/health`
    );
    res.status(200).json(response.data);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  let code = 500;
  let message = 'Something went wrong.';
  if (err.code) {
    code = err.code;
  }

  if (err.message) {
    message = err.message;
  }
  res.status(code).json({ message: message });
});

mongoose.connect(
  process.env.MONGODB_CONNECTION_URI,
  { useNewUrlParser: true },
  (err) => {
    if (err) {
      console.log('몽고 DB 연결 실패!');
      console.log(err);
    } else {
      console.log('몽고 DB 연결 성공!');
      app.listen(3000);
    }
  }
);
