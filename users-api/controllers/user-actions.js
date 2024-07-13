const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { createAndThrowError, createError } = require('../helpers/error');
const User = require('../models/user');

const internal_error_message = '예기치 못한 오류로 요청을 수행하지 못했습니다.';

const validateCredentials = (email, password) => {
  if (
    !email ||
    email.trim().length === 0 ||
    !email.includes('@') ||
    !password ||
    password.trim().length < 7
  ) {
    createAndThrowError(
      '이메일 혹은 패스워드 입력값이 유효하지 않습니다. (이메일 형식이어야만 하며, 비밀번호는 8자리 이상이어야합니다.',
      422
    );
  }
};

const checkUserExistence = async (email) => {
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    createAndThrowError(internal_error_message, 500);
  }

  if (existingUser) {
    createAndThrowError('동일한 이메일을 사용하는 사용자가 있습니다.', 422);
  }
};

const getHashedPassword = async (password) => {
  try {
    const response = await axios.get(
      `http://${process.env.AUTH_API_ADDRESSS}/hashed-pw/${password}`
    );
    return response.data.hashed;
  } catch (err) {
    const code = (err.response && err.response.status) || 500;
    createAndThrowError(err.message || '', code);
  }
};

const getTokenForUser = async (password, hashedPassword) => {
  console.log(password, hashedPassword);
  try {
    const response = await axios.post(
      `http://${process.env.AUTH_API_ADDRESSS}/token`,
      {
        password: password,
        hashedPassword: hashedPassword,
      }
    );
    return response.data.token;
  } catch (err) {
    const code = (err.response && err.response.status) || 500;
    createAndThrowError(err.message || 'Failed to verify user.', code);
  }
};

const createUser = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    validateCredentials(email, password);
  } catch (err) {
    return next(err);
  }

  try {
    await checkUserExistence(email);
  } catch (err) {
    return next(err);
  }

  let hashedPassword;
  try {
    hashedPassword = await getHashedPassword(password);
  } catch (err) {
    return next(err);
  }

  const newUser = new User({
    email: email,
    password: hashedPassword,
  });

  let savedUser;
  try {
    savedUser = await newUser.save();
  } catch (err) {
    const error = createError(err.message || internal_error_message, 500);
    return next(error);
  }

  res.status(201).json({
    message: '사용자 정보를 생성했습니다.',
    user: savedUser.toObject(),
  });
};

const verifyUser = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    validateCredentials(email, password);
  } catch (err) {
    return next(err);
  }

  let existingUser;
  try {
    existingUser = await User.findOne({
      email,
    });
  } catch (err) {
    const error = createError(err.message || internal_error_message, 500);
    return next(error);
  }

  if (!existingUser) {
    const error = createError('존재하지 않는 사용자입니다.', 422);
    return next(error);
  }

  try {
    const token = await getTokenForUser(password, existingUser.password);
    res.status(200).json({ token: token, userId: existingUser.id });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  const email = req.body.email;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = createError(err.message || internal_error_message, 500);
    return next(error);
  }

  if (!existingUser) {
    const error = createError('존재하지 않는 사용자입니다.', 422);
    return next(error);
  }

  try {
    await User.deleteOne({ email });

    res.status(200).json({
      message: '사용자 정보를 삭제했습니다.',
    });
  } catch (err) {
    next(err);
  }
};

exports.createUser = createUser;
exports.verifyUser = verifyUser;
exports.deleteUser = deleteUser;
