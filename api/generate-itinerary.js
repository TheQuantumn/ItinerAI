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
// Use the Flash model for speed and its generous free tier.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// This tells Vercel to use the Edge runtime, which is better for streaming,
// and increases the timeout just in case.
export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

// --- Helper function to get video details ---
async function getVideoDetails(query, maxResults = 5) { // Reduced to 5 for speed
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
    return '';
  }

  let combinedText = '';
  videos.forEach(video => {
    const title = video.snippet.title;
    const description = video.snippet.description;
    combinedText += `Video Title: ${title}\nVideo Description: ${description}\n\n---\n\n`;
  });

  console.log(`SUCCESS: Gathered titles and descriptions for ${videos.length} videos.`);
  return combinedText;
}

// --- Main Serverless Function (Now handles OPTIONS requests) ---
export default async function handler(request) {
  // --- THIS IS THE NEW CORS FIX ---
  // Handle the preflight 'OPTIONS' request sent by browsers
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow any origin
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Existing logic starts here
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const startLocation = searchParams.get('startLocation');
  const duration = searchParams.get('duration');
  const tripType = searchParams.get('tripType');
  const budget = searchParams.get('budget');

  if (!destination || !startLocation || !duration || !tripType || !budget) {
    return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const searchQuery = `${duration} day ${tripType} trip to ${destination} travel guide`;
    const videoData = await getVideoDetails(searchQuery);

    if (!videoData) {
      return new Response(JSON.stringify({ error: 'Could not find any relevant video data.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

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
      7. Format the output using Markdown.

      **Video Data (Titles and Descriptions):**
      ---
      ${videoData}
    `;

    const stream = await model.generateContentStream(prompt);

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk.text());
      },
    });

    const readableStream = stream.stream.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*', // Also include on the main response
      },
    });

  } catch (error) {
    console.error('--- A CRITICAL ERROR OCCURRED ---', error);
    return new Response(JSON.stringify({ error: 'Failed to generate itinerary.', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}


