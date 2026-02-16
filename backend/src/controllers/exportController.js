import Recipe from '../models/Recipe.js';
import Collection from '../models/Collection.js';
import MealPlan from '../models/MealPlan.js';
import ShoppingList from '../models/ShoppingList.js';
import User from '../models/User.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

/**
 * Export a single recipe as PDF
 */
export const exportRecipePDF = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Check if user owns the recipe
    if (recipe.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    generateRecipePDF(doc, recipe);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting recipe as PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export recipe as PDF'
    });
  }
};

/**
 * Generate PDF content for a recipe
 */
function generateRecipePDF(doc, recipe) {
  const pageWidth = doc.page.width - 100; // Account for margins

  // Title
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(recipe.title, { align: 'center' })
    .moveDown(0.5);

  // Metadata line
  const metadata = [];
  if (recipe.prepTime) metadata.push(`⏱ Prep: ${recipe.prepTime} min`);
  if (recipe.cookTime) metadata.push(`🍳 Cook: ${recipe.cookTime} min`);
  if (recipe.servings) metadata.push(`👥 Servings: ${recipe.servings}`);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(metadata.join('  |  '), { align: 'center' })
    .moveDown(1);

  // Description (if exists)
  if (recipe.description) {
    doc
      .fontSize(11)
      .font('Helvetica-Oblique')
      .text(recipe.description, { align: 'left' })
      .moveDown(1);
  }

  // Tags (if exist)
  if (recipe.tags && recipe.tags.length > 0) {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Tags: ${recipe.tags.join(', ')}`, { align: 'left' })
      .fillColor('#000000')
      .moveDown(1);
  }

  // Separator line
  doc
    .strokeColor('#cccccc')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Ingredients Section
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INGREDIENTS', { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).font('Helvetica');

  recipe.ingredients.forEach((ingredient) => {
    const ingredientText = `• ${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim();
    doc.text(ingredientText, { indent: 10 }).moveDown(0.3);
  });

  doc.moveDown(1);

  // Separator line
  doc
    .strokeColor('#cccccc')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Instructions Section
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INSTRUCTIONS', { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).font('Helvetica');

  recipe.instructions.forEach((instruction, index) => {
    doc
      .font('Helvetica-Bold')
      .text(`${index + 1}. `, { continued: true })
      .font('Helvetica')
      .text(instruction, { indent: 20, hangingIndent: 20 })
      .moveDown(0.5);
  });

  doc.moveDown(1);

  // Notes (if exist)
  if (recipe.notes) {
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(pageWidth + 50, doc.y)
      .stroke()
      .moveDown(1);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('NOTES', { underline: true })
      .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').text(recipe.notes).moveDown(1);
  }

  // Footer
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(`Exported from My Recipe Book on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 50, {
      align: 'center'
    });

  // Source URL (if exists)
  if (recipe.sourceUrl) {
    doc
      .fontSize(8)
      .fillColor('#0066cc')
      .text(`Source: ${recipe.sourceUrl}`, 50, doc.page.height - 35, {
        align: 'center',
        link: recipe.sourceUrl
      });
  }
}

/**
 * Export a single recipe as JSON
 */
export const exportRecipeJSON = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Check if user owns the recipe
    if (recipe.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create clean JSON export
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      recipe: {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        dishType: recipe.dishType,
        tags: recipe.tags,
        notes: recipe.notes,
        sourceUrl: recipe.sourceUrl,
        imageUrl: recipe.imageUrl,
        rating: recipe.rating,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      }
    };

    // Set response headers
    const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting recipe as JSON:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export recipe as JSON'
    });
  }
};

/**
 * Export a single recipe as Markdown
 */
export const exportRecipeMarkdown = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }

    // Check if user owns the recipe
    if (recipe.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Generate Markdown content
    let markdown = `# ${recipe.title}\n\n`;

    if (recipe.description) {
      markdown += `${recipe.description}\n\n`;
    }

    // Metadata
    markdown += `## Details\n\n`;
    if (recipe.prepTime) markdown += `- **Prep Time:** ${recipe.prepTime} minutes\n`;
    if (recipe.cookTime) markdown += `- **Cook Time:** ${recipe.cookTime} minutes\n`;
    if (recipe.servings) markdown += `- **Servings:** ${recipe.servings}\n`;
    if (recipe.difficulty) markdown += `- **Difficulty:** ${recipe.difficulty}\n`;
    if (recipe.cuisine) markdown += `- **Cuisine:** ${recipe.cuisine}\n`;
    if (recipe.dishType) markdown += `- **Dish Type:** ${recipe.dishType}\n`;
    markdown += `\n`;

    // Tags
    if (recipe.tags && recipe.tags.length > 0) {
      markdown += `**Tags:** ${recipe.tags.join(', ')}\n\n`;
    }

    // Ingredients
    markdown += `## Ingredients\n\n`;
    recipe.ingredients.forEach((ingredient) => {
      const ingredientText = `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim();
      markdown += `- ${ingredientText}\n`;
    });
    markdown += `\n`;

    // Instructions
    markdown += `## Instructions\n\n`;
    recipe.instructions.forEach((instruction, index) => {
      markdown += `${index + 1}. ${instruction}\n`;
    });
    markdown += `\n`;

    // Notes
    if (recipe.notes) {
      markdown += `## Notes\n\n${recipe.notes}\n\n`;
    }

    // Source
    if (recipe.sourceUrl) {
      markdown += `## Source\n\n[${recipe.sourceUrl}](${recipe.sourceUrl})\n\n`;
    }

    // Footer
    markdown += `---\n\n*Exported from My Recipe Book on ${new Date().toLocaleDateString()}*\n`;

    // Set response headers
    const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`;
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(markdown);
  } catch (error) {
    console.error('Error exporting recipe as Markdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export recipe as Markdown'
    });
  }
};

/**
 * Export recipe based on format query parameter
 */
export const exportRecipe = async (req, res) => {
  const format = req.query.format || 'pdf';

  switch (format.toLowerCase()) {
    case 'pdf':
      return exportRecipePDF(req, res);
    case 'json':
      return exportRecipeJSON(req, res);
    case 'markdown':
    case 'md':
      return exportRecipeMarkdown(req, res);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported formats: pdf, json, markdown'
      });
  }
};

/**
 * Export multiple recipes as a ZIP file
 */
export const exportMultipleRecipes = async (req, res) => {
  try {
    const { recipeIds, format = 'pdf' } = req.body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recipeIds array is required'
      });
    }

    // Limit to 100 recipes per export
    if (recipeIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 recipes per export'
      });
    }

    // Validate format
    if (!['pdf', 'json', 'markdown', 'md'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported formats: pdf, json, markdown'
      });
    }

    // Fetch all recipes
    const recipes = await Recipe.find({
      _id: { $in: recipeIds },
      owner: req.user.userId
    });

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No recipes found'
      });
    }

    // If only one recipe, export it directly
    if (recipes.length === 1) {
      req.params.id = recipes[0]._id.toString();
      return exportRecipe(req, res);
    }

    // Create ZIP archive for multiple recipes
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `recipes-export-${timestamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive to response
    archive.pipe(res);

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // Add each recipe to the archive
    for (const recipe of recipes) {
      const recipeFilename = recipe.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      
      if (format.toLowerCase() === 'pdf') {
        // Generate PDF in memory
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          archive.append(pdfData, { name: `${recipeFilename}.pdf` });
        });
        
        generateRecipePDF(doc, recipe);
        doc.end();
        
        // Wait for PDF to finish
        await new Promise((resolve) => doc.on('end', resolve));
        
      } else if (format.toLowerCase() === 'json') {
        const exportData = {
          version: '2.0',
          exportDate: new Date().toISOString(),
          recipe: {
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            cuisine: recipe.cuisine,
            dishType: recipe.dishType,
            tags: recipe.tags,
            notes: recipe.notes,
            sourceUrl: recipe.sourceUrl,
            imageUrl: recipe.imageUrl,
            rating: recipe.rating,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt
          }
        };
        
        archive.append(JSON.stringify(exportData, null, 2), { 
          name: `${recipeFilename}.json` 
        });
        
      } else {
        // Markdown
        let markdown = `# ${recipe.title}\n\n`;
        if (recipe.description) markdown += `${recipe.description}\n\n`;
        
        markdown += `## Details\n\n`;
        if (recipe.prepTime) markdown += `- **Prep Time:** ${recipe.prepTime} minutes\n`;
        if (recipe.cookTime) markdown += `- **Cook Time:** ${recipe.cookTime} minutes\n`;
        if (recipe.servings) markdown += `- **Servings:** ${recipe.servings}\n`;
        if (recipe.difficulty) markdown += `- **Difficulty:** ${recipe.difficulty}\n`;
        if (recipe.cuisine) markdown += `- **Cuisine:** ${recipe.cuisine}\n`;
        if (recipe.dishType) markdown += `- **Dish Type:** ${recipe.dishType}\n`;
        markdown += `\n`;
        
        if (recipe.tags && recipe.tags.length > 0) {
          markdown += `**Tags:** ${recipe.tags.join(', ')}\n\n`;
        }
        
        markdown += `## Ingredients\n\n`;
        recipe.ingredients.forEach((ingredient) => {
          const ingredientText = `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim();
          markdown += `- ${ingredientText}\n`;
        });
        markdown += `\n`;
        
        markdown += `## Instructions\n\n`;
        recipe.instructions.forEach((instruction, index) => {
          markdown += `${index + 1}. ${instruction}\n`;
        });
        markdown += `\n`;
        
        if (recipe.notes) {
          markdown += `## Notes\n\n${recipe.notes}\n\n`;
        }
        
        if (recipe.sourceUrl) {
          markdown += `## Source\n\n[${recipe.sourceUrl}](${recipe.sourceUrl})\n\n`;
        }
        
        markdown += `---\n\n*Exported from My Recipe Book on ${new Date().toLocaleDateString()}*\n`;
        
        archive.append(markdown, { name: `${recipeFilename}.md` });
      }
    }

    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Error exporting multiple recipes:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export recipes'
      });
    }
  }
};

