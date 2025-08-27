// Import necessary libraries
import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';
// Import the Google Generative AI library
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the latest and most powerful Gemini 2.5 Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

// --- Helper function to search videos and get transcripts ---
async function searchAndGetTranscripts(query, maxResults = 10) {
  console.log(`Searching for videos with query: "${query}"`);
  const searchResponse = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults,
    order: 'relevance',
  });

  const videoIds = searchResponse.data.items.map(item => item.id.videoId);
  if (videoIds.length === 0) {
    console.log(`No videos found for query: "${query}"`);
    return ''; // Return empty string if no videos found
  }

  console.log(`Found ${videoIds.length} videos. Fetching transcripts...`);
  let allTranscripts = '';
  for (const videoId of videoIds) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const transcriptText = transcript.map(t => t.text).join(' ');
      allTranscripts += transcriptText + '\n\n';
    } catch (error) {
      console.log(`Could not fetch transcript for video ${videoId}, skipping.`);
    }
  }
  return allTranscripts;
}


// --- This is our main serverless function ---
export default async function handler(request, response) {
  // Destructure all the new parameters from the request query
  const { destination, startLocation, duration, tripType, budget } = request.query;

  // Validate all the required inputs
  if (!destination || !startLocation || !duration || !tripType || !budget) {
    return response.status(400).json({
      error: 'Missing required parameters. Please provide destination, startLocation, duration, tripType, and budget.'
    });
  }

  try {
    // --- STEP 1 & 2: Search and Get Transcripts (with fallback) ---
    const specificSearchQuery = `${duration} day ${tripType} trip to ${destination} from ${startLocation} travel guide`;
    let transcripts = await searchAndGetTranscripts(specificSearchQuery);

    // If the specific search yields no transcripts, try a broader search
    if (!transcripts) {
      console.log('Specific search failed. Trying a broader search...');
      const broadSearchQuery = `${destination} travel guide`;
      transcripts = await searchAndGetTranscripts(broadSearchQuery, 15); // Get a few more videos on the broad search
    }

    // If still no transcripts, then we can't proceed
    if (!transcripts) {
      return response.status(500).json({ error: 'Could not fetch any transcripts for the destination after multiple attempts.' });
    }

    // --- STEP 3: Use Gemini with a more detailed prompt to create the itinerary ---
    console.log('Sending transcripts and detailed constraints to Gemini...');

    const prompt = `
      You are an expert travel agent. Your task is to create a detailed and practical travel itinerary based on the provided text from multiple YouTube video transcripts. You must adhere strictly to all the user's constraints.

      **User's Trip Details:**
      - **Trip Origin:** ${startLocation}
      - **Destination:** ${destination}
      - **Duration:** ${duration} days
      - **Trip Style:** ${tripType}
      - **Total Budget (approximate):** ${budget}

      **Your Task:**
      1. Analyze the following travel video transcripts for '${destination}'.
      2. Create a logical, day-by-day itinerary for a ${duration}-day trip.
      3. The itinerary must match the **${tripType}** style. Prioritize activities, sights, and restaurants mentioned in the transcripts that fit this style.
      4. Provide an estimated daily cost breakdown and ensure the total trip cost stays within the approximate budget of **${budget}**.
      5. If the trip is international (e.g., from ${startLocation} to ${destination}), include a note about estimated travel time and potential flight costs, but focus the detailed itinerary on the destination itself.
      6. Include any unique, practical tips mentioned by the video creators.

      **Video Transcripts:**
      ---
      ${transcripts}
    `;

    const result = await model.generateContent(prompt);
    const itinerary = result.response.text();

    // --- STEP 4: Send the final itinerary back to the user ---
    console.log('Successfully generated itinerary!');
    response.status(200).json({ itinerary });

  } catch (error) {
    console.error('An error occurred:', error);
    response.status(500).json({ error: 'Failed to generate itinerary.' });
  }
}
