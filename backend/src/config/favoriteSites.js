/**
 * Configuration for favorite recipe sites
 * Each site includes search URL template and result parsing selectors
 */
export const FAVORITE_SITES = [
  {
    id: 'allrecipes',
    name: 'AllRecipes',
    domain: 'allrecipes.com',
    enabled: true,
    searchUrl: 'https://www.allrecipes.com/search?q={query}',
    icon: '🍳',
    selectors: {
      resultCards: 'a.mntl-card-list-card--extendable',
      title: (elem) => elem.find('.card__title-text').text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => {
        if (!url) return false;
        // Accept recipe URLs and exclude non-recipe content
        return url.includes('allrecipes.com/recipe');
      },
      rating: (elem, $) => {
        const ratingText = elem.find('[class*="rating"], [class*="stars"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        if (match) {
          const rating = parseFloat(match[1]);
          return rating <= 5 ? rating : rating / 20;
        }
        const stars = elem.find('[class*="star"][class*="fill"], .filled-star').length;
        return stars > 0 ? stars : null;
      },
      description: (elem, $) => {
        return elem.find('.card__summary, .card__description, p').first().text().trim().substring(0, 150);
      },
      cuisine: (elem, $) => {
        // Try to extract cuisine from data-tag attribute or card content
        const dataTag = elem.find('.card__content').attr('data-tag');
        if (dataTag && dataTag.length > 0) {
          return dataTag;
        }
        return null;
      }
    }
  },
  {
    id: 'recipetineats',
    name: 'RecipeTin Eats',
    domain: 'recipetineats.com',
    enabled: true,
    searchUrl: 'https://www.recipetineats.com/?s={query}',
    icon: '👩‍🍳',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.length > 0,
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'onceuponachef',
    name: 'Once Upon A Chef',
    domain: 'onceuponachef.com',
    enabled: true,
    searchUrl: 'https://www.onceuponachef.com/?s={query}',
    icon: '👨‍🍳',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('onceuponachef.com'),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'cafedelites',
    name: 'Cafe Delites',
    domain: 'cafedelites.com',
    enabled: true,
    searchUrl: 'https://cafedelites.com/?s={query}',
    icon: '☕',
    selectors: {
      resultCards: 'article h2 a, .entry-title a, h3 a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('cafedelites.com'),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, .entry-content p, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'jocooks',
    name: 'Jo Cooks',
    domain: 'jocooks.com',
    enabled: true,
    searchUrl: 'https://www.jocooks.com/?s={query}',
    icon: '🥘',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('jocooks.com'),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'foodnetwork',
    name: 'Food Network',
    domain: 'foodnetwork.com',
    enabled: true,
    searchUrl: 'https://www.foodnetwork.com/search/{query}-',
    icon: '📺',
    selectors: {
      resultCards: 'article a, .m-PromoList a',
      title: (elem, $) => {
        return elem.find('.m-MediaBlock__a-Headline').text().trim() || 
               elem.attr('aria-label') || 
               elem.text().trim();
      },
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('/recipes/'),
      rating: () => null,
      description: () => ''
    }
  },
  {
    id: 'seriouseats',
    name: 'Serious Eats',
    domain: 'seriouseats.com',
    enabled: true,
    searchUrl: 'https://www.seriouseats.com/search?q={query}',
    icon: '🔬',
    selectors: {
      resultCards: 'article h2 a, .mntl-card-list-items a',
      title: (elem) => elem.text().trim() || elem.find('h2').text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && (url.includes('/recipes/') || url.includes('seriouseats.com')),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'bonappetit',
    name: 'Bon Appétit',
    domain: 'bonappetit.com',
    enabled: true,
    searchUrl: 'https://www.bonappetit.com/search?q={query}',
    icon: '🥂',
    selectors: {
      resultCards: 'article a, .SummaryItemWrapper a',
      title: (elem) => elem.find('h2, h3').text().trim() || elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('/recipe/'),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'epicurious',
    name: 'Epicurious',
    domain: 'epicurious.com',
    enabled: true,
    searchUrl: 'https://www.epicurious.com/search?q={query}',
    icon: '📖',
    selectors: {
      resultCards: 'article a, .recipe-content-card a',
      title: (elem) => elem.find('h4').text().trim() || elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('/recipes/'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'delish',
    name: 'Delish',
    domain: 'delish.com',
    enabled: true,
    searchUrl: 'https://www.delish.com/search/?q={query}',
    icon: '🎉',
    selectors: {
      resultCards: 'article a, .full-item-title a',
      title: (elem) => elem.text().trim() || elem.find('.full-item-title').text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && (url.includes('/cooking/') || url.includes('/recipes/')),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article, .simple-item');
        return $parent.find('p, .full-item-dek').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'tasty',
    name: 'Tasty',
    domain: 'tasty.co',
    enabled: true,
    searchUrl: 'https://tasty.co/search?q={query}',
    icon: '🍿',
    selectors: {
      resultCards: 'article a, .feed-item a',
      title: (elem) => elem.find('h3').text().trim() || elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('tasty.co/recipe'),
      rating: () => null,
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'budgetbytes',
    name: 'Budget Bytes',
    domain: 'budgetbytes.com',
    enabled: true,
    searchUrl: 'https://www.budgetbytes.com/?s={query}',
    icon: '💰',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('budgetbytes.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'pinchofyum',
    name: 'Pinch of Yum',
    domain: 'pinchofyum.com',
    enabled: true,
    searchUrl: 'https://pinchofyum.com/?s={query}',
    icon: '📸',
    selectors: {
      resultCards: 'article h3 a, .archive-post-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('pinchofyum.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const stars = $parent.find('.star-rating .star.filled').length;
        return stars > 0 ? stars : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.archive-post-excerpt, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'skinnytaste',
    name: 'Skinnytaste',
    domain: 'skinnytaste.com',
    enabled: true,
    searchUrl: 'https://www.skinnytaste.com/recipe-index/?_search={query}',
    icon: '🥗',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('skinnytaste.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'minimalistbaker',
    name: 'Minimalist Baker',
    domain: 'minimalistbaker.com',
    enabled: true,
    searchUrl: 'https://minimalistbaker.com/recipe-index/?fwp_recipe_search={query}',
    icon: '🌱',
    selectors: {
      resultCards: 'article h3 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('minimalistbaker.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'cookieandkate',
    name: 'Cookie and Kate',
    domain: 'cookieandkate.com',
    enabled: true,
    searchUrl: 'https://cookieandkate.com/search/?q={query}',
    icon: '🍪',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('cookieandkate.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'damndelicious',
    name: 'Damn Delicious',
    domain: 'damndelicious.net',
    enabled: true,
    searchUrl: 'https://damndelicious.net/#search/q={query}',
    icon: '🌶️',
    selectors: {
      resultCards: 'article h2 a, .entry-title a',
      title: (elem) => elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('damndelicious.net'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('.entry-summary, p').first().text().trim().substring(0, 150);
      }
    }
  },
  {
    id: 'simplyrecipes',
    name: 'Simply Recipes',
    domain: 'simplyrecipes.com',
    enabled: true,
    searchUrl: 'https://www.simplyrecipes.com/search?q={query}',
    icon: '🏠',
    selectors: {
      resultCards: 'article a, .mntl-card-list-items a',
      title: (elem) => elem.find('h2, .card__title').text().trim() || elem.text().trim(),
      url: (elem) => elem.attr('href'),
      urlFilter: (url) => url && url.includes('simplyrecipes.com'),
      rating: (elem, $) => {
        const $parent = elem.closest('article');
        const ratingText = $parent.find('[class*="rating"]').text();
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      },
      description: (elem, $) => {
        const $parent = elem.closest('article');
        return $parent.find('p, .card__description').first().text().trim().substring(0, 150);
      }
    }
  }
];

/**
 * Get enabled favorite sites
 */
export const getEnabledSites = () => {
  return FAVORITE_SITES.filter(site => site.enabled);
};

/**
 * Get site by ID
 */
export const getSiteById = (id) => {
  return FAVORITE_SITES.find(site => site.id === id);
};

/**
 * Get site by domain
 */
export const getSiteByDomain = (domain) => {
  const cleanDomain = domain.replace('www.', '');
  return FAVORITE_SITES.find(site => cleanDomain.includes(site.domain));
};