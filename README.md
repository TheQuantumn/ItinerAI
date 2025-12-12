# 🗺️ ItinerAI - AI-Powered Travel Planner

ItinerAI is a smart travel planner that generates **personalized, day-by-day itineraries** by leveraging AI to analyze real-world travel data from YouTube. Instead of generic suggestions, it synthesizes information from the titles and descriptions of popular travel vlogs to create a plan that reflects **current trends and hidden gems**.

This project consists of a modern frontend connected to a serverless backend that orchestrates calls to the **YouTube Data API** and **Google's Gemini API**.

---

## ✨ Core Features

* **Personalized Itineraries:** Generates travel plans based on user input for destination, trip duration, travel style (e.g., Adventure, Romantic), and budget.
* **AI-Powered Insights:** Uses Google's Gemini API to analyze and synthesize data from multiple YouTube video titles and descriptions.
* **Data-Driven Suggestions:** Bases recommendations on the most frequently mentioned places, activities, and tips from popular travel creators.
* **Budget & Logistics:** Provides estimated daily costs and logistical notes to create a practical and actionable plan.

---

## 💻 Technology Stack

This project is a multi-platform application, combining a frontend hosted on Netlify with a serverless backend on Vercel.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Builder.io, Netlify | UI/UX Design and Static Site Hosting |
| **Backend** | Node.js, Vercel Serverless Functions | Serverless logic and API orchestration |
| **AI & Data APIs** | Google Gemini API, YouTube Data API v3 | Core data analysis and sourcing |
| **Developer Tools** | Git, GitHub, Vercel CLI, npm | Version control and deployment |

---

## ⚙️ How It Works (Architecture)

The application follows a simple, robust **serverless architecture**.



1.  **User Input:** The user fills out their travel preferences on the frontend (built with Builder.io and hosted on Netlify).
2.  **API Request:** On submission, the frontend makes a **GET request** to the Vercel serverless function, passing the user's preferences as query parameters.
3.  **Data Sourcing:** The Node.js function calls the **YouTube Data API v3** to search for the top travel videos matching the user's destination and trip style. It collects the titles and descriptions from these videos.
4.  **AI Generation:** The collected text is compiled into a detailed prompt and sent to the **Google Gemini API**. The AI is instructed to act as an expert travel agent and create a structured itinerary based on the provided data and user constraints.
5.  **Response:** The generated itinerary is sent back from the Vercel function to the Netlify frontend, where it is displayed to the user.

---

## 🚀 Setup and Local Development

To run this project on your local machine, follow these steps:

### 1. Clone the Repository

`git clone https://github.com/TheQuantumn/ItinerAI.git 
` 
`cd ItinerAI
`


### 2. Install Dependencies

`npm install`


### 3. Set Up Environment Variables

You will need API keys from **Google Cloud (for YouTube)** and **Google AI Studio (for Gemini)**.

Run the following command to pull the environment variables you've set on your Vercel project into a local file:

`npx vercel env pull`


> **Note:** This will create a `.env` file in your project root. Ensure this file is listed in your `.gitignore` for security!

### 4. Run the Development Server

`npx vercel dev`


Your serverless function will now be running and accessible at `http://localhost:3000`. You can test it by constructing a URL with the required query parameters.

---

## 💡 Project Learnings & Future Work

This project was a deep dive into solving real-world engineering challenges. The initial concept was to use YouTube video transcripts, but extensive debugging revealed that programmatic access to transcripts is highly unreliable. The project successfully pivoted to a more stable data source—**video titles and descriptions**—while still achieving the core goal.

### Future improvements could include:

* **Integrating a Paid Speech-to-Text API:** To reliably implement the original transcript idea.
* **User Accounts:** Allowing users to save and edit their generated itineraries.
* **Booking Integration:** Connecting to flight and hotel APIs to make the itinerary fully a
