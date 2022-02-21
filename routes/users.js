const user = require('express').Router();

user.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = user;
