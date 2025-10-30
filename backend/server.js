const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const pty = require('node-pty');
const fs = require('fs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { execSync } = require('child_process');
const { getQuestion, loadQuestions, questions } = require('./questionsHandler');
const jwt = require("jsonwebtoken");


const JWT_SECRET = "meraSuperSecretKey123";
const JWT_EXPIRY = "120s";
const LONG_EXPIRY = "1h";

mongoose.connect("mongodb+srv://innoveotech:LPVlwcASp0OoQ8Dg@azeem.af86m.mongodb.net/InterviewDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  username: String,
  test: {
    type: Object,
    default: {}
  }
});
const User = mongoose.model('user', userSchema);


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
const _dirname=path.dirname("")
const buildpath = path.join(_dirname,"../interview-platform/build")
app.use(express.static(buildpath));
const allowedOrigins = [
  "http://localhost:3000", // React dev
  "http://localhost:5173", // Vite dev
  "http://127.0.0.1:5173", // sometimes browser uses this
  "http://127.0.0.1:3000", // sometimes browser uses this
  "https://lms.logicknots.com" ,// optional LMS domain
  "https://terminal.logicknots.com"
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// ============================
// 🪄 AUTH GENERATE
// ============================
app.post("/auth/generate", async (req, res) => {
  const authHeader = req.headers.authorization;
  const { candidateId } = req.body;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  if (!candidateId) return res.status(400).json({ error: "candidateId is required" });

  try {
    const incomingToken = authHeader.split(" ")[1];
    jwt.verify(incomingToken, JWT_SECRET); // LMS token check

    // ✅ Check MongoDB
    let user = await User.findOne({ username: candidateId });
    if (!user) {
      user = new User({ username: candidateId });
      await user.save();
      console.log(`🆕 Registered new user in MongoDB: ${candidateId}`);
    }

    // ✅ Check Linux user
    const userExists = execSync(`id -u ${candidateId} 2>/dev/null || echo "no"`).toString().trim();
    if (userExists === "no") {
      console.log(`🧩 Creating new Linux user: ${candidateId}`);

      const userDisk = `/home/${candidateId}.img`;
      const userHome = `/home/${candidateId}`;

      execSync(`sudo useradd -M -s /bin/bash ${candidateId}`);
      execSync(`sudo fallocate -l 1M ${userDisk}`);
      execSync(`sudo mkfs.ext2 ${userDisk}`);
      execSync(`sudo mkdir -p ${userHome}`);
      execSync(`sudo mount -o loop ${userDisk} ${userHome}`);
      execSync(`sudo chmod 700 ${userHome}`);
      execSync(`sudo chown ${candidateId}:${candidateId} ${userHome}`);
      execSync(`echo "${userDisk} ${userHome} ext2 loop,defaults 0 0" | sudo tee -a /etc/fstab`);

      console.log(`✅ Linux user ${candidateId} created successfully.`);
    } else {
      console.log(`🔹 Linux user app.get("/api/user-progress/:username", async (req, res) => {
  try {
    const { username } = req.params;
    console.log("📩 Fetching progress for user:", username);

    // ✅ Find user from MongoDB
    const user = await User.findOne({ username }).lean();

    if (!user) {
      console.log("❌ User not found:", username);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("✅ User found:", user.username);

    // ✅ Safely get test data (empty object if not found)
    const testData = user.test || {};

    console.log("📊 User test data:", testData);

    // ✅ Return structured response
    return res.status(200).json({
      success: true,
      username: user.username,
      test: testData
    });

  } catch (error) {
    console.error("❌ Error fetching user progress:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching progress"
    });
  }
});
already exists: ${candidateId}`);
    }

    // ✅ Generate short-lived JWT
    const access_token = jwt.sign({ sub: candidateId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return res.json({ access_token, message: "Token generated successfully" });
  } catch (error) {
    console.error("❌ Error generating token:", error);
    return res.status(500).json({ error: "Token generation failed" });
  }
});

// ============================
// 🪄 AUTH VERIFY TOKEN
// ============================
app.post("/auth/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ msg: "Token missing" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const username = payload.sub;

    // ✅ Issue new long-lived token
    const access_token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: LONG_EXPIRY });

    return res.json({
      access_token,
      candidateId: username,
      message: "Token verified successfully",
    });
  } catch (err) {
    console.error("❌ Token verification error:", err);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
});


// ✅ **Ensure the logs directory exists**
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}


// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });


// API route to get a new question every request
loadQuestions();

app.get("/api/question/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (index >= questions.length) {
    return res.json({ question: "Finish", isLast: true });
  }

  res.json({
    question: questions[index].text,
    isLast: index === questions.length - 1,  // ✅ Fixing this logic
  });
});



// ✅ API to get current test number
// ✅ API to get user progress


