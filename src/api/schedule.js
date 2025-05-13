// src/api/schedule.js
import { getCurrentUser } from 'aws-amplify/auth';

// Constants
const API_ENDPOINT = 'https://wgofdwjhojhujpfrxi4dmgbbb4.appsync-api.eu-north-1.amazonaws.com/graphql';
const API_KEY = 'da2-u4lya7be65ghxii2asgqyu2zwy';

/**
 * Helper function to make GraphQL requests using fetch
 * @param {string} query - GraphQL query or mutation
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} - GraphQL response
 */
const executeGraphQL = async (query, variables = {}) => {
  try {
    console.log('Executing GraphQL query with fetch:', query);
    console.log('Variables:', variables);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('GraphQL response:', data);
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors.map(e => e.message).join('; '));
    }
    
    return data;
  } catch (error) {
    console.error('Error executing GraphQL query:', error);
    throw error;
  }
};

/**
 * Fetch scheduled pickups for the current user
 * @returns {Promise<Array>} Promise resolving to an array of scheduled pickup objects
 */
export const fetchScheduledPickups = async (page = 1, itemsPerPage = 20) => {
  try {
    console.log('Starting fetchScheduledPickups function');
    
    // Get current user
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    console.log('Extracted userId:', userId);
    
    // Query for scheduled pickups using listWishfulConnectPickups with a filter
    const query = `
      query ListPickups($filter: TableWishfulConnectPickupsFilterInput, $limit: Int, $nextToken: String) {
        listWishfulConnectPickups(filter: $filter, limit: $limit, nextToken: $nextToken) {
          items {
            pickupId
            userId
            address
            pickupDate
            readyTime
            closeTime
            itemCount
            weight
            contactName
            phoneNumber
            status
            createdAt
            referenceNumber
            shopId
          }
          nextToken
        }
      }
    `;
    
    const limit = itemsPerPage;
    const offset = (page - 1) * itemsPerPage;
    
    const response = await executeGraphQL(query, { 
      filter: {
        userId: {
          eq: userId
        }
      },
      limit,
      nextToken: offset > 0 ? String(offset) : null
    });
    
    // Check if response.data exists
    if (!response.data) {
      console.error('Response data is null or undefined');
      return { schedules: [], totalPages: 1 };
    }
    
    // Check if listWishfulConnectPickups exists
    if (!response.data.listWishfulConnectPickups) {
      console.error('listWishfulConnectPickups is missing from response');
      return { schedules: [], totalPages: 1 };
    }
    
    // Get all scheduled pickups
    const pickups = response.data.listWishfulConnectPickups.items || [];
    console.log(`Retrieved ${pickups.length} scheduled pickups`);
    
    // Process the items into schedule objects
    const schedules = pickups.map(pickup => {
      // Parse address JSON if it exists
      let addressObj = {};
      if (pickup.address) {
        try {
          addressObj = JSON.parse(pickup.address);
        } catch (e) {
          console.error('Error parsing address JSON:', e);
        }
      }
      
      return {
        id: pickup.pickupId,
        userId: pickup.userId,
        address: addressObj.formatted || addressObj.street || 'N/A',
        addressObj: addressObj,
        pickupDate: pickup.pickupDate,
        readyTime: pickup.readyTime,
        closeTime: pickup.closeTime,
        itemCount: pickup.itemCount || 0,
        weight: pickup.weight || 0,
        contactName: pickup.contactName,
        phoneNumber: pickup.phoneNumber,
        status: pickup.status,
        createdAt: pickup.createdAt,
        referenceNumber: pickup.referenceNumber,
        shopId: pickup.shopId
      };
    });
    
    // Calculate total pages
    const hasMore = response.data.listWishfulConnectPickups.nextToken != null;
    const totalPages = hasMore ? page + 1 : page;
    
    return { schedules, totalPages };
  } catch (error) {
    console.error('Error in fetchScheduledPickups:', error);
    return { schedules: [], totalPages: 1 };
  }
};

/**
 * Get details of a specific scheduled pickup
 * @param {string} pickupId - ID of the scheduled pickup
 * @returns {Promise<Object>} - Schedule details
 */
export const getScheduledPickupDetails = async (pickupId) => {
  try {
    console.log(`Fetching details for scheduled pickup: ${pickupId}`);
    
    const query = `
      query GetScheduledPickup($pickupId: String!) {
        getWishfulConnectPickups(pickupId: $pickupId) {
          pickupId
          userId
          address
          pickupDate
          readyTime
          closeTime
          itemCount
          weight
          contactName
          phoneNumber
          status
          createdAt
          referenceNumber
          shopId
        }
      }
    `;
    
    const response = await executeGraphQL(query, { pickupId });
    
    if (!response.data?.getWishfulConnectPickups) {
      throw new Error(`Scheduled pickup ${pickupId} not found`);
    }
    
    const pickup = response.data.getWishfulConnectPickups;
    
    // Parse address JSON if it exists
    let addressObj = {};
    if (pickup.address) {
      try {
        addressObj = JSON.parse(pickup.address);
      } catch (e) {
        console.error('Error parsing address JSON:', e);
      }
    }
    
    return {
      id: pickup.pickupId,
      userId: pickup.userId,
      address: addressObj.formatted || addressObj.street || 'N/A',
      addressObj: addressObj,
      pickupDate: pickup.pickupDate,
      readyTime: pickup.readyTime,
      closeTime: pickup.closeTime,
      itemCount: pickup.itemCount || 0,
      weight: pickup.weight || 0,
      contactName: pickup.contactName,
      phoneNumber: pickup.phoneNumber,
      status: pickup.status,
      createdAt: pickup.createdAt,
      referenceNumber: pickup.referenceNumber,
      shopId: pickup.shopId
    };
  } catch (error) {
    console.error(`Error fetching scheduled pickup ${pickupId}:`, error);
    throw error;
  }
};