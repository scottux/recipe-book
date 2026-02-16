import mongoose from 'mongoose';

const shoppingListItemSchema = new mongoose.Schema({
  ingredient: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Snacks', 'Other'],
    default: 'Other',
  },
  checked: {
    type: Boolean,
    default: false,
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const shoppingListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  items: [shoppingListItemSchema],
  mealPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealPlan',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for finding active lists
shoppingListSchema.index({ owner: 1, isActive: 1 });

// Virtual for completion percentage
shoppingListSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  const checkedCount = this.items.filter(item => item.checked).length;
  return Math.round((checkedCount / this.items.length) * 100);
});

// Virtual for checked count
shoppingListSchema.virtual('checkedCount').get(function() {
  return this.items.filter(item => item.checked).length;
});

// Auto-complete list when all items checked
shoppingListSchema.pre('save', function(next) {
  if (this.items.length > 0) {
    const allChecked = this.items.every(item => item.checked);
    if (allChecked && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!allChecked && this.completedAt) {
      this.completedAt = null;
    }
  }
  next();
});

// Ensure only one active list per user
shoppingListSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    await mongoose.model('ShoppingList').updateMany(
      { owner: this.owner, _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

// Enable virtuals in JSON
shoppingListSchema.set('toJSON', { virtuals: true });
shoppingListSchema.set('toObject', { virtuals: true });

const ShoppingList = mongoose.model('ShoppingList', shoppingListSchema);

export default ShoppingList;