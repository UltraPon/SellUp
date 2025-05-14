import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_BASE_URL = 'https://sellup.onrender.com/api/';

interface Listing {
  id: number;
  title: string;
  price: string;
  address: string;
  created_at: string;
  images: { url: string }[];
  categories?: Category[];
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

// Define a type for possible category representation in API responses
interface CategoryRef {
  id: number;
  name?: string;
}

// Normalized category structure
interface NormalizedCategory {
  category: {
    id: number;
    name: string;
  };
}

// Extend Listing type to include potential category field from API
interface ApiListing extends Listing {
  category?: CategoryRef;
}

// Define normalized listing type
interface NormalizedListing extends Omit<Listing, 'categories'> {
  categories: NormalizedCategory[];
}

const ListingPage = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Нормализация данных категорий
  const normalizeListingCategories = (listings: ApiListing[]): NormalizedListing[] => {
    return listings.map(listing => {
      // Обработка случая, когда категория представлена как объект в поле category
      if (listing.category && typeof listing.category === 'object') {
        return {
          ...listing,
          categories: [{
            category: {
              id: listing.category.id,
              name: listing.category.name || categoriesMap[listing.category.id]?.name || `Категория ${listing.category.id}`
            }
          }]
        };
      }

      // Обработка случая, когда категории представлены как массив ID
      if (Array.isArray(listing.categories) && listing.categories.length > 0) {
        // Проверяем, является ли первый элемент числом (массив ID)
        if (typeof listing.categories[0] === 'number') {
          return {
            ...listing,
            categories: (listing.categories as unknown as number[]).map(id => ({
              category: {
                id,
                name: categoriesMap[id]?.name || `Категория ${id}`
              }
            }))
          };
        }
        
        // Если categories уже в правильном формате или потенциально подходит
        if (listing.categories.every(c => typeof c === 'object' && 'id' in c)) {
          return {
            ...listing,
            categories: listing.categories.map(cat => ({
              category: {
                id: cat.id,
                name: cat.name || categoriesMap[cat.id]?.name || `Категория ${cat.id}`
              }
            }))
          };
        }
      }

      // Если категорий нет, возвращаем с пустым массивом
      return {
        ...listing,
        categories: []
      };
    });
  };

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);

      const [categoriesResponse, listingsResponse] = await Promise.all([
        axios.get<Category[]>(`${API_BASE_URL}categories/`),
        axios.get<ApiListing[]>(`${API_BASE_URL}listings/`)
      ]);

      // Создаем карту категорий
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

      // Нормализуем объявления
      const normalizedListings = normalizeListingCategories(listingsResponse.data);
      // Приводим к общему типу Listing для совместимости с состоянием
      setListings(normalizedListings as unknown as Listing[]);

      // Извлекаем уникальные местоположения
      const uniqueLocations = Array.from(
        new Set(
          normalizedListings
            .map(l => {
              if (l.location && l.location.trim()) {
                return l.location.trim();
              } else if (l.address) {
                return l.address.split(',')[0].trim() || '';
              }
              return '';
            })
            .filter(Boolean)
        )
      );
      setLocations(uniqueLocations as string[]);

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Загрузка с фильтрами
  const fetchListings = async () => {
    try {
      setFilterLoading(true);

      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedLocation) params.city = selectedLocation.trim();
      if (priceRange.min !== undefined) params.price_min = priceRange.min.toString();
      if (priceRange.max !== undefined) params.price_max = priceRange.max.toString();

      const categoryId = selectedSubcategory?.id || selectedCategory?.id;
      if (categoryId) params.category = categoryId.toString();

      const filters = selectedSubcategory?.filters || selectedCategory?.filters || [];
      filters.forEach(filter => {
        if (filterValues[filter.id] !== undefined && filterValues[filter.id] !== '') {
          if (filter.attribute_type === 'range') {
            if (filterValues[filter.id]?.min) params[`${filter.name}_min`] = filterValues[filter.id].min;
            if (filterValues[filter.id]?.max) params[`${filter.name}_max`] = filterValues[filter.id].max;
          } else {
            const value = Array.isArray(filterValues[filter.id])
              ? filterValues[filter.id].join(',')
              : filterValues[filter.id];
            params[filter.name] = value;
          }
        }
      });

      const response = await axios.get<ApiListing[]>(`${API_BASE_URL}listings/`, { params });
      const normalizedListings = normalizeListingCategories(response.data);
      setListings(normalizedListings as unknown as Listing[]);

    } catch (err) {
      console.error('Ошибка фильтрации:', err);
      setError('Ошибка при загрузке объявлений');
    } finally {
      setFilterLoading(false);
    }
  };

  // Обновление при изменении параметров
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        fetchListings();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedCategory, selectedSubcategory, filterValues, priceRange, selectedLocation]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchData();
  }, []);

  // Обработчики
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
    setFilterValues(prev => ({ ...prev, [filterId]: value }));
  };

  const handleCheckboxChange = (filterId: number, option: string, isChecked: boolean) => {
    setFilterValues(prev => {
      const currentValues = prev[filterId] || [];
      const newValues = isChecked 
        ? [...currentValues, option] 
        : currentValues.filter((item: string) => item !== option);
      return { ...prev, [filterId]: newValues };
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Рендер элементов фильтра
  const renderFilterInput = (filter: Filter) => {
    switch (filter.attribute_type) {
      case 'checkbox':
        return (
          <View style={styles.checkboxContainer}>
            {filter.options.map(option => (
              <View key={option} style={styles.checkboxItem}>
                <CheckBox
                  value={(filterValues[filter.id] || []).includes(option)}
                  onValueChange={(isChecked) => handleCheckboxChange(filter.id, option, isChecked)}
                />
                <Text style={styles.checkboxLabel}>{option}</Text>
              </View>
            ))}
          </View>
        );
      case 'select':
        return (
          <Picker
            selectedValue={filterValues[filter.id] || ''}
            onValueChange={(value) => handleFilterChange(filter.id, value)}
            style={styles.picker}
          >
            <Picker.Item label={`Выберите ${filter.name.toLowerCase()}`} value="" />
            {filter.options.map(option => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        );
      case 'range':
        return (
          <View style={styles.rangeInputContainer}>
            <TextInput
              style={[styles.input, styles.rangeInput]}
              placeholder={`Min (${filter.min_value})`}
              value={filterValues[filter.id]?.min?.toString() || ''}
              onChangeText={(value) => handleFilterChange(filter.id, {
                ...filterValues[filter.id],
                min: value ? Number(value) : undefined
              })}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.rangeInput]}
              placeholder={`Max (${filter.max_value})`}
              value={filterValues[filter.id]?.max?.toString() || ''}
              onChangeText={(value) => handleFilterChange(filter.id, {
                ...filterValues[filter.id],
                max: value ? Number(value) : undefined
              })}
              keyboardType="numeric"
            />
          </View>
        );
      default:
        return (
          <TextInput
            style={styles.input}
            value={filterValues[filter.id]?.toString() || ''}
            onChangeText={(value) => handleFilterChange(filter.id, value)}
          />
        );
    }
  };

  // Получение местоположения для объявления
  const getListingLocation = (listing: Listing) => {
    if (listing.location && listing.location.trim()) {
      return listing.location;
    } else if (listing.address) {
      return listing.address.split(',')[0].trim() || listing.address;
    }
    return 'Местоположение не указано';
  };

  // Рендер карточки объявления
  const renderItem = ({ item }: { item: Listing }) => (
    <Pressable 
      style={styles.listingCard}
      onPress={() => navigation.navigate('ListingDetails', { id: item.id.toString() })}
    >
      <View style={styles.imageContainer}>
        {item.images?.length > 0 ? (
          <Image 
            source={{ uri: item.images[0].url }} 
            style={styles.listingImage}
            resizeMode="cover"
            onError={() => console.log('Image load error')}
          />
        ) : (
          <View style={[styles.listingImage, styles.noImage]}>
            <Icon name="image-not-supported" size={40} color="#9ca3af" />
          </View>
        )}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.price} ₽</Text>
        </View>
      </View>

      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
        
        <View style={styles.locationRow}>
          <Icon name="location-on" size={16} color="#6b7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            {getListingLocation(item)}
          </Text>
        </View>

        {item.categories && item.categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {(item.categories as unknown as NormalizedCategory[]).slice(0, 3).map((cat, index) => {
              let categoryName = '';
              if (typeof cat === 'number') {
                categoryName = categoriesMap[cat]?.name || `Категория ${cat}`;
              } else if ('category' in cat) {
                categoryName = cat.category.name || categoriesMap[cat.category.id]?.name || `Категория ${cat.category.id}`;
              } else if ('id' in cat) {
                categoryName = (cat as unknown as Category).name || categoriesMap[(cat as unknown as Category).id]?.name || `Категория ${(cat as unknown as Category).id}`;
              }
              return categoryName ? (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {categoryName.length > 10 ? `${categoryName.substring(0, 8)}...` : categoryName}
                  </Text>
                </View>
              ) : null;
            })}
            {item.categories.length > 3 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>+{item.categories.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('ru-RU')}
        </Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={fetchData}
        >
          <Text style={styles.refreshButtonText}>Обновить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Шапка с поиском */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#3b82f6" />
        </Pressable>
        
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск объявлений..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Pressable onPress={() => setShowFilters(!showFilters)}>
          <Icon name="filter-list" size={24} color="#3b82f6" />
        </Pressable>
      </View>

      {/* Фильтры */}
      {showFilters && (
        <ScrollView style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Фильтры</Text>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Местоположение</Text>
            <Picker
              selectedValue={selectedLocation}
              onValueChange={setSelectedLocation}
              style={styles.picker}
            >
              <Picker.Item label="Все местоположения" value="" />
              {locations.map(location => (
                <Picker.Item key={location} label={location} value={location} />
              ))}
            </Picker>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Цена (₽)</Text>
            <View style={styles.priceRangeContainer}>
              <TextInput
                style={[styles.input, styles.rangeInput]}
                placeholder="От"
                value={priceRange.min?.toString() || ''}
                onChangeText={(value) => setPriceRange({
                  ...priceRange,
                  min: value ? Number(value) : undefined
                })}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.rangeInput]}
                placeholder="До"
                value={priceRange.max?.toString() || ''}
                onChangeText={(value) => setPriceRange({
                  ...priceRange,
                  max: value ? Number(value) : undefined
                })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Категории</Text>
            <View style={styles.categoriesList}>
              {categories.filter(c => !c.parent).map(category => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory?.id === category.id && styles.selectedCategoryButton
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory?.id === category.id && styles.selectedCategoryButtonText
                  ]}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {selectedCategory?.children && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Подкатегории</Text>
              <View style={styles.categoriesList}>
                {selectedCategory.children.map(subcategory => (
                  <Pressable
                    key={subcategory.id}
                    style={[
                      styles.categoryButton,
                      selectedSubcategory?.id === subcategory.id && styles.selectedCategoryButton
                    ]}
                    onPress={() => handleSubcategorySelect(subcategory)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedSubcategory?.id === subcategory.id && styles.selectedCategoryButtonText
                    ]}>
                      {subcategory.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {(selectedSubcategory?.filters || selectedCategory?.filters)?.map(filter => (
            <View key={filter.id} style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{filter.name}</Text>
              {renderFilterInput(filter)}
            </View>
          ))}

          <Pressable
            style={styles.resetButton}
            onPress={handleResetFilters}
          >
            <Text style={styles.resetButtonText}>Сбросить все фильтры</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Основной контент */}
      <View style={styles.content}>
        <Text style={styles.pageTitle}>
          {selectedSubcategory?.name || selectedCategory?.name || 'Все объявления'}
        </Text>

        {filterLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={50} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Объявления не найдены</Text>
            <Text style={styles.emptyText}>Попробуйте изменить параметры поиска</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.listRow}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginHorizontal: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filtersContainer: {
    maxHeight: 400,
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1e293b',
  },
  filterSection: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  picker: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
  },
  rangeInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  selectedCategoryButton: {
    backgroundColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedCategoryButtonText: {
    color: '#fff',
  },
  filterGroup: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  checkboxContainer: {
    marginTop: 5,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  resetButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1e293b',
  },
  listRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listingCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imageContainer: {
    height: 150,
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#3b82f6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listingContent: {
    padding: 10,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e293b',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 5,
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 5,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 10,
    color: '#6b7280',
  },
  dateText: {
    fontSize: 10,
    color: '#9ca3af',
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ListingPage;