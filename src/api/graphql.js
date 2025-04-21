// src/api/graphql.js
export const listTikTokConnections = /* GraphQL */ `
  query ListTikTokConnections($userId: String!) {
    listWishfulConnectTikToks(filter: {userId: {eq: $userId}}) {
      items {
        id
        userId
        connectionId
        platform
        status
        sellerName
        shopId
        refreshToken
        createdAt
        updatedAt
      }
    }
  }
`;

export const onUpdateTikTokConnection = /* GraphQL */ `
  subscription OnUpdateTikTokConnection($userId: String!) {
    onUpdateWishfulConnectTikTok(userId: $userId) {
      id
      userId
      connectionId
      platform
      status
      sellerName
      shopId
      refreshToken
      createdAt
      updatedAt
    }
  }
`;

// Update the listAllOrderItems query to match exactly what works in the AppSync console
export const listAllOrderItems = /* GraphQL */ `
  query ListAllOrderItems {
    listWishfulConnectOrderItems {
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

// Update this query to match your actual schema
// GraphQL queries and mutations for the WishConnect app
// Update listOrdersByUser to match your schema
export const listOrdersByUser = /* OrdersAPI */ `
  query ListWishfulConnectOrderItems($userId: String!) {
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

// Update getOrderById to match your schema
export const getOrderById = /* OrdersAPI */ `
  query GetOrderItems($userId: String!, $orderId: String!) {
    listWishfulConnectOrderItems(filter: {
      userId: {
        eq: $userId
      },
      orderId: {
        eq: $orderId
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

// Update onUpdateOrder to match your schema's subscription
export const onUpdateOrder = /* OrdersAPI */ `
  subscription OnUpdateWishfulConnectOrderItems($userId: String!) {
    onUpdateWishfulConnectOrderItems(
      userId: $userId
    ) {
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
`;