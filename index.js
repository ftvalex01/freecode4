const express = require('express')
const app = express()
const cors = require('cors')

require('dotenv').config()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);
const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select({ username: 1, _id: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    const newExercise = new Exercise({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    await newExercise.save();
    res.json({
      _id: userId,
      username: user.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    let query = {
      username: user.username,
      ...(from && { date: { $gte: new Date(from) } }),
      ...(to && { date: { $lte: new Date(to) } }),
    };

    let exercises = await Exercise.find(query)
      .limit(parseInt(limit) || 0)
      .select('-_id description duration date');

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
