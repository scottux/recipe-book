# Import from Backup - User Guide

**Feature:** Import from JSON Backup  
**Version:** 2.1.2+  
**Last Updated:** February 15, 2026

---

## Overview

The **Import from Backup** feature allows you to restore all your Recipe Book data from a JSON backup file. This is useful for:

- 📦 **Moving data between accounts**
- 🔄 **Restoring from backups**
- 💾 **Recovering from data loss**
- 🔀 **Migrating from another system**

---

## Quick Start

### Step 1: Get a Backup File

If you don't already have a backup file, create one:

1. Log into your Recipe Book account
2. Navigate to any page
3. Click the **"Export All Data"** button (usually in settings or header)
4. Save the downloaded `.json` file to your computer

### Step 2: Import the Backup

1. Log into the account where you want to import data
2. Navigate to **Settings → Import** (or use the Import page)
3. Drag and drop your backup file, or click to browse
4. Review the file information displayed
5. Click **"Import Backup"**
6. Wait for processing (progress bar will show status)
7. Review the import statistics

That's it! Your data has been imported.

---

## Detailed Instructions

### Accessing the Import Page

**Option 1: Via Navigation**
- Click on your profile/account menu
- Select **"Settings"**
- Click on the **"Import"** tab or section

**Option 2: Direct URL**
- Navigate to: `https://your-app.com/import`

### Uploading a Backup File

#### Method 1: Drag and Drop
1. Open the Import page
2. Locate your backup `.json` file on your computer
3. Drag the file over the upload area
4. Drop the file when the area is highlighted
5. File validation occurs automatically

#### Method 2: Click to Browse
1. Open the Import page
2. Click on the upload area
3. Browse to your backup file
4. Select the file
5. Click "Open"

### File Validation

Before you can import, the file is automatically validated:

✅ **File format** - Must be valid JSON  
✅ **File size** - Maximum 10 MB  
✅ **Data structure** - Must match expected format  
✅ **Version compatibility** - Must be from v2.0+  

If validation fails, you'll see an error message explaining the issue.

### Import Process

Once you click "Import Backup":

1. **Validation** - All data is validated before processing
2. **Processing** - Data is imported with transaction protection
3. **Statistics** - Real-time progress updates
4. **Completion** - Detailed results displayed

**Processing Time:**
- Small files (< 100 items): A few seconds
- Medium files (100-1,000 items): 10-30 seconds
- Large files (1,000-10,000 items): 30-90 seconds

### Understanding Import Results

After import completes, you'll see detailed statistics:

```
Import Successful!

Total Items Processed: 158

Recipes:
  ✅ Imported: 45
  ⏭️  Skipped: 5 (already exist)
  ❌ Failed: 0

Collections:
  ✅ Imported: 8
  ⏭️  Skipped: 2
  ❌ Failed: 0

Meal Plans:
  ✅ Imported: 5
  ⏭️  Skipped: 0
  ❌ Failed: 0

Shopping Lists:
  ✅ Imported: 3
  ⏭️  Skipped: 0
  ❌ Failed: 0
```

**What each status means:**
- **Imported** - Successfully added to your account
- **Skipped** - Already exists in your account (duplicate)
- **Failed** - Could not be imported (validation error)

---

## What Gets Imported

The import feature supports all major data types:

### 🍳 Recipes
**What's included:**
- Recipe title, description, and source URL
- Ingredients with amounts and preparation notes
- Step-by-step instructions
- Cooking times (prep, cook, total)
- Serving size information
- Cuisine, dish type, and dietary tags
- Lock status and custom data

**What's NOT included:**
- Recipe creator/owner (set to your account)
- Creation/update timestamps (set to import time)
- Recipe ID (new ID generated)

### 📚 Collections
**What's included:**
- Collection name and description
- Collection icon
- Visibility settings (public/private)
- Recipes in the collection (with ordering)

