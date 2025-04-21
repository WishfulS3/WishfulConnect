import { post } from 'aws-amplify/api';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { listTikTokConnections } from './graphql';

// Create a GraphQL client
const client = generateClient();

// Get TikTok connections for the current user
export async function getTikTokConnections() {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    const response = await client.query({
      query: listTikTokConnections,
      variables: { userId }
    });
    
    return response.data.listWishfulConnectTikToks.items;
  } catch (error) {
    console.error('Error fetching TikTok connections:', error);
    throw error;
  }
}

/**
 * Exchange TikTok authorization code for access token and store connection in DynamoDB
 * @param {string} code - The authorization code from TikTok
 * @param {string} userId - The user's ID from Cognito
 * @returns {Promise} - The API response
 */
export const exchangeTikTokAuthCode = async (code, userId) => {
  try {
    console.log('Exchanging code for TikTok:', code, 'for user:', userId);
    
    // Define the API endpoint
    const apiEndpoint = 'https://jdeznhmrm0.execute-api.eu-north-1.amazonaws.com/default/wish_tiktok_auth_handler';
    console.log('API endpoint:', apiEndpoint);
    
    // Prepare the request payload
    const payload = { code, userId };
    console.log('Request payload:', payload);
    
    // Make a direct fetch call to your API Gateway endpoint
    console.log('Sending fetch request...');
    const response = await fetch(`${apiEndpoint}?t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload),
    });
    
    // Log the full response for debugging
    console.log('API response received. Status:', response.status);
    
    const responseText = await response.text();
    console.log('API response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }
    
    // Parse the response text as JSON
    const data = JSON.parse(responseText);
    console.log('API success response:', data);
    return data;
  } catch (error) {
    console.error('Error exchanging TikTok auth code:', error);
    // Add more detailed error logging
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Fetch TikTok connections for a user
 * @param {string} userId - The user's ID from Cognito
 * @returns {Promise} - The API response with connections
 */
export const fetchTikTokConnections = async (userId) => {
  try {
    console.log('Fetching TikTok connections for user:', userId);
    
    // Call the GraphQL API using the client
    const response = await client.query({
      query: listTikTokConnections,
      variables: { userId },
      fetchPolicy: 'network-only' // Skip cache, always make network request
    });
    
    console.log('GraphQL response:', response);
    
    // Check if the expected data structure exists
    if (response.data && response.data.listWishfulConnectTikToks) {
      return response.data.listWishfulConnectTikToks.items || [];
    } else {
      console.warn('Unexpected response structure:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching TikTok connections:', error);
    return []; // Return empty array instead of throwing to prevent UI errors
  }
};

/**
 * Disconnect a TikTok store
 * @param {string} connectionId - The ID of the connection to disconnect
 * @returns {Promise} - The API response
 */
export const disconnectTikTokStore = async (connectionId) => {
  try {
    // For now, just log the connectionId
    console.log('Disconnecting TikTok store with ID:', connectionId);
    
    // In a real implementation:
    // const response = await del({
    //   apiName: 'wishconnectApi',
    //   path: `/tiktok/connections/${connectionId}`,
    // });
    // return response;
    
    // Return mock success response
    return {
      success: true,
      message: 'TikTok store disconnected successfully'
    };
  } catch (error) {
    console.error('Error disconnecting TikTok store:', error);
    throw error;
  }
};

// Simple delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Updates the user's preferred shipping provider for TikTok Shop
 * @param {string} userId - The user's ID
 * @param {string} shippingProviderId - The selected shipping provider ID
 * @returns {Promise} - The API response
 */
export const updateShippingProvider = async (userId, shippingProviderId) => {
  try {
    console.log('Updating shipping provider for user:', userId, 'to:', shippingProviderId);
    
    // Add a small delay before making the request (helps prevent rapid successive calls)
    await delay(500);
    
    // Define the API endpoint
    const apiEndpoint = 'https://pck03tge6c.execute-api.eu-north-1.amazonaws.com/default/wish_shippingprovider_update';
    
    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    
    // Make a direct fetch call to your API Gateway endpoint
    const response = await fetch(`${apiEndpoint}?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        userId: userId,
        shippingProviderId: shippingProviderId,
        timestamp: timestamp
      }),
    });
    
    // Log the response status for debugging
    console.log('API response received. Status:', response.status);
    
    const responseText = await response.text();
    console.log('API response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }
    
    // Parse the response text as JSON (if it's JSON)
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // If response is not JSON, use the text as is
      data = { message: responseText };
    }
    
    console.log('Shipping provider update successful:', data);
    return data;
  } catch (error) {
    console.error('Error updating shipping provider:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};