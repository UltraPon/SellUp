import React, { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import { Link, useNavigate } from 'react-router-dom';

interface Listing {
  id: number;
  title: string;
  description: string;
  price: string;
  address: string;
  created_at: string;
  images: { url: string }[];
  category?: { id: number; name: string }; // Новый формат
  categories?: { category: { id: number; name: string } }[] | number[]; // Старый формат
  user: number;
  attributes: Record<string, any>;
  location?: string;
}

interface Category {
  id: number;
  name: string;
  parent: number | null;
  children?: Category[];
  filters?: Filter[];
}

interface Filter {
  id: number;
  name: string;
  attribute_type: string;
  options: string[];
  min_value?: number;
  max_value?: number;
  unit?: string;
}

const ListingPage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<number, Category>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [filterValues, setFilterValues] = useState<Record<number, any>>({});
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Объявления | SellUp";
  }, []);

  // Функция для нормализации данных категорий объявлений
  const normalizeListingCategories = (listings: Listing[]) => {
    return listings.map(listing => {
      // Если есть прямое поле category (новый формат)
      if (listing.category && typeof listing.category === 'object') {
        return {
          ...listing,
          categories: [{
            category: {
              id: listing.category.id,
              name: listing.category.name || categoriesMap[listing.category.id]?.name
            }
          }]
        };
      }

      // Если categories - массив чисел (старый формат без нормализации)
      if (Array.isArray(listing.categories) && listing.categories.length > 0 && typeof listing.categories[0] === 'number') {
        return {
          ...listing,
          categories: (listing.categories as number[]).map(id => ({
            category: {
              id,
              name: categoriesMap[id]?.name || `Категория ${id}`
            }
          }))
        };
      }

      // Если categories уже в правильном формате
      return listing;
    });
  };

  // Загрузка данных и создание карты категорий
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const [categoriesResponse, listingsResponse] = await Promise.all([
          api.get<Category[]>('categories/'),
          api.get<Listing[]>('listings/')
        ]);

        if (!categoriesResponse.data || !listingsResponse.data) {
          throw new Error('Неверный формат данных от сервера');
        }

        // Создаем карту категорий для быстрого доступа
        const map: Record<number, Category> = {};
        categoriesResponse.data.forEach(cat => {
          map[cat.id] = cat;
          if (cat.children) {
            cat.children.forEach(subCat => {
              map[subCat.id] = subCat;
            });
          }
        });
        setCategoriesMap(map);
        setCategories(categoriesResponse.data);

        // Нормализуем данные объявлений с учетом карты категорий
        const normalizedListings = normalizeListingCategories(listingsResponse.data);
        setListings(normalizedListings);

        // Извлекаем уникальные местоположения
        // Проверяем сначала поле location, затем первую часть address
        const uniqueLocations = Array.from(
          new Set(
            normalizedListings
              .map(l => {
                if (l.location && l.location.trim()) {
                  return l.location.trim();
                } else if (l.address) {
                  // Берем первую часть адреса до запятой - обычно это город
                  const cityPart = l.address.split(',')[0].trim();
                  return cityPart || '';
                }
                return '';
              })
              .filter(Boolean)
          )
        );

        setLocations(uniqueLocations as string[]);

      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        setCategories([]);
        setListings([]);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Загрузка объявлений с фильтрами
  const fetchListings = async () => {
    try {
      setFilterLoading(true);

      // Создаем объект параметров для более четкого контроля
      const requestParams: Record<string, string> = {};

      if (searchQuery) requestParams.search = searchQuery;

      if (selectedLocation) {
        requestParams.city = selectedLocation.trim();
      }

      // Фильтр по цене
      if (priceRange.min !== undefined) requestParams.price_min = priceRange.min.toString();
      if (priceRange.max !== undefined) requestParams.price_max = priceRange.max.toString();

      // Фильтр по категории/подкатегории
      const categoryId = selectedSubcategory?.id || selectedCategory?.id;
      if (categoryId) requestParams.category = categoryId.toString();

      // Фильтры атрибутов
      const filters = selectedSubcategory?.filters || selectedCategory?.filters || [];
      filters.forEach(filter => {
        if (filterValues[filter.id] !== undefined && filterValues[filter.id] !== '') {
          if (filter.attribute_type === 'range') {
            if (filterValues[filter.id]?.min) requestParams[`${filter.name}_min`] = filterValues[filter.id].min;
            if (filterValues[filter.id]?.max) requestParams[`${filter.name}_max`] = filterValues[filter.id].max;
          } else {
            const value = Array.isArray(filterValues[filter.id])
              ? filterValues[filter.id].join(',')
              : filterValues[filter.id];
            requestParams[filter.name] = value;
          }
        }
      });

      console.log('Параметры фильтрации:', requestParams); // Отладка параметров

      const response = await api.get<Listing[]>('listings/', {
        params: requestParams
      });

      // Нормализуем данные пришедших объявлений
      const normalizedListings = normalizeListingCategories(response.data);
      setListings(normalizedListings);

    } catch (err) {
      console.error('Ошибка фильтрации:', err);
      setError('Ошибка при загрузке объявлений');
      setListings([]);
    } finally {
      setFilterLoading(false);
    }
  };

  // Дебаунс для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Фильтрация при изменении параметров
  useEffect(() => {
    if (!loading) { // Добавим проверку, чтобы не вызывать фильтрацию при первоначальной загрузке
      fetchListings();
    }
  }, [selectedCategory, selectedSubcategory, filterValues, priceRange, selectedLocation]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setFilterValues({});
  };

  const handleSubcategorySelect = (subcategory: Category) => {
    setSelectedSubcategory(subcategory);
    setFilterValues({});
  };

  const handleFilterChange = (filterId: number, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  const handleCheckboxChange = (filterId: number, option: string, isChecked: boolean) => {
    setFilterValues(prev => {
      const currentValues = prev[filterId] || [];
      let newValues: string[];

      if (isChecked) {
        newValues = [...currentValues, option];
      } else {
        newValues = currentValues.filter((item: string) => item !== option);
      }

      return {
        ...prev,
        [filterId]: newValues
      };
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setFilterValues({});
    setPriceRange({});
    setSelectedLocation('');
  };

  const renderFilterInput = (filter: Filter) => {
    switch (filter.attribute_type) {
      case 'checkbox':
        return (
          <div className="space-y-2">
            {filter.options.map(option => (
              <div key={option} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${filter.id}-${option}`}
                  checked={(filterValues[filter.id] || []).includes(option)}
                  onChange={(e) => handleCheckboxChange(filter.id, option, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`${filter.id}-${option}`} className="ml-2 block text-sm text-gray-900">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      case 'select':
        return (
          <select
            value={filterValues[filter.id] || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Выберите {filter.name.toLowerCase()}</option>
            {filter.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'range':
        return (
          <div className="flex space-x-4">
            <input
              type="number"
              placeholder={`Min (${filter.min_value})`}
              value={filterValues[filter.id]?.min || ''}
              onChange={(e) => handleFilterChange(filter.id, {
                ...filterValues[filter.id],
                min: e.target.value ? Number(e.target.value) : undefined
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              min={filter.min_value}
              max={filter.max_value}
            />
            <input
              type="number"
              placeholder={`Max (${filter.max_value})`}
              value={filterValues[filter.id]?.max || ''}
              onChange={(e) => handleFilterChange(filter.id, {
                ...filterValues[filter.id],
                max: e.target.value ? Number(e.target.value) : undefined
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              min={filter.min_value}
              max={filter.max_value}
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={filterValues[filter.id] || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        );
    }
  };

  // Вспомогательная функция для определения и отображения местоположения объявления
  const getListingLocation = (listing: Listing) => {
    if (listing.location && listing.location.trim()) {
      return listing.location;
    } else if (listing.address) {
      const cityPart = listing.address.split(',')[0].trim();
      return cityPart || listing.address;
    }
    return 'Местоположение не указано';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p className="font-bold">Ошибка загрузки</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">SellUp</Link>
          </div>

          <div className="flex-1 flex justify-center mx-8">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Поиск объявлений..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isLoggedIn && (
              <button
                onClick={() => navigate('/messages')}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Сообщения"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
            {isLoggedIn ? (
              <Link to="/profile" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Профиль
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-white shadow-md p-4 hidden md:block">
          <div className="h-full flex flex-col">
            <div className="flex-grow space-y-6">
              <h3 className="font-bold text-lg mb-4">Фильтры</h3>

              <div>
                <h4 className="font-medium mb-2">Местоположение</h4>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Все местоположения</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="font-medium mb-2">Цена (₽)</h4>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="От"
                    className="w-full p-2 border rounded"
                    value={priceRange.min ?? ''}
                    onChange={(e) => setPriceRange({
                      ...priceRange,
                      min: e.target.value ? Number(e.target.value) : undefined
                    })}
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    className="w-full p-2 border rounded"
                    value={priceRange.max ?? ''}
                    onChange={(e) => setPriceRange({
                      ...priceRange,
                      max: e.target.value ? Number(e.target.value) : undefined
                    })}
                    min={priceRange.min || 0}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Категории</h4>
                <div className="space-y-2">
                  {categories.filter(c => !c.parent).map(category => (
                    <div key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        id={`cat-${category.id}`}
                        name="category"
                        checked={selectedCategory?.id === category.id}
                        onChange={() => handleCategorySelect(category)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor={`cat-${category.id}`} className="ml-2 block text-sm text-gray-900">
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCategory?.children && (
                <div>
                  <h4 className="font-medium mb-2">Подкатегории</h4>
                  <div className="space-y-2">
                    {selectedCategory.children.map(subcategory => (
                      <div key={subcategory.id} className="flex items-center">
                        <input
                          type="radio"
                          id={`subcat-${subcategory.id}`}
                          name="subcategory"
                          checked={selectedSubcategory?.id === subcategory.id}
                          onChange={() => handleSubcategorySelect(subcategory)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor={`subcat-${subcategory.id}`} className="ml-2 block text-sm text-gray-900">
                          {subcategory.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedSubcategory?.filters || selectedCategory?.filters)?.map(filter => (
                <div key={filter.id} className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">{filter.name}</h4>
                  {renderFilterInput(filter)}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4">
              <button
                className="w-full py-2 border border-gray-300 rounded hover:bg-gray-200"
                onClick={handleResetFilters}
              >
                Сбросить все фильтры
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-grow container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">
            {selectedSubcategory?.name || selectedCategory?.name || 'Все объявления'}
          </h1>

          {filterLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Объявления не найдены</h3>
              <p className="mt-1 text-gray-500">Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition flex flex-col h-full">
                  <Link to={`/listing/${listing.id}`} className="flex flex-col h-full">
                    <div className="relative h-48 w-full overflow-hidden">
                      {listing.images?.length > 0 ? (
                        <img
                          src={listing.images[0].url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                          Нет изображения
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-md text-sm font-semibold">
                        {listing.price} ₽
                      </div>
                    </div>

                    <div className="p-4 flex flex-col">
                      <h2 className="font-bold text-xl mb-2 truncate">{listing.title}</h2>
                      <div className="flex items-center text-gray-600 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm truncate">{getListingLocation(listing)}</span>
                      </div>

                      {/* Улучшенное отображение категорий */}
                      {listing.categories && Array.isArray(listing.categories) && listing.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(listing.categories as any).slice(0, 3).map((cat: any, index: number) => {
                            // Проверяем и получаем данные категории независимо от формата
                            let categoryName = '';
                            let categoryId: number | null = null;

                            if (typeof cat === 'number') {
                              categoryId = cat;
                              categoryName = categoriesMap[cat]?.name || `Категория ${cat}`;
                            } else if (cat.category) {
                              categoryId = cat.category.id;
                              categoryName = cat.category.name || categoriesMap[cat.category.id]?.name || `Категория ${cat.category.id}`;
                            }

                            if (!categoryName) return null;

                            return (
                              <span
                                key={`${listing.id}-cat-${index}`}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                title={categoryName}
                              >
                                {categoryName.length > 10
                                  ? `${categoryName.substring(0, 8)}...`
                                  : categoryName}
                              </span>
                            );
                          }).filter(Boolean)}
                          {listing.categories.length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              +{listing.categories.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-sm text-gray-500">
                          {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-400 text-sm">SellUp - Лучшая площадка для покупки и продажи товаров</p>
            </div>
            <div className="flex space-x-6">
              <Link to="/about" className="text-gray-400 hover:text-white text-sm">О нас</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm">Правила</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white text-sm">Контакты</Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-xs">
            © {new Date().getFullYear()} SellUp. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ListingPage;