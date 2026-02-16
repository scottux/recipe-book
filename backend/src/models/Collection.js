import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Collection name is required'],
    trim: true,
    maxlength: [100, 'Collection name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  icon: {
    type: String,
    default: '📚'
  },
  color: {
    type: String,
    default: '#8B4513' // cookbook brown
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
collectionSchema.index({ owner: 1, name: 1 });
collectionSchema.index({ owner: 1, sortOrder: 1 });

// Virtual for recipe count
collectionSchema.virtual('recipeCount').get(function() {
  return this.recipes.length;
});

// Ensure virtuals are included in JSON
collectionSchema.set('toJSON', { virtuals: true });
collectionSchema.set('toObject', { virtuals: true });

const Collection = mongoose.model('Collection', collectionSchema);

export default Collection;