const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Retry Gemini request if the service is temporarily unavailable
async function generateWithRetry(contents, maxAttempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents
      });
    } catch (error) {
      lastError = error;

      const status = error?.status;

      if (status !== 503 || attempt === maxAttempts) {
        throw error;
      }

      const delay = 2000 * Math.pow(2, attempt - 1);

      console.log(
        `Gemini is temporarily busy. Retrying in ${delay / 1000} seconds...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

app.get("/", (req, res) => {
  res.send("MyShelf Gemini backend is running!");
});

app.post("/api/test-gemini", async (req, res) => {
  try {
    const response = await generateWithRetry(
      "Explain photosynthesis in two simple sentences."
    );

    res.json({
      result: response.text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Gemini API request failed."
    });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text provided."
      });
    }

    const response = await generateWithRetry(`
You are an educational assistant.

Summarize the following study notes for a student.

Requirements:
- Keep all important concepts.
- Use simple language.
- Organize the summary with headings and bullet points.
- Do not add information that is not present in the notes.
- Make it useful for exam preparation.

Study notes:
${text}
`);

    res.json({
      summary: response.text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to generate summary."
    });
  }
});

app.listen(5000, () => {
  console.log("MyShelf backend running on http://localhost:5000");
});