/**
 * Export a collection as a professional PDF cookbook
 */
export const exportCollectionCookbook = async (req, res) => {
  try {
    const collectionId = req.params.id;

    // Fetch collection with populated recipes
    const collection = await Collection.findById(collectionId)
      .populate('recipes');

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    // Check if user owns the collection
    if (collection.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!collection.recipes || collection.recipes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Collection has no recipes'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `${collection.name} - Cookbook`,
        Author: 'My Recipe Book',
        Subject: 'Recipe Collection'
      }
    });

    // Set response headers
    const filename = `${collection.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cookbook-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate cookbook content
    await generateCookbookPDF(doc, collection);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting collection as cookbook:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export collection as cookbook'
      });
    }
  }
};

/**
 * Generate professional cookbook PDF content
 */
async function generateCookbookPDF(doc, collection) {
  const recipes = collection.recipes;
  const pageWidth = doc.page.width - 100;
  const recipePageNumbers = {};
  let currentPage = 1;

  // ===== COVER PAGE =====
  doc
    .fontSize(48)
    .font('Helvetica-Bold')
    .fillColor('#8B4513')
    .text(collection.icon || '📚', { align: 'center' })
    .moveDown(1);

  doc
    .fontSize(36)
    .font('Helvetica-Bold')
    .fillColor('#2C1810')
    .text(collection.name, { align: 'center' })
    .moveDown(0.5);

  if (collection.description) {
    doc
      .fontSize(14)
      .font('Helvetica-Oblique')
      .fillColor('#5D4037')
      .text(collection.description, { align: 'center', width: pageWidth });
  }

  doc.moveDown(3);

  // Collection stats
  doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#666666')
    .text(`${recipes.length} Recipe${recipes.length > 1 ? 's' : ''}`, { align: 'center' })
    .moveDown(0.3)
    .text(`Created ${new Date(collection.createdAt).toLocaleDateString()}`, { align: 'center' })
    .moveDown(6);

  // Decorative footer on cover
  doc
    .fontSize(10)
    .fillColor('#999999')
    .text('My Recipe Book Collection', { align: 'center' })
    .moveDown(0.3)
    .text(new Date().toLocaleDateString(), { align: 'center' });

  // ===== TABLE OF CONTENTS =====
  doc.addPage();
  currentPage++;

  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#2C1810')
    .text('Table of Contents', { align: 'center' })
    .moveDown(1);

  // Decorative line
  doc
    .strokeColor('#8B4513')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Calculate page numbers for each recipe
  let recipeStartPage = currentPage + 1;
  recipes.forEach((recipe, index) => {
    recipePageNumbers[recipe._id] = recipeStartPage;
    recipeStartPage++; // Each recipe gets its own page
  });

  // List recipes with page numbers
  doc.fontSize(12).font('Helvetica').fillColor('#000000');

  recipes.forEach((recipe, index) => {
    const pageNum = recipePageNumbers[recipe._id];
    const recipeName = recipe.title;
    const dots = '.'.repeat(Math.max(3, 60 - recipeName.length));

    doc
      .fillColor('#2C1810')
      .text(`${index + 1}. ${recipeName}`, 70, doc.y, { 
        width: pageWidth - 70,
        continued: true 
      })
      .fillColor('#999999')
      .text(` ${dots} `, { continued: true })
      .fillColor('#8B4513')
      .text(pageNum.toString(), { align: 'right' })
      .moveDown(0.5);

    // Add page break if needed
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      currentPage++;
    }
  });

  // ===== RECIPE PAGES =====
  for (const recipe of recipes) {
    doc.addPage();
    currentPage++;

    // Recipe title with decorative border
    doc
      .fillColor('#8B4513')
      .rect(50, 50, pageWidth, 60)
      .fill();

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text(recipe.title, 70, 70, { 
        width: pageWidth - 40,
        align: 'center'
      });

    doc.moveDown(3);

    // Metadata section
    const metadata = [];
    if (recipe.prepTime) metadata.push(`⏱ Prep: ${recipe.prepTime} min`);
    if (recipe.cookTime) metadata.push(`🍳 Cook: ${recipe.cookTime} min`);
    if (recipe.servings) metadata.push(`👥 ${recipe.servings} servings`);
    if (recipe.difficulty) metadata.push(`📊 ${recipe.difficulty}`);

    if (metadata.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(metadata.join('  •  '), { align: 'center' })
        .moveDown(0.5);
    }

    if (recipe.cuisine || recipe.dishType) {
      const tags = [];
      if (recipe.cuisine) tags.push(recipe.cuisine);
      if (recipe.dishType) tags.push(recipe.dishType);
      
      doc
        .fontSize(9)
        .fillColor('#8B4513')
        .text(tags.join(' • '), { align: 'center' })
        .moveDown(1);
    }

    // Description
    if (recipe.description) {
      doc
        .fontSize(11)
        .font('Helvetica-Oblique')
        .fillColor('#5D4037')
        .text(recipe.description, { align: 'left' })
        .moveDown(1);
    }

    // Decorative separator
    doc
      .strokeColor('#D7CCC8')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(pageWidth + 50, doc.y)
      .stroke()
      .moveDown(1);

    // Ingredients section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2C1810')
      .text('Ingredients', { underline: true })
      .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#000000');

    recipe.ingredients.forEach((ingredient) => {
      const ingredientText = `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim();
      doc.text(`• ${ingredientText}`, { indent: 10 }).moveDown(0.3);
    });

    doc.moveDown(1);

    // Check if we need a new page before instructions
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
      currentPage++;
      
      // Add recipe title at top of continuation page
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#8B4513')
        .text(`${recipe.title} (continued)`, { align: 'center' })
        .moveDown(1);
    }

    // Decorative separator
    doc
      .strokeColor('#D7CCC8')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(pageWidth + 50, doc.y)
      .stroke()
      .moveDown(1);

    // Instructions section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2C1810')
      .text('Instructions', { underline: true })
      .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#000000');

    recipe.instructions.forEach((instruction, index) => {
      doc
        .font('Helvetica-Bold')
        .text(`${index + 1}. `, { continued: true })
        .font('Helvetica')
        .text(instruction, { indent: 20, hangingIndent: 20 })
        .moveDown(0.5);
      
      // Page break if needed
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        currentPage++;
        
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#8B4513')
          .text(`${recipe.title} (continued)`, { align: 'center' })
          .moveDown(1);
      }
    });

    // Notes section
    if (recipe.notes) {
      doc.moveDown(1);
      
      doc
        .strokeColor('#D7CCC8')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(pageWidth + 50, doc.y)
        .stroke()
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2C1810')
        .text('Chef\'s Notes', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#5D4037')
        .text(recipe.notes)
        .moveDown(0.5);
    }

    // Source (if available)
    if (recipe.sourceUrl) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#0066cc')
        .text(`Source: ${recipe.sourceUrl}`, 50, doc.page.height - 60, {
          link: recipe.sourceUrl,
          underline: true
        });
    }

    // Page number footer
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(`Page ${currentPage}`, 50, doc.page.height - 40, {
        align: 'center'
      });
  }

  // ===== INDEX PAGE =====
  doc.addPage();
  currentPage++;

  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#2C1810')
    .text('Alphabetical Index', { align: 'center' })
    .moveDown(1);

  doc
    .strokeColor('#8B4513')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Sort recipes alphabetically
  const sortedRecipes = [...recipes].sort((a, b) => 
    a.title.localeCompare(b.title)
  );

  doc.fontSize(10).font('Helvetica').fillColor('#000000');

  sortedRecipes.forEach((recipe) => {
    const pageNum = recipePageNumbers[recipe._id];
    const recipeName = recipe.title;
    const dots = '.'.repeat(Math.max(3, 65 - recipeName.length));

    doc
      .fillColor('#2C1810')
      .text(recipeName, 70, doc.y, { 
        width: pageWidth - 70,
        continued: true 
      })
      .fillColor('#999999')
      .text(` ${dots} `, { continued: true })
      .fillColor('#8B4513')
      .text(pageNum.toString(), { align: 'right' })
      .moveDown(0.4);

    if (doc.y > doc.page.height - 80) {
      doc.addPage();
      currentPage++;
    }
  });

  // Final page number
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(`Page ${currentPage}`, 50, doc.page.height - 40, {
      align: 'center'
    });
}

