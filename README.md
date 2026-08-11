# AI News Verifier

**AI News Verifier** is a React Native mobile application built with Expo (SDK 54) that fetches the latest news headlines and uses Artificial Intelligence to instantly verify their authenticity. 

The app reads through the news snippets and scores them out of 100 based on their clickbait nature, sensationalism, and likelihood of being genuine, providing a quick verdict and reasoning for the reader.

## Screenshots

<p align="center">
  <img src="assets/light.jpg" width="300" alt="Light Mode" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/dark.jpg" width="300" alt="Dark Mode" />
</p>

## Features

- **Real-Time News**: Fetches the latest Indian general news headlines directly from [NewsAPI](https://newsapi.org/).
- **AI Verification**: Concurrently passes headlines and snippets to the [Groq API](https://groq.com/) using the `llama-3.1-8b-instant` model to generate a structured authenticity JSON report.
- **Color-Coded Scoring**: 
  - **Green (70-100)**: Highly likely to be genuine.
  - **Yellow (40-69)**: Uncertain or mildly sensationalized.
  - **Red (0-39)**: Highly suspicious, clickbait, or likely fake.
- **Dark Mode Support**: Automatically respects system theme preferences, and includes a manual toggle in the header.
- **Pull-to-Refresh & Reload**: Easily fetch and verify the newest batch of headlines on demand.
- **Rich Media**: Displays news thumbnails natively when available.

## Tech Stack

- **Framework**: React Native & Expo (SDK 54)
- **News Data**: [NewsAPI](https://newsapi.org/)
- **AI/LLM Engine**: [Groq](https://console.groq.com/docs/quickstart) (Llama 3.1)

## Setup & Installation

To run this project locally, you will need API keys from NewsAPI and Groq. Both offer free tiers.

### 1. Clone the repository
```bash
git clone https://github.com/MaybeUrMayur/AI-news-app.git
cd AI-news-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API Keys
Create a file named `config.js` in the root of the project. This file is ignored by Git by default to keep your keys secure.

Add your keys inside `config.js`:
```javascript
export const NEWS_API_KEY = 'your_news_api_key_here';
export const GROQ_API_KEY = 'your_groq_api_key_here';
```

### 4. Run the app
Start the Expo development server:
```bash
npm run start
```
You can then scan the QR code with the **Expo Go** app on your iOS or Android device to preview the application!
