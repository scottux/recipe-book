# REQ-009: Unified Add Recipe Page

**Status:** ✅ Implemented  
**Priority:** High  
**Related:** REQ-001 (manual creation), REQ-002 (URL import), REQ-007 (web search)

## Description

Consolidate all recipe creation methods into a single, tabbed interface that provides users with three ways to add recipes: discovering via web search, importing from URL, or manual entry.

## User Stories

### As a user:
- I want a single place to add recipes regardless of the method
- I want to discover recipes through web search
- I want to import recipes from URLs
- I want to manually enter recipes
- I want smooth transitions between methods
- I want deep linking to specific tabs via URL parameters

## Features

### Tabbed Interface

#### Three Tabs
1. **🔍 Discover** - Web search across recipe websites
2. **🔗 Import URL** - Paste URL to scrape and import
3. **✏️ Manual Entry** - Traditional form input

#### Navigation
- **Tab Selection**: Click tab to switch methods
- **Active Indicator**: Active tab highlighted with accent color
- **URL Parameters**: Support `?tab=discover|import|manual` for deep linking
- **Default Tab**: "Discover" shown by default

### Tab 1: Discover (Web Search)

Embeds `RecipeSearch` component:
- Search input with site filtering
- "Surprise Me" random suggestions
- Search results with metadata
- One-click import from results
- Link to view source recipe

### Tab 2: Import URL

Embeds `ScraperInput` component:
- URL input field
- Supported sites list
- Auto-scrape on submit
- Preview scraped data
- Save to collection button

### Tab 3: Manual Entry

Embeds `RecipeForm` component:
- Full recipe form (title, ingredients, instructions, etc.)
- All metadata fields (cuisine, dish type, times, ratings)
- Validation
- Save button

### Design Consistency

All child components styled consistently when embedded:
- **Unified Spacing**: Consistent padding/margins
- **Shared Theme**: Same cookbook aesthetic
- **Matched Typography**: Consistent font sizes/weights
- **Aligned Elements**: Buttons, inputs, cards use same styles
- **Seamless Integration**: Tabs feel like one cohesive interface

### Deep Linking

#### URL Parameters
```
/add                    → Default (Discover tab)
/add?tab=discover       → Discover tab
/add?tab=import         → Import URL tab
/add?tab=manual         → Manual Entry tab
```

#### Navigation Examples
- Home page "Add Recipe" button → `/add`
- Import link → `/add?tab=import`
- Manual link → `/add?tab=manual`

## Technical Implementation

### Component Structure
```jsx
<AddRecipePage>
  <Tabs>
    <Tab name="discover" icon="🔍">
      <RecipeSearch />
    </Tab>
    <Tab name="import" icon="🔗">
      <ScraperInput />
    </Tab>
    <Tab name="manual" icon="✏️">
      <RecipeForm />
    </Tab>
  </Tabs>
</AddRecipePage>
```

### State Management
```javascript
const [activeTab, setActiveTab] = useState('discover');

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  if (['discover', 'import', 'manual'].includes(tab)) {
    setActiveTab(tab);
  }
}, [location]);
```

### Tab Switching
```javascript
const switchTab = (tab) => {
  setActiveTab(tab);
  navigate(`/add?tab=${tab}`, { replace: true });
};
```

### Consistent Child Component Styling

Each embedded component wrapped with consistent styling:
```jsx
<div className="cookbook-page p-6">
  <h2 className="text-2xl font-display font-bold mb-4 text-cookbook-text border-b-2 border-cookbook-brown pb-2">
    {tabTitle}
  </h2>
  <div className="space-y-4">
    {/* Child component */}
  </div>
</div>
```

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Add a Recipe                                           │
├─────────────────────────────────────────────────────────┤
│  [🔍 Discover] [🔗 Import URL] [✏️ Manual Entry]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Active Tab Content]                                   │
│                                                          │
│  // Tab 1: Recipe search with results                   │
│  // Tab 2: URL input with scraper                       │
│  // Tab 3: Full recipe form                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] Three tabs accessible from single page
- [x] Tab navigation via clicks
- [x] Deep linking via URL parameters
- [x] Active tab visually indicated
- [x] RecipeSearch embedded in Discover tab
- [x] ScraperInput embedded in Import tab
- [x] RecipeForm embedded in Manual tab
- [x] Consistent styling across all tabs
- [x] Smooth transitions between tabs
- [x] Default tab is Discover
- [x] Navigation maintains URL parameters
- [x] Responsive design (mobile/desktop)
- [x] Child components properly isolated
- [x] Breadcrumbs/back navigation available

## Testing

### Test Scenarios
1. **Default Load**: Visit `/add`, verify Discover tab active
2. **Direct Tab**: Visit `/add?tab=import`, verify Import tab active
3. **Tab Switching**: Click each tab, verify content switches
4. **Invalid Param**: Visit `/add?tab=invalid`, verify default tab
5. **Search Flow**: Use Discover tab, import recipe, verify success
6. **URL Flow**: Use Import tab, paste URL, verify scrape
7. **Manual Flow**: Use Manual tab, fill form, verify save
8. **Style Consistency**: Compare all tabs, verify consistent design
9. **Mobile**: Test on mobile, verify responsive layout

## Design Notes

### Tab Headers
- **Icons**: Each tab has distinct icon (🔍, 🔗, ✏️)
- **Labels**: Clear, concise labels
- **Active State**: Accent color background, white text
- **Inactive State**: Light background, brown text
- **Hover**: Subtle background change

### Content Area
- **Max Width**: Constrained for readability
- **Padding**: Generous whitespace
- **Background**: White/cream cookbook aesthetic
- **Borders**: Vintage-style decorative borders

### Typography
- **Headers**: `font-display` for titles
- **Body**: `font-body` for content
- **Hierarchy**: Clear visual hierarchy

## Future Enhancements

- [ ] Recent activity sidebar (last imported, last searched)
- [ ] Quick actions (favorite sites, common searches)
- [ ] Tab history (remember last active tab)
- [ ] Keyboard shortcuts (Alt+1,2,3 for tabs)
- [ ] Tab badges (show counts, new items)
- [ ] Drag & drop URL import
- [ ] Clipboard detection for URLs
- [ ] Multi-recipe batch import

## Dependencies

- React Router (navigation, URL params)
- `RecipeSearch` component
- `ScraperInput` component
- `RecipeForm` component

## Related Documentation

- [Recipe CRUD](REQ-001-recipe-crud.md) - Manual creation
- [Recipe Import](REQ-002-recipe-import.md) - URL scraping
- [Web Search](REQ-007-web-search.md) - Recipe discovery
- [Getting Started Guide](../docs/getting-started.md) - User onboarding