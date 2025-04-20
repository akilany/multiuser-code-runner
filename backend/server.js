import express from "express";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();
const HOST_PORT = process.env.HOST_PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // or restrict to your origin
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/run", (req, res) => {
  const { username, filename, language } = req.body;

  if (!username || !filename || !language) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userPath = path.resolve(__dirname, "../user-data", username);
  const filePath = path.join(userPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found", filePath });
  }

  let dockerImage;
  let runCmd;

  if (language === "python") {
    dockerImage = "python:3.11";
    runCmd = `python /app/${filename}`;
  } else if (language === "javascript") {
    dockerImage = "node:20";
    runCmd = `node /app/${filename}`;
  } else if (language === "cpp") {
    dockerImage = "gcc:latest";
    runCmd = `bash -c "g++ /app/${filename} -o /app/a.out && /app/a.out"`;
  } else {
    return res.status(400).json({ error: "Unsupported language" });
  }

  // Sandbox the execution
  const cmd = `docker run --rm -m 128m --cpus="0.5" --network=none -v ${userPath}:/app ${dockerImage} ${runCmd}`;

  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ output: stdout });
  });
});

app.post("/submit", (req, res) => {
  const { username, filename, language } = req.body;

  if (!username || !filename || !language) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userPath = path.resolve(__dirname, "../user-data", username);
  const filePath = path.join(userPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found", filePath });
  }

  let dockerImage, runCmd;
  if (language === "python") {
    dockerImage = "python:3.11";
    runCmd = `python /app/${filename}`;
  } else if (language === "javascript") {
    dockerImage = "node:20";
    runCmd = `node /app/${filename}`;
  } else if (language === "cpp") {
    dockerImage = "gcc:latest";
    runCmd = `bash -c "g++ /app/${filename} -o /app/a.out && /app/a.out"`;
  } else {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const cmd = `docker run --rm -m 128m --cpus="0.5" --network=none -v ${userPath}:/app ${dockerImage} ${runCmd}`;

  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    const runId = `run_${uuidv4()}`;
    const timestamp = new Date().toISOString();

    const runData = {
      runId,
      username,
      filename,
      language,
      output: stdout || stderr || "No output",
      timestamp,
    };

    // Save to run-history.json
    const historyPath = path.resolve(__dirname, "run-history.json");
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath))
      : [];

    history.push(runData);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    res.json({
      runId,
      output: stdout || stderr,
      timestamp,
    });
  });
});

app.post("/start-session", (req, res) => {
  const { username } = req.body;

  const port = 9000 + Math.floor(Math.random() * 1000); // Unique-ish port
  const userVolume = path.resolve(__dirname, "../user-data", username);

  fs.mkdirSync(userVolume, { recursive: true });
  fs.chmodSync(userVolume, 0o777); // ensure writable by container user

  const containerName = `code-${username}`;
  const command = `docker run -d --name ${containerName} \
  --network code-server_default \
  --label com.docker.compose.project=code-server \
  -p ${port}:8080 \
  -v ${userVolume}:/home/coder/project \
  -e PASSWORD=${username}-pass \
  codercom/code-server:latest
`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error("Docker Error:", stderr || err.message);
      return res.status(500).json({
        error: "Failed to start container",
        details: stderr || err.message,
      });
    }

    res.json({
      message: "Session started",
      url: `http://localhost:${port}`,
      username,
      password: `${username}-pass`,
    });
  });
});

app.post("/stop-session", (req, res) => {
  const { username } = req.body;
  const containerName = `code-${username}`;
  exec(`docker rm -f ${containerName}`, (err) => {
    if (err) return res.status(500).json({ error: "Could not stop container" });
    res.json({ message: "Session stopped" });
  });
});

app.listen(HOST_PORT, () =>
  console.log(`Backend running on http://localhost:${HOST_PORT}`)
);
