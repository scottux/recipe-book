import { jest } from '@jest/globals';

// Create axios mock BEFORE any imports
const mockAxios = {
  get: jest.fn()
};

// Mock axios module before importing scraper
jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

// NOW import scraper after mocking axios
const { scrapeRecipe } = await import('../scraper.js');

describe('Scraper Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockAxios.get.mockReset();
  });

  describe('HTML Entity Decoding (REQ-005)', () => {
    it('should decode common HTML entities', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Mac &amp; Cheese",
              "description": "Quick &amp; easy comfort food",
              "recipeIngredient": ["2 cups pasta", "1 cup cheese"],
              "recipeInstructions": [{"text": "Boil pasta"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.title).toBe('Mac & Cheese');
      expect(result.description).toBe('Quick & easy comfort food');
    });

    it('should decode numeric HTML entities', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Chef&#8217;s Special",
              "description": "A 5&#8212;star recipe",
              "recipeIngredient": ["1 cup flour"],
              "recipeInstructions": [{"text": "Mix well"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.title).toBe("Chef's Special");
      expect(result.description).toBe('A 5—star recipe');
    });

    it('should decode hex HTML entities', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Tom&#x27;s Recipe",
              "description": "Delicious &#x2F; Healthy",
              "recipeIngredient": ["2 cups water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.title).toBe("Tom's Recipe");
      expect(result.description).toBe('Delicious / Healthy');
    });
  });

  describe('JSON-LD Recipe Extraction', () => {
    it('should extract recipe from JSON-LD schema', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Chocolate Chip Cookies",
              "description": "Classic homemade cookies",
              "recipeIngredient": [
                "2 cups flour",
                "1 cup sugar",
                "1/2 cup butter"
              ],
              "recipeInstructions": [
                {"text": "Preheat oven to 350°F"},
                {"text": "Mix ingredients"},
                {"text": "Bake for 12 minutes"}
              ],
              "prepTime": "PT15M",
              "cookTime": "PT12M",
              "recipeYield": "24 cookies"
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.title).toBe('Chocolate Chip Cookies');
      expect(result.description).toBe('Classic homemade cookies');
      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0].name).toBe('2 cups flour');
      expect(result.instructions).toHaveLength(3);
      expect(result.prepTime).toBe(15);
      expect(result.cookTime).toBe(12);
    });

    it('should handle @graph wrapped JSON-LD', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@graph": [
                {
                  "@type": "Recipe",
                  "name": "Test Recipe",
                  "recipeIngredient": ["1 cup water"],
                  "recipeInstructions": [{"text": "Boil water"}]
                }
              ]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients[0].name).toBe('1 cup water');
    });
  });

  describe('Servings Extraction', () => {
    it('should extract servings from recipeYield number', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeYield": 4,
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.servings).toBe(4);
    });

    it('should extract servings from recipeYield string', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeYield": "Serves 6",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.servings).toBe(6);
    });

    it('should handle various servings formats', async () => {
      const testCases = [
        { input: "4-6 servings", expected: 4 },
        { input: "yields 8 servings", expected: 8 },
        { input: "Makes 12 portions", expected: 12 },
        { input: "For 2 people", expected: 2 }
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <html>
            <head>
              <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test",
                "recipeYield": "${testCase.input}",
                "recipeIngredient": ["1 cup water"],
                "recipeInstructions": [{"text": "Cook"}]
              }
              </script>
            </head>
          </html>
        `;

        mockAxios.get.mockResolvedValue({ data: mockHtml });

        const result = await scrapeRecipe('https://example.com/recipe');

        expect(result.servings).toBe(testCase.expected);
      }
    });
  });

  describe('DishType Mapping', () => {
    it('should map recipeCategory to valid dishType enum', async () => {
      const testCases = [
        { category: "Dessert", expected: "Dessert" },
        { category: "Main Course", expected: "Main Course" },
        { category: "Appetizer", expected: "Appetizer" },
        { category: "Side Dish", expected: "Side Dish" },
        { category: "Breakfast", expected: "Breakfast" },
        { category: "main dish", expected: "Main Course" },
        { category: "appetizers", expected: "Appetizer" },
        { category: "Entree", expected: "Main Course" },
        { category: "Unknown Category", expected: "Other" }
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <html>
            <head>
              <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test Recipe",
                "recipeCategory": "${testCase.category}",
                "recipeIngredient": ["1 cup water"],
                "recipeInstructions": [{"text": "Cook"}]
              }
              </script>
            </head>
          </html>
        `;

        mockAxios.get.mockResolvedValue({ data: mockHtml });

        const result = await scrapeRecipe('https://example.com/recipe');

        expect(result.dishType).toBe(testCase.expected);
      }
    });
  });

  describe('Time Parsing', () => {
    it('should parse ISO 8601 duration format', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "prepTime": "PT30M",
              "cookTime": "PT1H15M",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.prepTime).toBe(30);
      expect(result.cookTime).toBe(75); // 1 hour 15 minutes = 75 minutes
    });
  });

  describe('Ingredient Cleaning', () => {
    it('should remove duplicate ingredients', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": [
                "2 cups flour",
                "2 cups flour",
                "1 cup sugar"
              ],
              "recipeInstructions": [{"text": "Mix"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0].name).toBe('2 cups flour');
      expect(result.ingredients[1].name).toBe('1 cup sugar');
    });

    it('should filter out very short or very long ingredients', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": [
                "x",
                "2 cups flour",
                "${'a'.repeat(400)}"
              ],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].name).toBe('2 cups flour');
    });
  });

  describe('Instruction Cleaning', () => {
    it('should remove HTML tags from instructions', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [
                {"text": "<p>Preheat oven to <strong>350°F</strong></p>"},
                {"text": "Mix <em>all</em> ingredients"}
              ]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.instructions[0]).toBe('Preheat oven to 350°F');
      expect(result.instructions[1]).toBe('Mix all ingredients');
    });

    it('should remove URLs from instructions', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [
                {"text": "Visit https://example.com for more info. Mix ingredients well."}
              ]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.instructions[0]).not.toContain('https://');
      expect(result.instructions[0]).toContain('Mix ingredients well');
    });

    it('should remove duplicate instructions', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [
                {"text": "Preheat oven"},
                {"text": "Preheat oven"},
                {"text": "Mix ingredients"}
              ]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]).toBe('Preheat oven');
      expect(result.instructions[1]).toBe('Mix ingredients');
    });

    it('should filter out very short instructions', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [
                {"text": "Mix"},
                {"text": "Preheat oven to 350 degrees and prepare baking sheet"}
              ]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toContain('Preheat oven');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on network failure', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(scrapeRecipe('https://example.com/recipe'))
        .rejects
        .toThrow('Failed to scrape recipe');
    });

    it('should throw error when title is missing', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe('https://example.com/recipe');

      // Should have empty title rather than throwing
      expect(result.title).toBe('');
    });

    it('should handle timeout', async () => {
      mockAxios.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      await expect(scrapeRecipe('https://example.com/recipe'))
        .rejects
        .toThrow();
    });
  });

  describe('Source URL', () => {
    it('should include source URL in result', async () => {
      const url = 'https://example.com/my-recipe';
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test",
              "recipeIngredient": ["1 cup water"],
              "recipeInstructions": [{"text": "Cook"}]
            }
            </script>
          </head>
        </html>
      `;

      mockAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scrapeRecipe(url);

      expect(result.sourceUrl).toBe(url);
    });
  });
});