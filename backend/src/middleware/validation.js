import { body, validationResult } from 'express-validator';
import createDOMPurify from 'dompurify';
import { Window } from 'happy-dom';

// Create DOMPurify instance for HTML sanitization
const window = new Window();
const DOMPurify = createDOMPurify(window);

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Sanitize HTML content
export const sanitizeHTML = (value) => {
  if (typeof value !== 'string') return value;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }); // Strip all HTML tags
};

// Recipe validation rules
export const recipeValidationRules = () => {
  return [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters')
      .customSanitizer(sanitizeHTML),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
      .customSanitizer(sanitizeHTML),
    
    body('ingredients')
      .isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    
    body('ingredients.*.name')
      .trim()
      .notEmpty().withMessage('Ingredient name is required')
      .customSanitizer(sanitizeHTML),
    
    body('ingredients.*.amount')
      .optional()
      .trim()
      .customSanitizer(sanitizeHTML),
    
    body('ingredients.*.unit')
      .optional()
      .trim()
      .customSanitizer(sanitizeHTML),
    
    body('instructions')
      .isArray({ min: 1 }).withMessage('At least one instruction is required'),
    
    body('instructions.*')
      .trim()
      .notEmpty().withMessage('Instruction cannot be empty')
      .customSanitizer(sanitizeHTML),
    
    body('prepTime')
      .optional()
      .isInt({ min: 0 }).withMessage('Prep time must be a positive number'),
    
    body('cookTime')
      .optional()
      .isInt({ min: 0 }).withMessage('Cook time must be a positive number'),
    
    body('servings')
      .optional()
      .isInt({ min: 1 }).withMessage('Servings must be at least 1'),
    
    body('dishType')
      .optional()
      .isIn(['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage', 'Snack', 'Breakfast', 'Lunch', 'Dinner', 'Other'])
      .withMessage('Invalid dish type'),
    
    body('cuisine')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Cuisine must not exceed 100 characters')
      .customSanitizer(sanitizeHTML),
    
    body('tags')
      .optional()
      .isArray().withMessage('Tags must be an array'),
    
    body('tags.*')
      .trim()
      .isLength({ max: 50 }).withMessage('Tag must not exceed 50 characters')
      .customSanitizer(sanitizeHTML),
    
    body('rating')
      .optional()
      .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    
    body('sourceUrl')
      .optional()
      .trim()
      .isURL().withMessage('Invalid URL format')
  ];
};

// URL validation for scraping
export const urlValidationRules = () => {
  return [
    body('url')
      .trim()
      .notEmpty().withMessage('URL is required')
      .isURL().withMessage('Invalid URL format')
  ];
};

// Search query validation
export const searchValidationRules = () => {
  return [
    body('query')
      .trim()
      .notEmpty().withMessage('Search query is required')
      .isLength({ min: 2, max: 200 }).withMessage('Query must be between 2 and 200 characters')
      .customSanitizer(sanitizeHTML),
    
    body('siteIds')
      .optional()
      .isArray().withMessage('Site IDs must be an array')
  ];
};