/**
 * Export a meal plan as PDF calendar view
 */
export const exportMealPlanPDF = async (req, res) => {
  try {
    const planId = req.params.id;

    // Fetch meal plan with populated recipes
    const mealPlan = await MealPlan.findById(planId)
      .populate({
        path: 'meals.recipes.recipe',
        model: 'Recipe'
      });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found'
      });
    }

    // Check if user owns the meal plan
    if (mealPlan.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `${mealPlan.name} - Meal Plan`,
        Author: 'My Recipe Book',
        Subject: 'Meal Planning'
      }
    });

    // Set response headers
    const filename = `${mealPlan.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-meal-plan-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate meal plan PDF content
    await generateMealPlanPDF(doc, mealPlan);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting meal plan as PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export meal plan as PDF'
      });
    }
  }
};

/**
 * Generate meal plan PDF content with calendar layout
 */
async function generateMealPlanPDF(doc, mealPlan) {
  const pageWidth = doc.page.width - 100;
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  };

  // ===== HEADER PAGE =====
  doc
    .fontSize(36)
    .font('Helvetica-Bold')
    .fillColor('#2C5F2D')
    .text('🍽️ Meal Plan', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(28)
    .fillColor('#2C1810')
    .text(mealPlan.name, { align: 'center' })
    .moveDown(0.5);

  // Date range
  const startDate = new Date(mealPlan.startDate);
  const endDate = new Date(mealPlan.endDate);
  
  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#5D4037')
    .text(
      `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      { align: 'center' }
    )
    .moveDown(2);

  // Stats
  const totalMeals = mealPlan.meals.length;
  const uniqueRecipes = new Set(
    mealPlan.meals.flatMap(m => m.recipes.map(r => r.recipe?._id?.toString()))
  ).size;

  doc
    .fontSize(12)
    .fillColor('#666666')
    .text(`${totalMeals} Meals • ${uniqueRecipes} Unique Recipes`, { align: 'center' })
    .moveDown(3);

  // ===== WEEKLY CALENDAR VIEW =====
  // Generate all days in the range
  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Helper function to get meals for a date and meal type
  const getMealsForDateAndType = (date, mealType) => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlan.meals.find(m => {
      const mealDateStr = new Date(m.date).toISOString().split('T')[0];
      return mealDateStr === dateStr && m.mealType === mealType;
    });
  };

  // Render days (7 per page in landscape-style layout)
  for (let i = 0; i < days.length; i += 7) {
    if (i > 0) {
      doc.addPage();
    }

    const weekDays = days.slice(i, Math.min(i + 7, days.length));
    
    // Week header
    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];
    
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#2C5F2D')
      .text(
        `Week of ${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        { align: 'center' }
      )
      .moveDown(1);

    // Draw calendar grid
    const cellWidth = pageWidth / 7;
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 100;

    // Day headers
    weekDays.forEach((day, idx) => {
      const x = startX + (idx * cellWidth);
      
      // Draw cell border
      doc
        .strokeColor('#D7CCC8')
        .lineWidth(1)
        .rect(x, startY, cellWidth, 30)
        .stroke();

      // Day name and date
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#2C1810')
        .text(
          day.toLocaleDateString('en-US', { weekday: 'short' }),
          x + 5,
          startY + 5,
          { width: cellWidth - 10, align: 'center' }
        )
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#5D4037')
        .text(
          day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          x + 5,
          startY + 18,
          { width: cellWidth - 10, align: 'center' }
        );
    });

    // Meal type rows
    let currentY = startY + 30;
    
    mealTypes.forEach((mealType) => {
      // Meal type label
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#2C5F2D')
        .text(
          `${mealTypeIcons[mealType]} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          startX - 40,
          currentY + 10,
          { width: 35, align: 'right' }
        );

      // Meal cells for each day
      weekDays.forEach((day, idx) => {
        const x = startX + (idx * cellWidth);
        
        // Draw cell border
        doc
          .strokeColor('#D7CCC8')
          .lineWidth(1)
          .rect(x, currentY, cellWidth, rowHeight)
          .stroke();

        // Get meal for this date and type
        const meal = getMealsForDateAndType(day, mealType);
        
        if (meal && meal.recipes.length > 0) {
          let textY = currentY + 5;
          
          meal.recipes.forEach((recipeEntry) => {
            if (recipeEntry.recipe) {
              const recipeTitle = recipeEntry.recipe.title;
              const servings = recipeEntry.servings;
              
              // Recipe title
              doc
                .fontSize(7)
                .font('Helvetica')
                .fillColor('#2C1810')
                .text(
                  recipeTitle,
                  x + 3,
                  textY,
                  { width: cellWidth - 6, ellipsis: true }
                );
              
              textY += 10;
              
              // Servings
              if (servings) {
                doc
                  .fontSize(6)
                  .fillColor('#666666')
                  .text(
                    `${servings} servings`,
                    x + 3,
                    textY,
                    { width: cellWidth - 6 }
                  );
                textY += 8;
              }
            }
          });
          
          // Notes
          if (meal.notes) {
            doc
              .fontSize(6)
              .font('Helvetica-Oblique')
              .fillColor('#999999')
              .text(
                meal.notes,
                x + 3,
                textY,
                { width: cellWidth - 6, height: rowHeight - (textY - currentY) - 3, ellipsis: true }
              );
          }
        }
      });

      currentY += rowHeight;
      
      // Check if we need a new page
      if (currentY > doc.page.height - 100 && mealType !== mealTypes[mealTypes.length - 1]) {
        doc.addPage();
        currentY = 50;
      }
    });
  }

  // ===== RECIPE DETAILS PAGE =====
  doc.addPage();
  
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#2C1810')
    .text('Recipe Details', { align: 'center' })
    .moveDown(1);

  doc
    .strokeColor('#2C5F2D')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Get all unique recipes used in the meal plan
  const recipeMap = new Map();
  mealPlan.meals.forEach(meal => {
    meal.recipes.forEach(r => {
      if (r.recipe && !recipeMap.has(r.recipe._id.toString())) {
        recipeMap.set(r.recipe._id.toString(), r.recipe);
      }
    });
  });

  const uniqueRecipesList = Array.from(recipeMap.values());

  if (uniqueRecipesList.length === 0) {
    doc
      .fontSize(12)
      .fillColor('#666666')
      .text('No recipes in this meal plan', { align: 'center' });
  } else {
    uniqueRecipesList.forEach((recipe, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 250) {
        doc.addPage();
      }

      // Recipe title
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2C5F2D')
        .text(`${index + 1}. ${recipe.title}`)
        .moveDown(0.3);

      // Metadata
      const metadata = [];
      if (recipe.prepTime) metadata.push(`⏱ ${recipe.prepTime}m`);
      if (recipe.cookTime) metadata.push(`🍳 ${recipe.cookTime}m`);
      if (recipe.servings) metadata.push(`👥 ${recipe.servings}`);

      if (metadata.length > 0) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#666666')
          .text(metadata.join(' • '))
          .moveDown(0.3);
      }

      // Ingredients summary
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#2C1810')
        .text('Ingredients:', { continued: true })
        .font('Helvetica')
        .fillColor('#333333')
        .text(` ${recipe.ingredients.length} items`)
        .moveDown(0.2);

      // First few ingredients
      const displayIngredients = recipe.ingredients.slice(0, 3);
      displayIngredients.forEach(ing => {
        const text = `${ing.amount || ''} ${ing.unit || ''} ${ing.item}`.trim();
        doc
          .fontSize(8)
          .text(`• ${text}`, { indent: 10 });
      });

      if (recipe.ingredients.length > 3) {
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(`  ... and ${recipe.ingredients.length - 3} more`, { indent: 10 });
      }

      doc.moveDown(1);
    });
  }

  // Footer
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(`Generated from My Recipe Book on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 40, {
      align: 'center'
    });
}

/**
 * Export a shopping list as print-friendly PDF
 */
export const exportShoppingListPDF = async (req, res) => {
  try {
    const listId = req.params.id;

    // Fetch shopping list
    const shoppingList = await ShoppingList.findById(listId);

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        error: 'Shopping list not found'
      });
    }

    // Check if user owns the shopping list
    if (shoppingList.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `${shoppingList.name} - Shopping List`,
        Author: 'My Recipe Book',
        Subject: 'Shopping List'
      }
    });

    // Set response headers
    const filename = `${shoppingList.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-shopping-list-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate shopping list PDF content
    generateShoppingListPDF(doc, shoppingList);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error exporting shopping list as PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export shopping list as PDF'
      });
    }
  }
};

