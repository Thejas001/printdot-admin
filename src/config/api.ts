// Global API Configuration
export const API_CONFIG = {
  // Base URL for the API - change this to switch between environments
  BASE_URL: 'https://fourdotsapp-prod.azurewebsites.net',

  
  // API endpoints
  ENDPOINTS: {
    // Authentication
    REGISTER_LOGIN: '/api/account/register-or-login',
    VERIFY_OTP: '/api/account/verify-otp',
    
    // Orders
    ORDERS: '/api/orders',
    ORDER_DETAILS: (id: string | number) => `/api/order/${id}`,
    ORDER_STATUS: (id: string | number) => `/api/order/${id}/status`,
    ORDER_COMMENT: '/api/order/comment',
    
    // Site Settings
    COD_STATUS: '/api/cod/status',
    COD_TOGGLE: '/api/cod/toggle',
    SITE_SETTINGS: '/api/site-settings',
    
    // Users
    USER_LIST: '/api/user/admin/list',
    USER_CREATE: '/api/user/admin/create-by-phone',
    
    // Documents
    DOWNLOAD_ORDERITEM_ZIP: (orderItemId: string | number) => `/api/document/download-zip/${orderItemId}`,
  },
  
  // Helper function to get full URL
  getFullUrl: (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
  },
  
  // Environment-specific configurations (optional - for future use)
  ENVIRONMENTS: {
    DEVELOPMENT: 'https://localhost:5001',
    STAGING: 'https://fourdotsapp.azurewebsites.net',
    PRODUCTION: 'https://fourdotsapp-prod.azurewebsites.net',
  }
};

// Export individual endpoints for convenience
export const {
  REGISTER_LOGIN,
  VERIFY_OTP,
  ORDERS,
  ORDER_DETAILS,
  ORDER_STATUS,
  ORDER_COMMENT,
  COD_STATUS,
  COD_TOGGLE,
  SITE_SETTINGS,
  USER_LIST,
  USER_CREATE,
  DOWNLOAD_ORDERITEM_ZIP,
} = API_CONFIG.ENDPOINTS;
