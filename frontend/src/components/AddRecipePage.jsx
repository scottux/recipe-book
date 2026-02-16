import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RecipeSearch from './RecipeSearch';
import ScraperInput from './ScraperInput';
import RecipeForm from './RecipeForm';

const AddRecipePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'discover';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    {
      id: 'discover',
      label: 'Discover',
      icon: '🔍',
      description: 'Find recipes from popular sites across the web',
      component: RecipeSearch
    },
    {
      id: 'import',
      label: 'Import URL',
      icon: '🔗',
      description: 'Paste a recipe URL to import instantly',
      component: ScraperInput
    },
    {
      id: 'manual',
      label: 'Manual Entry',
      icon: '🖊️',
      description: 'Create a recipe from scratch',
      component: RecipeForm
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || RecipeSearch;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="cookbook-page p-6 sm:p-8 mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-cookbook-text mb-2 text-center">
          📕 Add Recipe
        </h1>
        <p className="text-center text-cookbook-brown font-body mb-6">
          Choose how you'd like to add a recipe to your collection
        </p>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all font-body font-medium text-left sm:text-center ${
                activeTab === tab.id
                  ? 'bg-cookbook-accent text-white border-cookbook-accent shadow-lg transform scale-105'
                  : 'bg-white text-cookbook-darkbrown border-cookbook-aged hover:border-cookbook-brown hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                <span className="text-2xl">{tab.icon}</span>
                <div className="flex-1 sm:text-center">
                  <div className="font-semibold text-base sm:text-lg">{tab.label}</div>
                  <div className={`text-xs sm:text-sm mt-1 ${
                    activeTab === tab.id ? 'text-white opacity-90' : 'text-cookbook-brown'
                  }`}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="transition-opacity duration-300">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AddRecipePage;