app.get("/api/test-count", (req, res) => {
  const questionsDir = path.join(__dirname, "questions");

  try {
    const files = fs.readdirSync(questionsDir);
    const testFiles = files.filter(file => file.startsWith("test") && file.endsWith(".txt"));
    const testCount = testFiles.length; // Count total tests available
    console.log(testCount);

    res.json({ success: true, testCount });
  } catch (error) {
    console.error("❌ Error reading test files:", error);
    res.status(500).json({ success: false, message: "Failed to get test count" });
  }
});

app.post("/api/question", async (req, res) => {
  const { testNumber, questionIndex, username } = req.body;

  if (!testNumber || questionIndex === undefined || !username) {
    return res.status(400).json({ success: false, message: "Missing parameters" });
  }

  const testNum = parseInt(testNumber.replace("test", ""));

  if (isNaN(testNum) || isNaN(questionIndex)) {
    return res.status(400).json({ success: false, message: "Invalid test number or question index" });
  }

  const questionData = getQuestion(testNum, parseInt(questionIndex));

  if (questionData.allDone) {
    return res.json({ question: "All tests completed!", isLast: true, allDone: true });
  }

  res.json(questionData);
});


// ✅ Get total number of questions for a test
app.post("/api/test-info", (req, res) => {
  const { testNumber } = req.body;

  if (!testNumber) {
    return res.status(400).json({ success: false, message: "Missing testNumber" });
  }

  try {
    const testFilePath = path.join(__dirname, "questions", `${testNumber}.txt`);

    if (!fs.existsSync(testFilePath)) {
      return res.status(404).json({ success: false, message: "Test file not found" });
    }

    // Read file and count question lines
    const fileContent = fs.readFileSync(testFilePath, "utf-8");
    const questionLines = fileContent
      .split("\n")
      .filter((line) => line.trim() !== "");

    const totalQuestions = questionLines.length;

    return res.json({ success: true, totalQuestions });
  } catch (error) {
    console.error("❌ Error reading test file:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});



app.post('/api/validate-test', async (req, res) => {
  const { username, testNumber, timeTaken } = req.body;

  console.log(`🔹 Validate: ${username} ${testNumber} ⏱️ Time: ${timeTaken}`);

  if (!username || !testNumber) {
    return res.status(400).json({ success: false, message: "Username and test number are required" });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const userFilePath = `/home/${username}/test${testNumber}.txt`;
  const referenceFilePath = path.join(__dirname, 'answers', `test${testNumber}_answers.txt`);

  if (!fs.existsSync(userFilePath)) {
    console.log("❌ User answer file not found:", userFilePath);
    return res.status(400).json({ success: false, message: "User answer file not found" });
  }

  try {
    const userAnswer = execSync(`sudo cat ${userFilePath}`).toString().trim();
    const correctAnswer = fs.readFileSync(referenceFilePath, 'utf-8').trim();

    // 🧩 1. Accuracy Scoring
    let accuracyScore = 0;
    if (userAnswer === correctAnswer) {
      accuracyScore = 100;
    } else if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      accuracyScore = 85; // case-insensitive match
    } else {
      // partial similarity
      const similarity = calculateSimilarity(userAnswer, correctAnswer);
      accuracyScore = Math.floor(similarity * 100);
    }

    // ⏱️ 2. Speed Scoring (based on total 300s)
    const MAX_TIME = 300; // 5 minutes
    const speedFactor = Math.max(0, (MAX_TIME - timeTaken) / MAX_TIME); // 0–1 scale
    const speedScore = Math.floor(speedFactor * 100);

    // 🧮 3. Final Weighted Score
    // 70% weight to accuracy, 30% to speed
    const finalMarks = Math.round((accuracyScore * 0.7) + (speedScore * 0.3));

    const passed = finalMarks >= 70;

    // 💾 Save Result
    const testKey = `test${testNumber}`;
    await User.updateOne(
      { username },
      {
        $set: {
          [`test.${testKey}`]: {
            marks: finalMarks,
            accuracy: accuracyScore,
            timeTaken,
            passed,
            date: new Date(),
          },
        },
      }
    );

    console.log(`✅ Marks: ${finalMarks} (Accuracy ${accuracyScore}, Speed ${speedScore})`);

    return res.json({
      success: passed,
      marks: finalMarks,
      accuracy: accuracyScore,
      speedScore,
      timeTaken,
      passed,
    });

  } catch (err) {
    console.error("❌ Error validating test:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


app.get("/api/user-progress/:username", async (req, res) => {
  try {
    const { username } = req.params;
    console.log("📩 Fetching progress for user:", username);

    // ✅ Find user from MongoDB
    const user = await User.findOne({ username }).lean();

    if (!user) {
      console.log("❌ User not found:", username);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("✅ User found:", user.username);

    // ✅ Safely get test data (empty object if not found)
    const testData = user.test || {};

    console.log("📊 User test data:", testData);

    // ✅ Return structured response
    return res.status(200).json({
      success: true,
      username: user.username,
      test: testData
    });

  } catch (error) {
    console.error("❌ Error fetching user progress:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching progress"
    });
  }
});






// ✅ **Login API - Creates a Lightweight System User**
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (user) {
    try {
      // ✅ **Check if user exists in the system**
      const userExists = execSync(`id -u ${username} 2>/dev/null || echo "no"`).toString().trim();

      if (userExists === "no") {
        console.log(`🆕 Creating user: ${username}`);

        // ✅ **Create a minimal user**
        execSync(`sudo useradd -M -s /bin/bash ${username}`);

        // ✅ **Set up the virtual disk file in kb or mb)**
        const userDisk = `/home/${username}.img`;
        const userHome = `/home/${username}`;

        console.log(`📦 Creatin 1 MB disk for ${username}`);
        execSync(`sudo fallocate -l 1M ${userDisk}`);
        execSync(`sudo mkfs.ext2 ${userDisk}`);
        execSync(`sudo chmod 600 ${userDisk}`);

        // ✅ **Create home directory and mount the disk**
        execSync(`sudo mkdir -p ${userHome}`);
        execSync(`sudo mount -o loop ${userDisk} ${userHome}`);
        execSync(`sudo chmod 700 ${userHome}`);
        execSync(`sudo chown ${username}:${username} ${userHome}`);

        // ✅ **Persist mount in /etc/fstab**
        execSync(`echo "${userDisk} ${userHome} ext2 loop,defaults 0 0" | sudo tee -a /etc/fstab`);

        console.log(`✅ User ${username} created with 1MB disk.`);
      } else {
        console.log(`🔹 User ${username} already exists.`);
      }

      res.json({ success: true, username });
    } catch (error) {
      console.error("❌ Error creating user:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ✅ **Logout API - Remove User and Disk**
app.post('/logout', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: "No username provided" });
  }

  try {
    console.log(`🔴 Logging out user: ${username}`);

    // ✅ Check if user exists
    try {
      execSync(`id ${username}`, { stdio: 'ignore' });
    } catch (error) {
      return res.status(400).json({ success: false, message: "User does not exist" });
    }

    // ✅ Kill all user processes
    try {
      execSync(`sudo pkill -KILL -u ${username}`, { stdio: 'ignore' });
      console.log(`🔪 Killed all processes for ${username}.`);
    } catch (error) {
      console.warn(`⚠️ No running processes found for ${username}.`);
    }

    // ✅ Unmount and remove home directory
    const userDisk = `/home/${username}.img`;
    const userHome = `/home/${username}`;
    try {
      execSync(`sudo umount ${userHome}`);
      execSync(`sudo rm -rf ${userHome}`);
      console.log(`🗑️ Unmounted and removed home directory for ${username}.`);
    } catch (error) {
      console.warn(`⚠️ Failed to unmount/remove home directory for ${username}: ${error}`);
    }

    // ✅ Remove user's disk image
    try {
      execSync(`sudo rm -f ${userDisk}`);
      console.log(`🗑️ Deleted disk image for ${username}.`);
    } catch (error) {
      console.warn(`⚠️ Failed to remove disk image for ${username}: ${error}`);
    }

    // ✅ Remove the /etc/fstab entry
    try {
      execSync(`sudo sed -i '\\|/home/${username}.img|d' /etc/fstab`);
      console.log(`🗑️ Removed fstab entry for ${username}.`);
    } catch (error) {
      console.warn(`⚠️ Failed to remove fstab entry for ${username}: ${error}`);
    }

    // ✅ Delete user after unmounting
    try {
      execSync(`sudo userdel ${username}`);
      console.log(`🗑️ User ${username} deleted.`);
    } catch (error) {
      console.error(`❌ Failed to delete user: ${error}`);
      return res.status(500).json({ success: false, message: "Failed to delete user" });
    }

    return res.json({ success: true, message: "User logged out successfully." });

  } catch (error) {
    console.error("❌ Error during logout:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
});



// ============================
// 🖥️ WEBSOCKET HANDLER
// ============================
wss.on("connection", (ws, req) => {
  const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
  const token = params.get("token");

  if (!token) {
    console.log("❌ No token provided in WebSocket connection.");
    ws.close();
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const username = payload.sub;

    console.log(`🔹 WebSocket connected for user: ${username}`);
    const userDir = `/home/${username}`;

    const ptyProcess = pty.spawn("sudo", ["-u", username, "bash"], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: userDir,
      env: { ...process.env, HOME: userDir },
    });

    ptyProcess.on("data", (data) => ws.send(data));
    ws.on("message", (msg) => ptyProcess.write(msg));
    ws.on("close", () => ptyProcess.kill());
  } catch (err) {
    console.error("❌ Invalid WebSocket token:", err);
    ws.close();
  }
});

server.listen(4000, () => console.log('🚀 Server running at http://localhost:4000'));