**Note:** Recipes are matched by title. If a recipe doesn't exist, it won't be added to the collection.

### 📅 Meal Plans
**What's included:**
- Meal plan name and date range
- All scheduled meals
- Recipes for each meal
- Serving adjustments
- Meal notes

**Note:** Like collections, recipes are matched by title.

### 🛒 Shopping Lists
**What's included:**
- List name and status
- All items with categories
- Item amounts and notes
- Checked/unchecked status
- Active list status

**Note:** Only one list can be "active" at a time. If importing multiple active lists, only the last one will remain active.

---

## Import Limits & Restrictions

### File Limits
- **Maximum file size:** 10 MB
- **Maximum items:** 10,000 per import
- **Supported format:** JSON only

### Rate Limits
- **Maximum uploads:** 10 per 15 minutes
- **Per user:** Limit applies to your account

### Data Limits
Items exceeding these limits will fail validation:
- **Recipe title:** 200 characters
- **Recipe description:** 2,000 characters
- **Ingredients per recipe:** 100
- **Instructions per recipe:** 50
- **Collections per user:** Unlimited
- **Recipes per collection:** Unlimited

---

## Duplicate Handling

### How Duplicates are Detected

**Recipes:** Matched by exact title  
**Collections:** Matched by name  
**Meal Plans:** Matched by name and start date  
**Shopping Lists:** Matched by name  

### What Happens to Duplicates

**Default Behavior:** Duplicates are **skipped** (not imported)

This means:
- ✅ Your existing data is **never overwritten**
- ✅ Data integrity is **preserved**
- ⏭️ Duplicate items are **counted but not imported**

### Future Enhancement
We plan to add duplicate handling options in future releases:
- **Skip** (current default)
- **Merge** (combine data)
- **Replace** (overwrite existing)

---

## Error Handling

### Common Errors

#### "File too large"
**Problem:** File exceeds 10 MB limit  
**Solution:** 
- Split data into multiple smaller files
- Remove unnecessary items
- Contact support if you need higher limits

#### "Invalid JSON format"
**Problem:** File is not valid JSON  
**Solution:**
- Ensure file wasn't corrupted during transfer
- Try exporting a new backup
- Verify file extension is `.json`

#### "Too many items"
**Problem:** File contains more than 10,000 items  
**Solution:**
- Split into multiple imports
- Remove some items
- Contact support for bulk import assistance

#### "Invalid data structure"
**Problem:** File doesn't match expected format  
**Solution:**
- Ensure backup was created by Recipe Book v2.0+
- Don't manually edit backup files
- Re-export a fresh backup

#### "Rate limit exceeded"
**Problem:** Too many upload attempts  
**Solution:**
- Wait 15 minutes before trying again
- Maximum 10 uploads per 15-minute window

### Transaction Safety

**All imports are atomic:**
- ✅ Either **everything** imports successfully
- ❌ Or **nothing** is imported (rollback occurs)

This means you'll never end up with partially imported data.

If an error occurs during import:
1. Transaction is automatically rolled back
2. No data is saved to your account
3. Error message explains what went wrong
4. You can fix the issue and try again

---

## Best Practices

### Before Importing

1. **✅ Review the backup file**
   - Check file size (< 10 MB)
   - Verify it's a recent backup
   - Ensure it's from Recipe Book v2.0+

2. **✅ Know what's in the file**
   - Open file in text editor (optional)
   - Check number of items
   - Verify data looks correct

3. **✅ Check for duplicates**
   - Review your current data
   - Decide how to handle duplicates
   - Remember: duplicates will be skipped

### During Import

1. **✅ Don't close the browser**
   - Import process requires active connection
   - Closing may interrupt import

2. **✅ Watch the progress**
   - Monitor statistics as they update
   - Check for any errors

3. **✅ Be patient**
   - Large imports take time
   - Don't refresh or navigate away

### After Import

1. **✅ Review the results**
   - Check import statistics
   - Note any skipped items
   - Review failed items (if any)

