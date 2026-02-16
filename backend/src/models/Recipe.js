import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: String,
  unit: String
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional during migration
  },
  visibility: {
    type: String,
    enum: ['private', 'public', 'shared'],
    default: 'private'
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ingredients: [ingredientSchema],
  instructions: [{
    type: String,
    required: true
  }],
  prepTime: {
    type: Number,
    min: 0
  },
  cookTime: {
    type: Number,
    min: 0
  },
  servings: {
    type: Number,
    min: 1
  },
  dishType: {
    type: String,
    enum: ['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage', 'Snack', 'Breakfast', 'Lunch', 'Dinner', 'Other'],
    default: 'Other'
  },
  cuisine: {
    type: String,
    trim: true
  },
  tags: [String],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
recipeSchema.index({ title: 'text', description: 'text' });
recipeSchema.index({ dishType: 1 });
recipeSchema.index({ cuisine: 1 });
recipeSchema.index({ rating: -1 });
recipeSchema.index({ 'ingredients.name': 1 });
recipeSchema.index({ owner: 1 }); // Index for user's recipes
recipeSchema.index({ visibility: 1 }); // Index for visibility filtering

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;