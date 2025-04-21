// src/api/package.js
import { getCurrentUser } from 'aws-amplify/auth';

// Constants
const API_ENDPOINT = 'https://el57rmvsh5d2vguphm5kvn4hfe.appsync-api.eu-north-1.amazonaws.com/graphql';
const API_KEY = 'da2-u7jznx6u35hzrfbeztyweetqyq';

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
 * Fetch packages for the current user
 * @returns {Promise<Array>} Promise resolving to an array of package objects
 */
export const fetchPackages = async () => {
  try {
    console.log('Starting fetchPackages function using direct fetch');
    
    // Get current user
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    console.log('Extracted userId:', userId);
    
    // Query for packages belonging to this user
    const query = `
      query ListPackages($userId: String!) {
        listWishfulConnectPackages(filter: {
          userId: {
            eq: $userId
          }
        }) {
          items {
            packageId
            userId
            createTime
            orderIds
            shippingProvider
            status
            trackingNumber
            estimatedDeliveryDate
            recipient_address
            items
            shopId
            updateTime
          }
        }
      }
    `;
    
    const response = await executeGraphQL(query, { userId });
    
    // Check if response.data exists
    if (!response.data) {
      console.error('Response data is null or undefined');
      return [];
    }
    
    // Check if listWishfulConnectPackages exists
    if (!response.data.listWishfulConnectPackages) {
      console.error('listWishfulConnectPackages is missing from response');
      return [];
    }
    
    // Get all packages
    const packages = response.data.listWishfulConnectPackages.items || [];
    console.log(`Retrieved ${packages.length} packages for user ${userId}`);
    
    if (packages.length === 0) {
      console.log('No packages found for this user.');
      return [];
    }
    
    // Format packages for display
    const formattedPackages = packages.map(pkg => {
      // Parse orderIds if it's a string or array
      let orderIdsArray = [];
      try {
        if (typeof pkg.orderIds === 'string') {
          orderIdsArray = JSON.parse(pkg.orderIds);
        } else if (Array.isArray(pkg.orderIds)) {
          orderIdsArray = pkg.orderIds;
        }
      } catch (e) {
        console.error(`Error parsing orderIds for package ${pkg.packageId}:`, e);
      }
      
      // Parse recipient_address if it's a string or object
      let addressObj = {};
      try {
        if (typeof pkg.recipient_address === 'string') {
          addressObj = JSON.parse(pkg.recipient_address);
        } else if (typeof pkg.recipient_address === 'object') {
          addressObj = pkg.recipient_address;
        }
      } catch (e) {
        console.error(`Error parsing recipient_address for package ${pkg.packageId}:`, e);
      }
      
      // Parse items if it's a string or array
      let itemsArray = [];
      let itemsCount = 0;
      try {
        if (typeof pkg.items === 'string') {
          // If it's an empty string or just "[]", treat as empty array
          if (!pkg.items || pkg.items.trim() === '[]' || pkg.items.trim() === '') {
            itemsArray = [];
          } else {
            // Try to parse the JSON string
            itemsArray = JSON.parse(pkg.items);
          }
        } else if (Array.isArray(pkg.items)) {
          itemsArray = pkg.items;
        } else {
          // If it's neither a string nor an array, default to empty array
          itemsArray = [];
        }
        
        // Set the items count
        itemsCount = Array.isArray(itemsArray) ? itemsArray.length : 0;
      } catch (e) {
        console.error(`Error parsing items for package ${pkg.packageId}:`, e);
        // Default to empty array if parsing fails
        itemsArray = [];
        itemsCount = 0;
      }
      
      // Format the address from recipient_address
      let address = 'No address provided';
      if (addressObj.fulladdress) {
        address = addressObj.fulladdress;
      } else {
        const addressParts = [
          addressObj.name,
          addressObj.address1,
          addressObj.address2,
          addressObj.address3,
          addressObj.address4,
          addressObj.zipCode,
          addressObj.region_code
        ].filter(Boolean);
        
        if (addressParts.length > 0) {
          address = addressParts.join(', ');
        }
      }
      
      // Format the dates
      const createTimeDate = pkg.createTime 
        ? new Date(parseInt(pkg.createTime, 10) * 1000).toISOString()
        : null;
        
      const estimatedDeliveryDate = pkg.estimatedDeliveryDate
        ? new Date(parseInt(pkg.estimatedDeliveryDate, 10) * 1000).toISOString()
        : null;
      
      // Map status to more user-friendly values
      let displayStatus = pkg.status || 'Processing';
      if (displayStatus === 'TO_FULFILL') {
        displayStatus = 'Processing';
      } else if (displayStatus === 'FULFILLED') {
        displayStatus = 'Shipped';
      } else if (displayStatus === 'DELIVERED') {
        displayStatus = 'Delivered';
      }
      
      // Calculate weight safely
      let weight = '0 kg';
      try {
        if (Array.isArray(itemsArray) && itemsArray.length > 0) {
          const totalWeight = itemsArray.reduce((sum, item) => {
            // Check if item exists and has a weight property
            const itemWeight = item && typeof item.weight !== 'undefined' ? 
              parseFloat(item.weight) || 0 : 0;
            return sum + itemWeight;
          }, 0);
          weight = `${totalWeight} kg`;
        }
      } catch (e) {
        console.error(`Error calculating weight for package ${pkg.packageId}:`, e);
      }
      
      return {
        id: pkg.packageId,
        userId: pkg.userId,
        createTime: createTimeDate,
        orderIds: orderIdsArray,
        orderId: orderIdsArray.length > 0 ? orderIdsArray[0] : 'N/A', // For display in table
        address: address,
        carrier: pkg.shippingProvider || 'N/A',
        status: displayStatus,
        trackingNumber: pkg.trackingNumber || 'N/A',
        estimatedDelivery: estimatedDeliveryDate,
        items: itemsCount,
        weight: weight,
        shopId: pkg.shopId || 'N/A',
        updateTime: pkg.updateTime 
          ? new Date(parseInt(pkg.updateTime, 10)).toISOString()
          : null,
        // Store the raw data for detailed view
        rawData: pkg
      };
    });
    
    console.log('Formatted packages:', formattedPackages);
    return formattedPackages;
  } catch (error) {
    console.error('Error in fetchPackages:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Fetch a single package by ID
 * @param {string} packageId - The ID of the package to fetch
 * @returns {Promise<Object>} - The package details
 */
export const fetchPackageById = async (packageId) => {
  try {
    console.log(`Fetching package by ID: ${packageId}`);
    
    // Get current user
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    
    // Query for specific package
    const query = `
      query GetPackage($packageId: String!, $userId: String!) {
        getWishfulConnectPackages(packageId: $packageId, userId: $userId) {
          packageId
          userId
          createTime
          deliveryTime
          estimatedDeliveryDate
          failedDeliveryAttempts
          handoverTime
          items
          lastMileTrackingNumber
          orderIds
          pickupTime
          recipient_address
          shippingProvider
          shopId
          status
          trackingInfo
          trackingNumber
          updateTime
        }
      }
    `;
    
    const response = await executeGraphQL(query, { packageId, userId });
    
    if (!response.data?.getWishfulConnectPackages) {
      throw new Error(`Package ${packageId} not found`);
    }
    
    const pkg = response.data.getWishfulConnectPackages;
    
    // Parse complex fields
    let orderIdsArray = [];
    let addressObj = {};
    let itemsArray = [];
    let trackingInfoArray = [];
    
    try {
      // Parse orderIds
      if (typeof pkg.orderIds === 'string') {
        orderIdsArray = JSON.parse(pkg.orderIds);
      } else if (Array.isArray(pkg.orderIds)) {
        orderIdsArray = pkg.orderIds;
      }
      
      // Parse recipient_address
      if (typeof pkg.recipient_address === 'string') {
        addressObj = JSON.parse(pkg.recipient_address);
      } else if (typeof pkg.recipient_address === 'object') {
        addressObj = pkg.recipient_address;
      }
      
      // Parse items
      if (typeof pkg.items === 'string') {
        // If it's an empty string or just "[]", treat as empty array
        if (!pkg.items || pkg.items.trim() === '[]' || pkg.items.trim() === '') {
          itemsArray = [];
        } else {
          // Try to parse the JSON string
          itemsArray = JSON.parse(pkg.items);
        }
      } else if (Array.isArray(pkg.items)) {
        itemsArray = pkg.items;
      } else {
        // If it's neither a string nor an array, default to empty array
        itemsArray = [];
      }
      
      // Parse trackingInfo
      if (typeof pkg.trackingInfo === 'string') {
        trackingInfoArray = JSON.parse(pkg.trackingInfo);
      } else if (Array.isArray(pkg.trackingInfo)) {
        trackingInfoArray = pkg.trackingInfo;
      }
    } catch (e) {
      console.error(`Error parsing complex fields for package ${packageId}:`, e);
    }
    
    // Format dates
    const formatDate = (timestamp) => {
      if (!timestamp) return null;
      try {
        const num = parseInt(timestamp, 10);
        // If timestamp is in seconds (Unix timestamp)
        if (num < 10000000000) {
          return new Date(num * 1000).toISOString();
        }
        // If timestamp is in milliseconds
        return new Date(num).toISOString();
      } catch (e) {
        return null;
      }
    };
    
    // Format the address
    let address = 'No address provided';
    if (addressObj.fulladdress) {
      address = addressObj.fulladdress;
    } else {
      const addressParts = [
        addressObj.name,
        addressObj.address1,
        addressObj.address2,
        addressObj.address3,
        addressObj.address4,
        addressObj.zipCode,
        addressObj.region_code
      ].filter(Boolean);
      
      if (addressParts.length > 0) {
        address = addressParts.join(', ');
      }
    }
    
    // Map status to more user-friendly values
    let displayStatus = pkg.status || 'Processing';
    if (displayStatus === 'TO_FULFILL') {
      displayStatus = 'Processing';
    } else if (displayStatus === 'FULFILLED') {
      displayStatus = 'Shipped';
    } else if (displayStatus === 'DELIVERED') {
      displayStatus = 'Delivered';
    }
    
    // Calculate weight safely
    let weight = '0 kg';
    try {
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        const totalWeight = itemsArray.reduce((sum, item) => {
          // Check if item exists and has a weight property
          const itemWeight = item && typeof item.weight !== 'undefined' ? 
            parseFloat(item.weight) || 0 : 0;
          return sum + itemWeight;
        }, 0);
        weight = `${totalWeight} kg`;
      }
    } catch (e) {
      console.error(`Error calculating weight for package ${pkg.packageId}:`, e);
    }
    
    // Return formatted package
    return {
      id: pkg.packageId,
      userId: pkg.userId,
      createTime: formatDate(pkg.createTime),
      deliveryTime: formatDate(pkg.deliveryTime),
      estimatedDelivery: formatDate(pkg.estimatedDeliveryDate),
      failedDeliveryAttempts: pkg.failedDeliveryAttempts || [],
      handoverTime: formatDate(pkg.handoverTime),
      items: itemsArray,
      itemCount: Array.isArray(itemsArray) ? itemsArray.length : 0,
      lastMileTrackingNumber: pkg.lastMileTrackingNumber || 'N/A',
      orderIds: orderIdsArray,
      orderId: orderIdsArray.length > 0 ? orderIdsArray[0] : 'N/A',
      pickupTime: formatDate(pkg.pickupTime),
      recipient_address: addressObj,
      address: address,
      carrier: pkg.shippingProvider || 'N/A',
      shopId: pkg.shopId || 'N/A',
      status: displayStatus,
      trackingInfo: trackingInfoArray,
      trackingNumber: pkg.trackingNumber || 'N/A',
      updateTime: formatDate(pkg.updateTime),
      weight: weight,
      // Store the raw data
      rawData: pkg
    };
  } catch (error) {
    console.error(`Error fetching package ${packageId}:`, error);
    throw error;
  }
};

/**
 * Debug function to help understand the package structure
 * @returns {Promise<Object>} - A sample package object
 */
export const debugPackageStructure = async () => {
  try {
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    
    const query = `
      query ListPackages($userId: String!, $limit: Int!) {
        listWishfulConnectPackages(filter: {
          userId: {
            eq: $userId
          }
        }, limit: $limit) {
          items {
            packageId
            userId
            createTime
            orderIds
            recipient_address
            shippingProvider
            status
            trackingNumber
            estimatedDeliveryDate
            items
            shopId
            updateTime
          }
        }
      }
    `;
    
    const response = await executeGraphQL(query, { userId, limit: 1 });
    
    if (response.data?.listWishfulConnectPackages?.items?.length > 0) {
      const samplePackage = response.data.listWishfulConnectPackages.items[0];
      console.log('Sample package structure:', JSON.stringify(samplePackage, null, 2));
      
      // Log specific fields to understand their structure
      console.log('orderIds type:', typeof samplePackage.orderIds);
      console.log('orderIds value:', samplePackage.orderIds);
      
      console.log('recipient_address type:', typeof samplePackage.recipient_address);
      console.log('recipient_address value:', samplePackage.recipient_address);
      
      console.log('items type:', typeof samplePackage.items);
      console.log('items value:', samplePackage.items);
      
      return samplePackage;
    }
    
    return null;
  } catch (error) {
    console.error('Error in debugPackageStructure:', error);
    return null;
  }
};

/**
 * Get package statistics for the current user
 */
export const getPackageStatistics = async () => {
  const packages = await fetchPackages();
  return {
    total: packages.length,
    processing: packages.filter(p => p.status === 'Processing').length,
    inTransit: packages.filter(p => p.status === 'Shipped').length,
    outForDelivery: packages.filter(p => p.status === 'Out for Delivery').length,
    delivered: packages.filter(p => p.status === 'Delivered').length
  };
};

/**
 * Search packages by keyword
 */
export const searchPackages = async (keyword) => {
  const lc = keyword.toLowerCase();
  const packages = await fetchPackages();
  return packages.filter(pkg =>
    pkg.id.toLowerCase().includes(lc) ||
    pkg.status.toLowerCase().includes(lc) ||
    pkg.carrier.toLowerCase().includes(lc) ||
    pkg.trackingNumber.toLowerCase().includes(lc) ||
    pkg.address.toLowerCase().includes(lc)
  );
};

/**
 * Get the current schema definition
 * This is useful for debugging when the schema changes
 */
export const getSchema = async () => {
  const query = `
    {
      __schema {
        types {
          name
          kind
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;
  
  return executeGraphQL(query);
};

/**
 * Create a shipping order for a package
 * @param {string} packageId - The ID of the package to ship
 * @returns {Promise<Object>} - The shipping order details
 */
export const createShippingOrder = async (packageId) => {
  try {
    console.log(`API: Creating shipping order for package ${packageId}`);
    
    // First, fetch the complete package details to get all required information
    const packageDetails = await fetchPackageById(packageId);
    
    // Prepare the payload with all necessary shipping information
    // Removed items field since it's not needed
    const payload = {
      packageId: packageId,
      userId: packageDetails.userId,
      orderId: packageDetails.orderId,
      recipient: packageDetails.recipient_address,
      address: packageDetails.address,
      shopId: packageDetails.shopId
    };
    
    console.log('Sending shipping request with payload:', payload);
    
    // Call the Lambda function through API Gateway
    const response = await fetch('https://1erbu5pnhe.execute-api.eu-north-1.amazonaws.com/default/wish_shippackage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Shipping order created successfully:', data);
    
    // Handle both response formats - either direct data or nested data.data
    return data.data || data;
  } catch (error) {
    console.error('Error creating shipping order:', error);
    throw error;
  }
};

export default {
  fetchPackages,
  fetchPackageById,
  getPackageStatistics,
  searchPackages,
  debugPackageStructure,
  getSchema
};