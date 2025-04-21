// src/api/orders.js
import { getCurrentUser } from 'aws-amplify/auth';

// Constants
const API_ENDPOINT = 'https://xbsjuczggret7mxcy27hpmc4nu.appsync-api.eu-north-1.amazonaws.com/graphql';
const API_KEY = 'da2-ydcbdme4x5gehesrhrmi6ltdja';

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
 * Fetch orders for the current user via direct fetch
 * @returns {Promise<Array>} Promise resolving to an array of grouped order objects
 */
export const fetchOrders = async () => {
  try {
    console.log('Starting fetchOrders function using direct fetch');
    
    // Get current user
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    console.log('Extracted userId:', userId);
    
    // Query using the exact field name that works in the console
    const query = `
      query ListOrders($userId: String!) {
        listWishfulConnectOrderItems(filter: {
          userId: {
            eq: $userId
          }
        }) {
          items {
            orderId
            itemId
            createTime
            packageId
            price
            productId
            productName
            sellerSku
            skuId
            skuName
            status
            userId
            quantity
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
    
    // Check if listWishfulConnectOrderItems exists
    if (!response.data.listWishfulConnectOrderItems) {
      console.error('listWishfulConnectOrderItems is missing from response');
      return [];
    }
    
    // Get all items
    const allItems = response.data.listWishfulConnectOrderItems.items || [];
    console.log(`Retrieved ${allItems.length} total order items`);
    
    // Filter for this user's items (should be redundant with the query filter, but just to be safe)
    const items = allItems.filter(item => item.userId === userId);
    console.log(`Filtered to ${items.length} items for user ${userId}`);
    
    if (items.length === 0) {
      console.log('No orders found for this user.');
      return [];
    }
    
    // Log each item's orderId to check for grouping
    console.log('Order IDs in response:', items.map(item => item.orderId));
    
    // Group flat items[] array into orders[]
    const orderMap = {};
    items.forEach(item => {
      console.log(`Processing item for orderId: ${item.orderId}`);
      
      // Initialize a container for this orderId
      if (!orderMap[item.orderId]) {
        console.log(`Creating new order container for orderId: ${item.orderId}`);
        orderMap[item.orderId] = {
          id: item.orderId,
          date: item.createTime
            ? new Date(parseInt(item.createTime, 10)).toISOString()
            : new Date().toISOString(),
          status: item.status || 'Processing',
          items: [],
          total: 0
        };
      }
      
      // Parse price JSON blob
      let priceObj = {};
      try {
        console.log(`Price data for item ${item.itemId}:`, item.price);
        priceObj = typeof item.price === 'string'
          ? JSON.parse(item.price)
          : item.price;
        console.log('Parsed price object:', priceObj);
      } catch (e) {
        console.error(`Error parsing price JSON for item ${item.itemId}:`, e);
        console.error('Raw price value:', item.price);
      }
      
      const price = parseFloat(priceObj.sale || priceObj.original || 0);
      const quantity = parseInt(item.quantity, 10) || 1;
      console.log(`Item ${item.itemId}: price=${price}, quantity=${quantity}`);
      
      orderMap[item.orderId].items.push({
        id: item.itemId,
        name: item.productName || 'Product',
        price,
        quantity
      });
      
      orderMap[item.orderId].total += price * quantity;
      console.log(`Updated total for order ${item.orderId}: ${orderMap[item.orderId].total}`);
    });
    
    const result = Object.values(orderMap);
    console.log(`Returning ${result.length} grouped orders`);
    console.log('Final orders structure:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in fetchOrders:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Fetch a single order by ID (from the grouped list)
 */
export const fetchOrderById = async (orderId) => {
  try {
    console.log(`Fetching order by ID: ${orderId}`);
    
    // Get current user
    const user = await getCurrentUser();
    const userId = user.sub || user.userId || user.username;
    
    // Query for specific order
    const query = `
      query GetOrder($userId: String!, $orderId: String!) {
        listWishfulConnectOrderItems(filter: {
          userId: { eq: $userId },
          orderId: { eq: $orderId }
        }) {
          items {
            orderId
            itemId
            createTime
            packageId
            price
            productId
            productName
            sellerSku
            skuId
            skuName
            status
            userId
            quantity
          }
        }
      }
    `;
    
    const response = await executeGraphQL(query, { userId, orderId });
    
    if (!response.data?.listWishfulConnectOrderItems?.items?.length) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    // Group items into a single order object
    const items = response.data.listWishfulConnectOrderItems.items;
    const order = {
      id: orderId,
      date: items[0].createTime
        ? new Date(parseInt(items[0].createTime, 10)).toISOString()
        : new Date().toISOString(),
      status: items[0].status || 'Processing',
      items: [],
      total: 0
    };
    
    // Process each item
    items.forEach(item => {
      let priceObj = {};
      try {
        priceObj = typeof item.price === 'string'
          ? JSON.parse(item.price)
          : item.price;
      } catch (e) {
        console.error(`Error parsing price JSON for item ${item.itemId}:`, e);
      }
      
      const price = parseFloat(priceObj.sale || priceObj.original || 0);
      const quantity = parseInt(item.quantity, 10) || 1;
      
      order.items.push({
        id: item.itemId,
        name: item.productName || 'Product',
        price,
        quantity
      });
      
      order.total += price * quantity;
    });
    
    return order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Update shipping method (mock implementation)
 */
export const updateShippingMethod = async (orderId, shippingMethod) => {
  const order = await fetchOrderById(orderId);
  const trackingNumber = `${shippingMethod}${Math.floor(Math.random()*1e7)}`;
  const updatedOrder = { ...order, shippingMethod, trackingNumber };
  console.log('Updated shipping method locally:', updatedOrder);
  // TODO: replace with a real GraphQL mutation
  return updatedOrder;
};

/**
 * Cancel an order (mock implementation)
 */
export const cancelOrder = async (orderId) => {
  const order = await fetchOrderById(orderId);
  const updatedOrder = { ...order, status: 'Canceled' };
  console.log('Canceled order locally:', updatedOrder);
  // TODO: replace with a real GraphQL mutation
  return updatedOrder;
};

/**
 * Get summary statistics for this user's orders
 */
export const getOrderStatistics = async () => {
  const orders = await fetchOrders();
  return {
    total: orders.length,
    processing: orders.filter(o => o.status === 'Processing').length,
    shipped: orders.filter(o => o.status === 'Shipped').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    canceled: orders.filter(o => o.status === 'Canceled').length,
    totalValue: orders.reduce((sum, o) => sum + o.total, 0)
  };
};

/**
 * Search through the grouped orders by keyword
 */
export const searchOrders = async (keyword) => {
  const lc = keyword.toLowerCase();
  const orders = await fetchOrders();
  return orders.filter(order =>
    order.id.toLowerCase().includes(lc) ||
    order.status.toLowerCase().includes(lc) ||
    order.items.some(i => i.name.toLowerCase().includes(lc))
  );
};

/**
 * Get the schema definition (for debugging)
 */
export const getSchema = async () => {
  const query = `
    {
      __schema {
        queryType {
          fields {
            name
          }
        }
      }
    }
  `;
  
  return executeGraphQL(query);
};

export default {
  fetchOrders,
  fetchOrderById,
  updateShippingMethod,
  cancelOrder,
  getOrderStatistics,
  searchOrders,
  getSchema
};