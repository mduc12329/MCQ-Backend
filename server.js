const express = require("express");
const app = express();
const mongodb = require("mongodb");
const DATABASE_NAME = "wpr-quiz";
const MONGO_URL = `mongodb://localhost:27017/${DATABASE_NAME}`;
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let db = null;
let collection = null;

// handling new attempt
app.post("/attempts", async (req, res) => {
  try {
    let ObjectID = mongodb.ObjectID;
    const objectId = new ObjectID();
    const result = await db
      .collection("questions")
      .aggregate([{ $sample: { size: 10 } }]);
    let docs = await result.toArray();
    // let docsCopy = JSON.parse(JSON.stringify(docs));
    // console.log(docs);
    let attempt = {
      _id: objectId,
      questions: [],
      completed: false,
      score: 0,
      startedAt: new Date().toISOString(),
      __v: 0,
    };
    for (let item of docs) {
      // delete item.correctAnswer;
      attempt.questions.push(item);
    }
    await db.collection("attempts").insertOne(attempt);
    for (let item of attempt.questions) {
      delete item.correctAnswer;
    }
    res.status(201).json(attempt);
  } catch (e) {
    console.log(e);
  }
});

app.post("/attempts/:id/submit", async (req, res) => {
  try {
    let id = req.params.id;
    const returnAttempt = await db
      .collection("attempts")
      .findOne({ _id: new mongodb.ObjectId(id) });
    if (returnAttempt != null) {
      const userAnswers = req.body.userAnswers;
      returnAttempt.completed = true;
      returnAttempt.userAnswers = userAnswers;
      returnAttempt.correctAnswers = {};
      for (let item of returnAttempt.questions) {
        // Assign correctAnswers
        returnAttempt.correctAnswers[item._id] = item.correctAnswer;
        // Delete correctAnswer in each questions
        delete item.correctAnswer;
      }
      for (let item in userAnswers) {
        for (let item2 in returnAttempt.correctAnswers) {
          if (
            item == item2 &&
            userAnswers[item] == returnAttempt.correctAnswers[item2]
          ) {
            returnAttempt.score++;
          }
        }
      }
      returnAttempt.scoreText = "";
      if (returnAttempt.score < 5)
        returnAttempt.scoreText = "Practice more to improve it :D";
      else if (returnAttempt.score < 7)
        returnAttempt.scoreText = "Good, keep up!";
      else if (returnAttempt.score < 9) returnAttempt.scoreText = "Well done!";
      else if (returnAttempt.score <= 10) returnAttempt.scoreText = "Perfect!!";

      return res.status(201).json(returnAttempt);
    }
    res.status(404).end("Error");
  } catch (e) {
    console.log(e);
  }
});

async function startServer() {
  const client = await mongodb.MongoClient.connect(MONGO_URL);
  db = client.db();
  // collection = db.collection("questions");
  await app.listen(PORT);
  console.log(`Server listening on port ${PORT}`);
}
startServer();
