var router = (function() {
  var routes = [
    { pattern: /^\/$/, route: 'home', view: 'home' },
    { pattern: /^\/catalog$/, route: 'catalog', view: 'catalog' },
    { pattern: /^\/collections$/, route: 'collections', view: 'collections' },
    { pattern: /^\/collections\/([^/]+)$/, route: 'binder', view: 'binder' },
    { pattern: /^\/venta$/, route: 'ventaCols', view: 'ventaCols' },
    { pattern: /^\/venta\/([^/]+)$/, route: 'venta', view: 'venta' },
    { pattern: /^\/explore$/, route: 'explore', view: 'explore' },
    { pattern: /^\/explore\/([^/]+)$/, route: 'exploreDetail', view: 'exploreDetail' },
    { pattern: /^\/profile$/, route: 'profile', view: 'profile' }
  ];

  function parseUrl(pathname, searchParams) {
    pathname = pathname.replace(/\/$/, '') || '/';
    for (var i = 0; i < routes.length; i++) {
      var match = pathname.match(routes[i].pattern);
      if (match) {
        var route = routes[i].route;
        var params = {};
        if (match.length > 1) {
          params.id = match[1];
        }
        var filters = {};
        if (searchParams) {
          filters.tcg = searchParams.get('tcg');
          filters.expansion = searchParams.get('expansion');
          filters.color = searchParams.get('color');
          filters.rarity = searchParams.get('rarity');
          filters.type = searchParams.get('type');
          filters.search = searchParams.get('search');
          filters.page = searchParams.get('page');
          filters.language = searchParams.get('language');
        }
        return { route: route, view: routes[i].view, params: params, filters: filters };
      }
    }
    return { route: null, view: 'home', params: {}, filters: {} };
  }

  function buildPath(route, params, filters) {
    var path;
    switch (route) {
      case 'home': path = '/'; break;
      case 'catalog': path = '/catalog'; break;
      case 'collections': path = '/collections'; break;
      case 'binder': path = '/collections/' + (params.id || ''); break;
      case 'ventaCols': path = '/venta'; break;
      case 'venta': path = '/venta/' + (params.id || ''); break;
      case 'explore': path = '/explore'; break;
      case 'exploreDetail': path = '/explore/' + (params.id || ''); break;
      case 'profile': path = '/profile'; break;
      default: path = '/';
    }
    var searchParams = new URLSearchParams();
    if (filters) {
      if (filters.tcg) searchParams.set('tcg', filters.tcg);
      if (filters.expansion) searchParams.set('expansion', filters.expansion);
      if (filters.color) searchParams.set('color', filters.color);
      if (filters.rarity) searchParams.set('rarity', filters.rarity);
      if (filters.type) searchParams.set('type', filters.type);
      if (filters.search) searchParams.set('search', filters.search);
      if (filters.page && filters.page !== '1') searchParams.set('page', filters.page);
      if (filters.language) searchParams.set('language', filters.language);
    }
    var query = searchParams.toString();
    return path + (query ? '?' + query : '');
  }

  function getFilterState() {
    var filterState = {};
    if (typeof expansionFilter !== 'undefined' && expansionFilter.value) filterState.expansion = expansionFilter.value;
    if (typeof colorFilter !== 'undefined' && colorFilter.value) filterState.color = colorFilter.value;
    if (typeof rarityFilter !== 'undefined' && rarityFilter.value) filterState.rarity = rarityFilter.value;
    if (typeof typeFilter !== 'undefined' && typeFilter.value) filterState.type = typeFilter.value;
    if (typeof searchInput !== 'undefined' && searchInput.value) filterState.search = searchInput.value;
    if (typeof currentPage !== 'undefined' && currentPage > 1) filterState.page = String(currentPage);
    if (typeof window.state !== 'undefined' && window.state.catalog && window.state.catalog.catalogLanguage) filterState.language = window.state.catalog.catalogLanguage;
    return filterState;
  }

  function getNavigatorState() {
    return {
      currentTcg: typeof currentTcg !== 'undefined' ? currentTcg : null,
      currentCollectionId: typeof currentCollectionId !== 'undefined' ? currentCollectionId : null,
      currentVentaId: typeof currentVentaId !== 'undefined' ? currentVentaId : null,
      binderPage: typeof binderPage !== 'undefined' ? binderPage : 1,
      ventaPage: typeof ventaPage !== 'undefined' ? ventaPage : 1,
      filters: getFilterState()
    };
  }

  function navigateTo(path, state) {
    if (state === undefined) state = getNavigatorState();
    history.pushState(state, '', path);
    if (typeof onNavigate === 'function') onNavigate(path, state);
  }

  function navigateToRoute(route, params, state) {
    if (state === undefined) state = getNavigatorState();
    var path = buildPath(route, params, state.filters);
    navigateTo(path, state);
  }

  function replaceState(path, state) {
    if (state === undefined) state = getNavigatorState();
    history.replaceState(state, '', path);
  }

  function updateUrl(filters) {
    var parsed = parseUrl(window.location.pathname, new URLSearchParams(window.location.search));
    var state = getNavigatorState();
    state.filters = filters || getFilterState();
    var path = buildPath(parsed.route, parsed.params, state.filters);
    replaceState(path, state);
  }

  var _isPopHandling = false;
  function handlePopState(event) {
    if (_isPopHandling) return;
    _isPopHandling = true;
    if (event.state) {
      restoreState(event.state);
      if (typeof mostrarVista === 'function') {
        mostrarVista(event.state.view, event.state);
      }
    } else {
      navigateTo('/', {});
    }
    _isPopHandling = false;
  }

  function restoreState(state) {
    if (typeof currentTcg !== 'undefined' && state.currentTcg !== undefined) currentTcg = state.currentTcg;
    if (typeof currentCollectionId !== 'undefined' && state.currentCollectionId !== undefined) currentCollectionId = state.currentCollectionId;
    if (typeof currentVentaId !== 'undefined' && state.currentVentaId !== undefined) currentVentaId = state.currentVentaId;
    if (typeof binderPage !== 'undefined' && state.binderPage !== undefined) binderPage = state.binderPage;
    if (typeof ventaPage !== 'undefined' && state.ventaPage !== undefined) ventaPage = state.ventaPage;
    if (state.filters && typeof applyFiltersFromUrl === 'function') {
      applyFiltersFromUrl(state.filters);
    }
  }

  function initRouter() {
    window.addEventListener('popstate', handlePopState);
    var parsed = parseUrl(window.location.pathname, new URLSearchParams(window.location.search));
    return parsed;
  }

  return {
    parseUrl: parseUrl,
    buildPath: buildPath,
    getFilterState: getFilterState,
    getNavigatorState: getNavigatorState,
    navigateTo: navigateTo,
    navigateToRoute: navigateToRoute,
    replaceState: replaceState,
    updateUrl: updateUrl,
    handlePopState: handlePopState,
    restoreState: restoreState,
    initRouter: initRouter
  };
})();
