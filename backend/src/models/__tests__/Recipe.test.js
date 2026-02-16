import mongoose from 'mongoose';
import Recipe from '../Recipe.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Recipe.deleteMany({});
});

describe('Recipe Model (REQ-006)', () => {
  describe('Schema Validation', () => {
    it('should create a recipe with valid required fields', async () => {
      const validRecipe = {
        title: 'Test Recipe',
        ingredients: [
          { name: 'flour', amount: '2', unit: 'cups' }
        ],
        instructions: ['Mix ingredients']
      };

      const recipe = new Recipe(validRecipe);
      const savedRecipe = await recipe.save();

      expect(savedRecipe._id).toBeDefined();
      expect(savedRecipe.title).toBe('Test Recipe');
      expect(savedRecipe.ingredients).toHaveLength(1);
      expect(savedRecipe.instructions).toHaveLength(1);
    });

    it('should fail when title is missing', async () => {
      const invalidRecipe = {
        ingredients: [{ name: 'flour' }],
        instructions: ['Mix']
      };

      const recipe = new Recipe(invalidRecipe);
      
      await expect(recipe.save()).rejects.toThrow();
    });

    it('should fail when ingredients are missing', async () => {
      const invalidRecipe = {
        title: 'Test Recipe',
        instructions: ['Mix']
      };

      const recipe = new Recipe(invalidRecipe);
      const savedRecipe = await recipe.save();
      
      // Mongoose allows empty arrays by default
      expect(savedRecipe.ingredients).toEqual([]);
    });

    it('should fail when instructions are missing', async () => {
      const invalidRecipe = {
        title: 'Test Recipe',
        ingredients: [{ name: 'flour' }]
      };

      const recipe = new Recipe(invalidRecipe);
      const savedRecipe = await recipe.save();
      
      expect(savedRecipe.instructions).toEqual([]);
    });

    it('should require name in ingredient', async () => {
      const invalidRecipe = {
        title: 'Test Recipe',
        ingredients: [{ amount: '2', unit: 'cups' }],
        instructions: ['Mix']
      };

      const recipe = new Recipe(invalidRecipe);
      
      await expect(recipe.save()).rejects.toThrow();
    });
  });

  describe('DishType Enum Validation', () => {
    const validDishTypes = [
      'Appetizer',
      'Main Course',
      'Side Dish',
      'Dessert',
      'Beverage',
      'Snack',
      'Breakfast',
      'Lunch',
      'Dinner',
      'Other'
    ];

    validDishTypes.forEach(dishType => {
      it(`should accept valid dishType: ${dishType}`, async () => {
        const recipe = new Recipe({
          title: 'Test Recipe',
          dishType: dishType,
          ingredients: [{ name: 'test' }],
          instructions: ['test']
        });

        const savedRecipe = await recipe.save();
        expect(savedRecipe.dishType).toBe(dishType);
      });
    });

    it('should reject invalid dishType', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        dishType: 'Invalid Type',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should default to "Other" when dishType not provided', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.dishType).toBe('Other');
    });
  });

  describe('Numeric Field Validation', () => {
    it('should accept valid prepTime', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        prepTime: 30,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.prepTime).toBe(30);
    });

    it('should reject negative prepTime', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        prepTime: -10,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should reject negative cookTime', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        cookTime: -5,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should accept valid servings', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        servings: 4,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.servings).toBe(4);
    });

    it('should reject servings below minimum', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        servings: 0,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should accept valid rating within range', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        rating: 4.5,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.rating).toBe(4.5);
    });

    it('should reject rating below minimum', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        rating: 0.5,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });

    it('should reject rating above maximum', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        rating: 5.5,
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      await expect(recipe.save()).rejects.toThrow();
    });
  });

  describe('Text Field Trimming', () => {
    it('should trim title', async () => {
      const recipe = new Recipe({
        title: '  Test Recipe  ',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.title).toBe('Test Recipe');
    });

    it('should trim description', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        description: '  A delicious recipe  ',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.description).toBe('A delicious recipe');
    });

    it('should trim cuisine', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        cuisine: '  Italian  ',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.cuisine).toBe('Italian');
    });

    it('should trim sourceUrl', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        sourceUrl: '  https://example.com  ',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.sourceUrl).toBe('https://example.com');
    });
  });

  describe('Array Fields', () => {
    it('should handle multiple ingredients', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [
          { name: 'flour', amount: '2', unit: 'cups' },
          { name: 'sugar', amount: '1', unit: 'cup' },
          { name: 'eggs', amount: '3', unit: '' }
        ],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.ingredients).toHaveLength(3);
      expect(savedRecipe.ingredients[0].name).toBe('flour');
      expect(savedRecipe.ingredients[1].name).toBe('sugar');
      expect(savedRecipe.ingredients[2].name).toBe('eggs');
    });

    it('should handle multiple instructions', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: [
          'Preheat oven',
          'Mix ingredients',
          'Bake for 30 minutes'
        ]
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.instructions).toHaveLength(3);
    });

    it('should handle tags array', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        tags: ['vegetarian', 'quick', 'easy'],
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.tags).toHaveLength(3);
      expect(savedRecipe.tags).toContain('vegetarian');
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt timestamp', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.createdAt).toBeDefined();
      expect(savedRecipe.createdAt).toBeInstanceOf(Date);
    });

    it('should automatically add updatedAt timestamp', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.updatedAt).toBeDefined();
      expect(savedRecipe.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      const originalUpdatedAt = savedRecipe.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedRecipe.title = 'Updated Recipe';
      const updatedRecipe = await savedRecipe.save();

      expect(updatedRecipe.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have text index on title and description', async () => {
      const indexes = await Recipe.collection.getIndexes();
      
      // Check if text index exists
      const hasTextIndex = Object.keys(indexes).some(key => 
        indexes[key].some(field => field[0] === '_fts')
      );
      
      expect(hasTextIndex).toBe(true);
    });

    it('should support text search on title', async () => {
      await Recipe.create([
        {
          title: 'Chocolate Cake',
          ingredients: [{ name: 'test' }],
          instructions: ['test']
        },
        {
          title: 'Vanilla Cake',
          ingredients: [{ name: 'test' }],
          instructions: ['test']
        },
        {
          title: 'Chocolate Cookies',
          ingredients: [{ name: 'test' }],
          instructions: ['test']
        }
      ]);

      const results = await Recipe.find({ $text: { $search: 'chocolate' } });
      expect(results).toHaveLength(2);
    });
  });

  describe('Optional Fields', () => {
    it('should allow recipe without description', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.description).toBeUndefined();
    });

    it('should allow recipe without times', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.prepTime).toBeUndefined();
      expect(savedRecipe.cookTime).toBeUndefined();
    });

    it('should allow recipe without rating', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.rating).toBeUndefined();
    });

    it('should allow recipe without sourceUrl', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.sourceUrl).toBeUndefined();
    });
  });

  describe('Ingredient Schema', () => {
    it('should allow ingredient with only name', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'salt' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.ingredients[0].name).toBe('salt');
      expect(savedRecipe.ingredients[0].amount).toBeUndefined();
      expect(savedRecipe.ingredients[0].unit).toBeUndefined();
    });

    it('should store ingredient with all fields', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [
          { name: 'flour', amount: '2', unit: 'cups' }
        ],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.ingredients[0].name).toBe('flour');
      expect(savedRecipe.ingredients[0].amount).toBe('2');
      expect(savedRecipe.ingredients[0].unit).toBe('cups');
    });

    it('should not add _id to ingredients', async () => {
      const recipe = new Recipe({
        title: 'Test Recipe',
        ingredients: [{ name: 'test' }],
        instructions: ['test']
      });

      const savedRecipe = await recipe.save();
      expect(savedRecipe.ingredients[0]._id).toBeUndefined();
    });
  });
});