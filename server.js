require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track");

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
/*------------- THE MAGIC HAPPENS HERE ------------------- */

// user model
const userSchema = new Schema(
  {
    username: { type: String, required: true },
    from: Date,
    to: Date,
    count: { type: Number, default: 0 },
    exercise_log: []
  },
  { versionKey: false }
);

const exerciseSchema = new Schema(
  {
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: Date
  },
  { _id: false }
);

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// create user name
app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;

  // search for duplicates
  User.findOne({ username: username }, (err, data) => {
    if (err) res.send("Error searching database");

    if (data) {
      res.send("User already exists!\n" + data);
    } else {
      //save new user
      const user = new User({ username: username });
      user.save((err, data) => {
        if (err) res.send("Failed to create user");

        res.send({ username: data.username, _id: data._id });
      });
    }
  });
});

// add exercises
app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration } = req.body;
  const date = req.body.date || Date.now();

  // check required fields
  if (!description || !duration) {
    res.send("Please fill out all required items!");
  } else {
    // set update parameters
    const query = { _id: userId };
    const update = new Exercise({
      description: description,
      duration: duration,
      date: date
    });
    const options = { new: true };

    // perform a search and update on id
    User.findOneAndUpdate(
      query,
      { $push: { exercise_log: update } },
      options,
      (err, data) => {
        if (err)
          res.send(
            "Failed to update user info - check to make sure userId is correct"
          );
        data.count = data.exercise_log.length;

        res.send(data || "Invalid userId");
      }
    );
  }
});

// get all users
app.get("/api/exercise/users", (req, res) => {
  User.find(null, "username _id", (err, data) => {
    if (err) res.send("Error finding users");

    res.send(data || "No users in database!");
  });
});

// get user info by id
app.get("/api/exercise/log", (req, res) => {
  const { userId, limit, from, to } = req.query;

  User.findById(userId, (err, data) => {
    if (err) res.send("Error searching database for user");

    // return results from specific date only
    if (from) {
      data.exercise_log = data.exercise_log.filter(
        exercise => exercise.date >= Date.parse(from)
      );
    }

    // return results up to a specific date only
    if (to) {
      data.exercise_log = data.exercise_log.filter(
        exercise => exercise.date <= Date.parse(to)
      );
    }

    // if limit is set, narrow results down to amount
    if (limit) {
      data.exercise_log = data.exercise_log.slice(0, limit);
    }

    // assign log array length to count property
    data.count = data.exercise_log.length;

    res.send(data || "User doesn't exist");
  });
});

/*-------------------------------------------------------- */
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
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
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
