import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listAllModels() {
  try {
    // The SDK doesn't have a direct listModels on the main class in some versions, 
    // but we can try to fetch the list via the v1 endpoint if we use a raw fetch or check documentation.
    // However, let's try gemini-1.5-flash-latest and gemini-1.5-pro-latest
    const models = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-1.5-flash", "gemini-pro"];
    
    for (const m of models) {
        console.log(`Testing ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("hi");
            console.log(`SUCCESS: ${m} is working!`);
            return;
        } catch (e) {
            console.log(`FAILED: ${m} - ${e.message}`);
        }
    }
  } catch (error) {
    console.error("List error:", error);
  }
}

listAllModels();