/**
 * Generate shopping list PDF content with checkboxes
 */
function generateShoppingListPDF(doc, shoppingList) {
  const pageWidth = doc.page.width - 100;

  // Category icons
  const categoryIcons = {
    'Produce': '🥬',
    'Dairy': '🥛',
    'Meat': '🍖',
    'Pantry': '🍞',
    'Frozen': '❄️',
    'Bakery': '🥖',
    'Beverages': '🥤',
    'Snacks': '🍿',
    'Other': '📦'
  };

  // ===== HEADER =====
  doc
    .fontSize(32)
    .font('Helvetica-Bold')
    .fillColor('#2E7D32')
    .text('🛒 Shopping List', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(24)
    .fillColor('#2C1810')
    .text(shoppingList.name, { align: 'center' })
    .moveDown(0.3);

  doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#666666')
    .text(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), { align: 'center' })
    .moveDown(1);

  // Stats
  const totalItems = shoppingList.items.length;
  const checkedItems = shoppingList.items.filter(item => item.checked).length;
  
  doc
    .fontSize(10)
    .fillColor('#999999')
    .text(`${totalItems} item${totalItems !== 1 ? 's' : ''} | ${checkedItems} checked`, { align: 'center' })
    .moveDown(2);

  // Decorative line
  doc
    .strokeColor('#2E7D32')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  // Group items by category
  const categories = [
    'Produce', 'Dairy', 'Meat', 'Pantry', 
    'Frozen', 'Bakery', 'Beverages', 'Snacks', 'Other'
  ];

  const itemsByCategory = {};
  categories.forEach(cat => {
    itemsByCategory[cat] = shoppingList.items.filter(item => item.category === cat);
  });

  // Render each category
  categories.forEach((category) => {
    const items = itemsByCategory[category];
    
    if (items.length === 0) return;

    // Check if we need a new page
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Category header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2E7D32')
      .text(`${categoryIcons[category]} ${category.toUpperCase()}`, { underline: true })
      .moveDown(0.5);

    // Category items
    items.forEach((item) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        
        // Repeat category header on new page
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#2E7D32')
          .text(`${categoryIcons[category]} ${category.toUpperCase()} (continued)`, { underline: true })
          .moveDown(0.5);
      }

      const checkbox = item.checked ? '☑' : '☐';
      const textColor = item.checked ? '#999999' : '#000000';
      const fontStyle = item.checked ? 'Helvetica-Oblique' : 'Helvetica';
      
      // Item line
      const itemText = `${item.quantity} ${item.unit} ${item.ingredient}`;
      
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor(textColor)
        .text(`${checkbox}  `, 70, doc.y, { continued: true })
        .font(fontStyle)
        .text(itemText, { 
          strike: item.checked,
          width: pageWidth - 40
        });

      // Notes (if any)
      if (item.notes) {
        doc
          .fontSize(9)
          .fillColor('#666666')
          .text(`    ${item.notes}`, 70, doc.y, { 
            width: pageWidth - 40,
            indent: 20 
          });
      }

      doc.moveDown(0.4);
    });

    doc.moveDown(0.8);
  });

  // ===== SUMMARY SECTION =====
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
  }

  doc
    .strokeColor('#D7CCC8')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(pageWidth + 50, doc.y)
    .stroke()
    .moveDown(1);

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#2C1810')
    .text('Summary', { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`Total Items: ${totalItems}`)
    .text(`Categories: ${categories.filter(cat => itemsByCategory[cat].length > 0).length}`)
    .moveDown(0.5);

  // Category breakdown
  doc
    .fontSize(10)
    .fillColor('#666666')
    .text('Items per Category:', { underline: true })
    .moveDown(0.3);

  categories.forEach(category => {
    const count = itemsByCategory[category].length;
    if (count > 0) {
      doc
        .fontSize(9)
        .text(`  ${categoryIcons[category]} ${category}: ${count} item${count !== 1 ? 's' : ''}`);
    }
  });

  // Footer
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(`Generated from My Recipe Book on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 40, {
      align: 'center'
    });

  // Completion status
  if (shoppingList.completedAt) {
    doc
      .fontSize(8)
      .fillColor('#2E7D32')
      .text(`✓ Completed on ${new Date(shoppingList.completedAt).toLocaleDateString()}`, 50, doc.page.height - 55, {
      align: 'center'
    });
  }
}

/**
 * Export full user data backup as JSON
 */
export const exportFullBackup = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch all user data
    const [user, recipes, collections, mealPlans, shoppingLists] = await Promise.all([
      User.findById(userId).select('-password'),
      Recipe.find({ owner: userId }),
      Collection.find({ owner: userId }).populate('recipes'),
      MealPlan.find({ owner: userId }).populate({
        path: 'meals.recipes.recipe',
        model: 'Recipe'
      }),
      ShoppingList.find({ owner: userId })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create comprehensive backup data
    const backupData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      statistics: {
        totalRecipes: recipes.length,
        totalCollections: collections.length,
        totalMealPlans: mealPlans.length,
        totalShoppingLists: shoppingLists.length
      },
      recipes: recipes.map(recipe => ({
        id: recipe._id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        dishType: recipe.dishType,
        tags: recipe.tags,
        notes: recipe.notes,
        sourceUrl: recipe.sourceUrl,
        imageUrl: recipe.imageUrl,
        rating: recipe.rating,
        isLocked: recipe.isLocked,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      })),
      collections: collections.map(collection => ({
        id: collection._id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        isPublic: collection.isPublic,
        recipeIds: collection.recipes.map(r => r._id),
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      })),
      mealPlans: mealPlans.map(plan => ({
        id: plan._id,
        name: plan.name,
        startDate: plan.startDate,
        endDate: plan.endDate,
        isTemplate: plan.isTemplate,
        meals: plan.meals.map(meal => ({
          id: meal._id,
          date: meal.date,
          mealType: meal.mealType,
          recipes: meal.recipes.map(r => ({
            recipeId: r.recipe?._id,
            servings: r.servings
          })),
          notes: meal.notes
        })),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      })),
      shoppingLists: shoppingLists.map(list => ({
        id: list._id,
        name: list.name,
        items: list.items.map(item => ({
          ingredient: item.ingredient,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: item.checked,
          recipeId: item.recipeId,
          notes: item.notes,
          isCustom: item.isCustom
        })),
        mealPlanId: list.mealPlanId,
        isActive: list.isActive,
        completedAt: list.completedAt,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      }))
    };

    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `recipe-book-backup-${timestamp}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(backupData);
  } catch (error) {
    console.error('Error creating full backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
};
