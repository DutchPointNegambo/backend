import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-pro" }); // This doesn't list, it just gets a model object
    // To list models, we need a different approach or just try common ones
    console.log("Checking for gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("test");
        console.log("gemini-1.5-flash is AVAILABLE");
    } catch (e) {
        console.log("gemini-1.5-flash is NOT available:", e.message);
    }

    console.log("Checking for gemini-pro...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        await model.generateContent("test");
        console.log("gemini-pro is AVAILABLE");
    } catch (e) {
        console.log("gemini-pro is NOT available:", e.message);
    }
  } catch (error) {
    console.error("List error:", error);
  }
}

listModels();
