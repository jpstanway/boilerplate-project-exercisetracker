require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});
/*------------- THE MAGIC HAPPENS HERE ------------------- */

// user model
const userSchema = new Schema({
  username: {type: String, required: true},
  count: {type: Number, default: 0},
  exercise_log: []
}, {versionKey: false});

const exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date
}, {_id: false});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// create user name
app.post('/api/exercise/new-user', (req, res) => {  
  const username = req.body.username;

  // search for duplicates
  User.findOne({username: username}, (err, data) => {
    if (err) res.send('Error searching database');

    if (data) {
      res.send('User already exists!\n' + data);
    } else {
      //save new user
      const user = new User({username: username});
      user.save((err, data) => {
        if (err) res.send('Failed to create user');

        res.send({username: data.username, _id: data._id});
      });
    }
  });
  
});

// add exercises
app.post('/api/exercise/add', (req, res) => {
  const userId = req.body.userId;
  const desc = req.body.description;
  const time = req.body.duration;
  const date = req.body.date || Date.now();

  // set update parameters
  const query = {_id: userId};
  const update = new Exercise({
    description: desc,
    duration: time, 
    date: date
  });
  const options = {new: true};
  
  // perform a search and update on id
  User.findOneAndUpdate(query, {$push: {exercise_log: update}, $inc: {count: 1}}, options, (err, data) => {
    if (err) res.send('Failed to update user info ' + err);
    
    res.send(data);
  });
});

// get all users
app.get('/api/exercise/users', (req, res) => {
  User.find(null, 'username _id', (err, data) => {
    if (err) res.send('Error finding users');

    res.send(data);
  });
});


/*-------------------------------------------------------- */
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
