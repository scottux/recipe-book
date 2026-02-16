import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const recipeAPI = {
  // Get all recipes with optional filters
  getAll: (params = {}) => api.get('/recipes', { params }),
  
  // Get single recipe
  getById: (id) => api.get(`/recipes/${id}`),
  
  // Create recipe manually
  create: (data) => api.post('/recipes', data),
  
  // Update recipe
  update: (id, data) => api.put(`/recipes/${id}`, data),
  
  // Toggle recipe lock status
  toggleLock: (id) => api.put(`/recipes/${id}/lock`),
  
  // Delete recipe
  delete: (id) => api.delete(`/recipes/${id}`),
  
  // Scrape recipe from URL
  scrape: (url) => api.post('/recipes/scrape', { url }),
  
  // Get filter options
  getFilterOptions: () => api.get('/recipes/filter-options'),
  
  // Get favorite recipe sites
  getFavoriteSites: () => api.get('/recipes/favorite-sites'),
  
  // Search for recipes across the web
  searchWeb: (query, siteIds = null) => api.post('/recipes/search-web', { query, siteIds })
};

export const collectionAPI = {
  // Get all collections
  getAll: () => api.get('/collections'),
  
  // Get single collection
  getById: (id) => api.get(`/collections/${id}`),
  
  // Create collection
  create: (data) => api.post('/collections', data),
  
  // Update collection
  update: (id, data) => api.put(`/collections/${id}`, data),
  
  // Delete collection
  delete: (id) => api.delete(`/collections/${id}`),
  
  // Add recipe to collection
  addRecipe: (collectionId, recipeId) => 
    api.post(`/collections/${collectionId}/recipes`, { recipeId }),
  
  // Remove recipe from collection
  removeRecipe: (collectionId, recipeId) => 
    api.delete(`/collections/${collectionId}/recipes/${recipeId}`),
  
  // Reorder recipes in collection
  reorderRecipes: (collectionId, recipeIds) => 
    api.put(`/collections/${collectionId}/recipes/reorder`, { recipeIds })
};

export const mealPlanAPI = {
  // Get all meal plans (optional: filter by isTemplate)
  getAll: (params = {}) => api.get('/meal-plans', { params }),
  
  // Get single meal plan
  getById: (id) => api.get(`/meal-plans/${id}`),
  
  // Create meal plan
  create: (data) => api.post('/meal-plans', data),
  
  // Update meal plan
  update: (id, data) => api.put(`/meal-plans/${id}`, data),
  
  // Delete meal plan
  delete: (id) => api.delete(`/meal-plans/${id}`),
  
  // Add meal to plan
  addMeal: (planId, mealData) => 
    api.post(`/meal-plans/${planId}/meals`, mealData),
  
  // Update specific meal
  updateMeal: (planId, mealId, data) => 
    api.put(`/meal-plans/${planId}/meals/${mealId}`, data),
  
  // Remove meal from plan
  removeMeal: (planId, mealId) => 
    api.delete(`/meal-plans/${planId}/meals/${mealId}`),
  
  // Remove specific recipe from meal
  removeRecipeFromMeal: (planId, mealId, recipeId) => 
    api.delete(`/meal-plans/${planId}/meals/${mealId}/recipes/${recipeId}`),
  
  // Generate shopping list
  generateShoppingList: (planId) => 
    api.get(`/meal-plans/${planId}/shopping-list`),
  
  // Duplicate meal plan
  duplicate: (planId, data) => 
    api.post(`/meal-plans/${planId}/duplicate`, data)
};

export const shoppingListAPI = {
  getAll: () => api.get('/shopping-lists'),
  getById: (id) => api.get(`/shopping-lists/${id}`),
  create: (data) => api.post('/shopping-lists', data),
  update: (id, data) => api.put(`/shopping-lists/${id}`, data),
  delete: (id) => api.delete(`/shopping-lists/${id}`),
  generateFromRecipe: (recipeId, data) => api.post(`/shopping-lists/from-recipe/${recipeId}`, data),
  generateFromMealPlan: (planId, data) => api.post(`/shopping-lists/from-meal-plan/${planId}`, data),
  addItem: (id, data) => api.post(`/shopping-lists/${id}/items`, data),
  updateItem: (id, itemId, data) => api.put(`/shopping-lists/${id}/items/${itemId}`, data),
  deleteItem: (id, itemId) => api.delete(`/shopping-lists/${id}/items/${itemId}`),
  getShareLink: (id) => api.get(`/shopping-lists/${id}/share`),
};

export const exportAPI = {
  // Export recipe in specified format (pdf, json, markdown)
  exportRecipe: (recipeId, format = 'pdf') => {
    const url = `/export/recipe/${recipeId}?format=${format}`;
    return api.get(url, {
      responseType: 'blob', // Important for file downloads
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                 format === 'pdf' ? 'application/pdf' : 
                 'text/markdown'
      }
    });
  },
  
  // Export multiple recipes as ZIP
  exportMultiple: (recipeIds, format = 'pdf') => {
    return api.post('/export/bulk', 
      { recipeIds, format },
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/zip'
        }
      }
    );
  },
  
  // Export collection as professional PDF cookbook
  exportCollectionCookbook: (collectionId) => {
    return api.get(`/export/collection/${collectionId}/cookbook`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
  },
  
  // Export meal plan as PDF calendar view
  exportMealPlan: (planId) => {
    return api.get(`/export/meal-plan/${planId}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
  },
  
  // Export shopping list as print-friendly PDF
  exportShoppingList: (listId) => {
    return api.get(`/export/shopping-list/${listId}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
  },
  
  // Export full user data backup as JSON
  exportFullBackup: () => {
    return api.get('/export/backup', {
      responseType: 'blob',
      headers: {
        'Accept': 'application/json'
      }
    });
  }
};

export const importAPI = {
  // Import backup file
  importBackup: (file, mode = 'merge', password = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    if (password) {
      formData.append('password', password);
    }
    
    return api.post('/import/backup', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export const authAPI = {
  // Register new user
  register: (data) => api.post('/auth/register', data),
  
  // Login user
  login: (data) => api.post('/auth/login', data),
  
  // Refresh access token
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  
  // Logout user
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  
  // Get current user
  getMe: () => api.get('/auth/me'),
  
  // Update user profile
  updateProfile: (data) => api.put('/auth/me', data),
  
  // Update password (while logged in)
  updatePassword: (currentPassword, newPassword) => 
    api.patch('/auth/password', { currentPassword, newPassword }),
  
  // Delete account
  deleteAccount: (password) => 
    api.delete('/auth/account', { data: { password } }),
  
  // Request password reset
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  
  // Validate reset token
  validateResetToken: (token) => api.get('/auth/validate-reset-token', { params: { token } }),
  
  // Reset password with token
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  
  // Send verification email
  sendVerificationEmail: () => api.post('/auth/send-verification')
};

export default api;
