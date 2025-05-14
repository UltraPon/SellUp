import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';

const API_BASE_URL = 'https://sellup.onrender.com/api/';

interface ImageData {
  uri: string;
  name: string;
  type: string;
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

interface Category {
  id: number;
  name: string;
  parent: number | null;
  children: Category[] | null;
  filters: Filter[];
}

const MAX_IMAGE_COUNT = 10;

const CreateAdPage = () => {

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [adData, setAdData] = useState({
    title: '',
    description: '',
    price: '',
    address: '',
  });
  const [images, setImages] = useState<ImageData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [filterValues, setFilterValues] = useState<Record<number, any>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}categories/`);
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        setError('Не удалось загрузить категории. Пожалуйста, попробуйте позже.');
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (name: keyof typeof adData, value: string) => {
    setAdData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (value: string) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setAdData(prev => ({ ...prev, price: cleanedValue }));
  };

  const pickImages = async () => {
    if (images.length >= MAX_IMAGE_COUNT) {
      Alert.alert(`Максимальное количество изображений - ${MAX_IMAGE_COUNT}`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGE_COUNT - images.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.uri.split('/').pop() || `image-${Date.now()}.jpg`,
        type: 'image/jpeg',
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId) || null;
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setFilterValues({});
  };

  const handleSubcategorySelect = (subcategoryId: number) => {
    const subcategory = selectedCategory?.children?.find(c => c.id === subcategoryId) || null;
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
      const currentValues: string[] = prev[filterId] || [];
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

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      // Валидация
      if (!adData.title.trim()) {
        throw new Error('Введите заголовок объявления');
      }
      if (!adData.price.trim()) {
        throw new Error('Укажите цену');
      }
      if (!adData.address.trim()) {
        throw new Error('Укажите адрес');
      }
      if (images.length === 0) {
        throw new Error('Добавьте хотя бы одно изображение');
      }
      if (!selectedCategory && !selectedSubcategory) {
        throw new Error('Выберите категорию');
      }

      const formData = new FormData();

      // Основные данные
      formData.append('title', adData.title.trim());
      formData.append('description', adData.description.trim());
      formData.append('price', adData.price.trim());
      formData.append('address', adData.address.trim());
      formData.append('category_id', (selectedSubcategory || selectedCategory)?.id.toString() || '');

      // Атрибуты
      const attributes: Record<string, any> = {};
      const filters = selectedSubcategory?.filters || selectedCategory?.filters || [];
      filters.forEach(filter => {
        if (filterValues[filter.id] !== undefined) {
          attributes[filter.name] = filterValues[filter.id];
        }
      });
      formData.append('attributes', JSON.stringify(attributes));

      // Изображения
      images.forEach(image => {
        formData.append('images', {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);
      });

      // Отправка
      const response = await axios.post(
        `${API_BASE_URL}listings/`,
        formData,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000
        }
      );

      if (response.status === 201) {
        // Очистка формы
        setAdData({ title: '', description: '', price: '', address: '' });
        setImages([]);
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        setFilterValues({});

        // Перенаправление
        navigation.navigate('ListingDetails', { id: response.data.id });
      }
    } catch (error: any) {
      console.error('Ошибка:', error);
      let errorMsg = 'Не удалось создать объявление';

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.images) {
          errorMsg = Array.isArray(error.response.data.images)
            ? error.response.data.images.join('\n')
            : String(error.response.data.images);
        }
        else if (error.response?.data?.error) {
          errorMsg = String(error.response.data.error);
        }
        else if (error.response?.data) {
          errorMsg = error.response.data.message
            ? String(error.response.data.message)
            : JSON.stringify(error.response.data);
        }
      } else {
        errorMsg = error.message || 'Неизвестная ошибка';
      }

      Alert.alert('Ошибка', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <View style={styles.rangeContainer}>
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
      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={filterValues[filter.id]?.toString() || ''}
            onChangeText={(value) => handleFilterChange(filter.id, value ? Number(value) : '')}
            keyboardType="numeric"
          />
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SellUp</Text>
        <Pressable 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileButtonText}>Профиль</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Создание объявления</Text>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Заголовок <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={adData.title}
            onChangeText={(value) => handleChange('title', value)}
            maxLength={100}
            placeholder="Введите заголовок"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={adData.description}
            onChangeText={(value) => handleChange('description', value)}
            multiline
            numberOfLines={4}
            maxLength={1000}
            placeholder="Опишите ваш товар"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Адрес <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={adData.address}
            onChangeText={(value) => handleChange('address', value)}
            placeholder="Укажите адрес"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Цена (₽) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currencySymbol}>₽</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={adData.price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Категория <Text style={styles.required}>*</Text>
          </Text>
          <Picker
            selectedValue={selectedCategory?.id || ''}
            onValueChange={(itemValue) => handleCategorySelect(Number(itemValue))}
            style={styles.picker}
          >
            <Picker.Item label="Выберите категорию" value="" />
            {categories.filter(c => !c.parent).map(category => (
              <Picker.Item key={category.id} label={category.name} value={category.id} />
            ))}
          </Picker>
        </View>

        {selectedCategory?.children && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Подкатегория</Text>
            <Picker
              selectedValue={selectedSubcategory?.id || ''}
              onValueChange={(itemValue) => handleSubcategorySelect(Number(itemValue))}
              style={styles.picker}
            >
              <Picker.Item label="Выберите подкатегорию" value="" />
              {selectedCategory.children.map(subcategory => (
                <Picker.Item key={subcategory.id} label={subcategory.name} value={subcategory.id} />
              ))}
            </Picker>
          </View>
        )}

        {(selectedSubcategory?.filters || selectedCategory?.filters)?.map(filter => (
          <View key={filter.id} style={styles.filterContainer}>
            <Text style={styles.filterLabel}>{filter.name}</Text>
            {renderFilterInput(filter)}
          </View>
        ))}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Изображения <Text style={styles.required}>*</Text> (максимум {MAX_IMAGE_COUNT})
          </Text>
          <Pressable
            style={styles.imagePickerButton}
            onPress={pickImages}
            disabled={images.length >= MAX_IMAGE_COUNT}
          >
            <Text style={styles.imagePickerButtonText}>Выбрать изображения</Text>
          </Pressable>

          <FlatList
            data={images}
            horizontal
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.uri }} style={styles.image} />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageButtonText}>×</Text>
                </Pressable>
              </View>
            )}
            contentContainerStyle={styles.imageList}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Создать объявление</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  profileButton: {
    padding: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontSize: 16,
    color: '#6b7280',
  },
  priceInput: {
    paddingLeft: 30,
  },
  picker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  filterContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#374151',
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
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  imagePickerButton: {
    padding: 12,
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  imageList: {
    paddingVertical: 5,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
});

export default CreateAdPage;