2. **✅ Verify your data**
   - Browse imported recipes
   - Check collections
   - Verify meal plans

3. **✅ Clean up if needed**
   - Remove any unwanted items
   - Organize collections
   - Update meal plans

---

## Troubleshooting

### Import Button Disabled

**Possible causes:**
- No file selected
- File validation failed
- Rate limit exceeded
- Not logged in

**Solution:**
1. Ensure you've selected a valid file
2. Check error messages
3. Wait if rate limited
4. Log in if needed

### Import Taking Too Long

**Normal processing times:**
- < 100 items: A few seconds
- 100-1,000 items: 10-30 seconds
- 1,000-10,000 items: 30-90 seconds

**If longer than expected:**
1. Don't refresh or close browser
2. Check internet connection
3. Wait for timeout (5 minutes)
4. Try again with smaller file

### Items Not Showing Up

**Check:**
1. Import succeeded (check statistics)
2. Items weren't skipped as duplicates
3. Refresh the page
4. Check the correct sections (Recipes, Collections, etc.)

### Some Items Skipped

**This is normal if:**
- Items already exist in your account
- Exact title/name matches

**To import anyway:**
1. Rename existing items
2. Re-import the backup
3. Or manually create new items

---

## Security & Privacy

### Data Security

✅ **Authentication Required**
- Must be logged in to import
- Can only import to your own account

✅ **Data Validation**
- All data validated before processing
- Malicious data is rejected

✅ **Rate Limiting**
- Prevents abuse
- 10 uploads per 15 minutes

✅ **User Isolation**
- Import only affects your account
- No access to other users' data

### Privacy

- **Your data belongs to you**
- Imported data is private by default
- Collections respect visibility settings
- No data sharing without your permission

---

## Advanced Usage

### Editing Backup Files

**⚠️ NOT RECOMMENDED** - Manual editing can corrupt the file

If you must edit:
1. Make a backup copy first
2. Use a proper JSON editor
3. Validate JSON syntax
4. Test with small portion first

### Selective Import

**Current limitation:** Cannot choose specific items

**Workaround:**
1. Edit backup file to include only desired items
2. Or import everything and delete unwanted items

**Future enhancement:** Selective import UI planned

### Batch Importing

**To import multiple backup files:**
1. Import first file
2. Wait for completion
3. Import second file
4. Repeat as needed

**Note:** Rate limit applies (10 per 15 minutes)

---

## FAQ

### Can I import from other apps?

**Currently:** No, only Recipe Book backup files  
**Future:** We plan to support other formats

### What happens to my existing data?

**Your existing data is safe:**
- Existing items are never overwritten
- Duplicates are skipped
- All data is preserved

### Can I undo an import?

**No automatic undo**, but you can:
- Manually delete imported items
- Restore from a previous backup
- Contact support for assistance

### How often should I backup?

**Recommended:**
- After major changes
- Monthly for active users
- Before importing
- Before account deletion

### Can I import someone else's backup?

**Technically yes**, but:
- You need their backup file
- Data will be imported to YOUR account
- You become the owner of imported items

### What if import fails?

**No data is saved** - Transaction rollback occurs

1. Read error message
2. Fix the issue
3. Try again

---

## Getting Help

### Need Assistance?

**Documentation:**
- [Main Documentation](../README.md)
- [API Reference](../api/api-reference.md)
- [Backup/Export Guide](export-system.md)

**Support:**
- Check error messages carefully
- Review this guide
- Contact support with:
  - Error message
  - File size and item count
  - Browser and OS version

---

## Related Features

- [Export System](export-system.md) - How to create backups
- [Account Management](account-management.md) - Account settings
- [Collections](collections.md) - Organizing recipes
- [Meal Planning](meal-planning.md) - Planning meals

---

**Last Updated:** February 15, 2026  
**Version:** 2.1.2  
**Status:** Production Ready