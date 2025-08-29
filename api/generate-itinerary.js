// Import necessary libraries
import { google } from 'googleapis';
// Import the Google Generative AI library
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the Flash model, which is faster and has a more generous free tier for this task.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// --- Helper function to get video details ---
async function getVideoDetails(query, maxResults = 8) { // Using 8 videos is a good balance
  console.log(`Searching for videos with query: "${query}"`);
  const searchResponse = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults,
    order: 'relevance',
  });

  const videos = searchResponse.data.items;
  if (!videos || videos.length === 0) {
    console.log(`No videos found for query: "${query}"`);
    return ''; // Return empty string if no videos found
  }

  // Combine the title and description from each video
  let combinedText = '';
  videos.forEach(video => {
    const title = video.snippet.title;
    const description = video.snippet.description;
    combinedText += `Video Title: ${title}\nVideo Description: ${description}\n\n---\n\n`;
  });

  console.log(`SUCCESS: Gathered titles and descriptions for ${videos.length} videos.`);
  return combinedText;
}


// --- This is our main serverless function (Node.js runtime) ---
export default async function handler(request, response) {
  // --- Add CORS Headers ---
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your Netlify domain
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // --- Handle preflight 'OPTIONS' request ---
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  // Destructure all the new parameters from the request query
  const { destination, startLocation, duration, tripType, budget } = request.query;

  // Validate all the required inputs
  if (!destination || !startLocation || !duration || !tripType || !budget) {
    return response.status(400).json({
      error: 'Missing required parameters. Please provide destination, startLocation, duration, tripType, and budget.'
    });
  }

  try {
    // --- STEP 1: Search and Get Video Details ---
    const searchQuery = `${duration} day ${tripType} trip to ${destination} travel guide`;
    const videoData = await getVideoDetails(searchQuery);

    if (!videoData) {
      return response.status(500).json({ error: 'Could not find any relevant video data for the destination.' });
    }

    // --- STEP 2: Use Gemini with the new data source ---
    console.log('Sending video titles and descriptions to Gemini...');

    const prompt = `
      You are an expert travel agent. Your task is to create a detailed and practical travel itinerary by analyzing the **titles and descriptions** of multiple YouTube videos. You must adhere strictly to all the user's constraints.

      **User's Trip Details:**
      - **Trip Origin:** ${startLocation}
      - **Destination:** ${destination}
      - **Duration:** ${duration} days
      - **Trip Style:** ${tripType}
      - **Total Budget (approximate):** ${budget}

      **Your Task:**
      1. Analyze the following collection of YouTube video titles and descriptions for '${destination}'.
      2. Identify the most frequently mentioned landmarks, activities, restaurants, and tips.
      3. Create a logical, day-by-day itinerary for a ${duration}-day trip.
      4. The itinerary must match the **${tripType}** style. Prioritize suggestions that fit this style.
      5. Provide an estimated daily cost breakdown and ensure the total trip cost stays within the approximate budget of **${budget}**.
      6. If the trip is international (e.g., from ${startLocation} to ${destination}), include a note about estimated travel time and potential flight costs, but focus the detailed itinerary on the destination itself.

      **Video Data (Titles and Descriptions):**
      ---
      ${videoData}
    `;

    const result = await model.generateContent(prompt);
    const itinerary = result.response.text();

    // --- STEP 3: Send the final itinerary back to the user ---
    console.log('Successfully generated itinerary!');
    response.status(200).json({ itinerary });

  } catch (error) {
    console.error('--- A CRITICAL ERROR OCCURRED ---', error);

    response.status(500).json({
        error: 'Failed to generate itinerary due to an internal error.',
        details: error.message
    });
  }
}

