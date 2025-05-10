import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/apiClient';
import { Link, useNavigate } from 'react-router-dom';

interface ImageData {
  file: File;
  preview: string;
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

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_COUNT = 10;

const CreateAdPage = () => {
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
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('categories/');
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        setError('Не удалось загрузить категории. Пожалуйста, обновите страницу.');
      }
    };
    fetchCategories();

    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, []);

  // Автоматическое расширение textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [adData.description]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAdData(prev => ({ ...prev, price: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    let errorMessage = '';

    if (images.length + files.length > MAX_IMAGE_COUNT) {
      errorMessage = `Максимальное количество изображений - ${MAX_IMAGE_COUNT}`;
    }

    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      errorMessage = `Некоторые изображения превышают ${MAX_IMAGE_SIZE_MB}MB: ${oversizedFiles.map(f => f.name).join(', ')}`;
    }

    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      errorMessage = `Некоторые файлы не являются изображениями: ${invalidFiles.map(f => f.name).join(', ')}`;
    }

    if (errorMessage) {
      setError(errorMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
    setError('');
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

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].preview);
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Валидация
      if (!adData.title.trim()) return setError('Введите заголовок объявления');
      if (!adData.price.trim()) return setError('Укажите цену');
      if (!adData.address.trim()) return setError('Укажите адрес');
      if (images.length === 0) return setError('Добавьте хотя бы одно изображение');
      if (!selectedCategory && !selectedSubcategory) return setError('Выберите категорию');

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
        formData.append('images', image.file);
      });

      // Отправка
      const response = await api.post(
        'listings/',
        formData,
        {
          headers: {
            'Authorization': `Token ${token}`,
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
        navigate(`/listing/${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Ошибка:', error);
      let errorMsg = 'Не удалось создать объявление';

      if (error.isAxiosError(error)) {
        // Обработка ошибок валидации
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

      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
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
      case 'number':
        return (
          <input
            type="number"
            value={filterValues[filter.id] || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">SellUp</Link>
          </div>
          <Link to="/profile" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Профиль
          </Link>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6">Создание объявления</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Заголовок <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={adData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Описание</label>
              <textarea
                ref={textareaRef}
                name="description"
                value={adData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                style={{ minHeight: '100px' }}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Адрес <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={adData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Цена (₽) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="price"
                  value={adData.price}
                  onChange={handlePriceChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-12"
                  required
                />
                <span className="absolute left-3 top-2 text-gray-500">₽</span>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Категория <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategory?.id || ''}
                onChange={(e) => handleCategorySelect(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Выберите категорию</option>
                {categories.filter(c => !c.parent).map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            {selectedCategory?.children && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Подкатегория
                </label>
                <select
                  value={selectedSubcategory?.id || ''}
                  onChange={(e) => handleSubcategorySelect(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Выберите подкатегорию</option>
                  {selectedCategory.children.map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(selectedSubcategory?.filters || selectedCategory?.filters)?.map(filter => (
              <div key={filter.id} className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-gray-700 font-medium mb-2">
                  {filter.name}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Изображения <span className="text-red-500">*</span> (максимум {MAX_IMAGE_COUNT})
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                multiple
                className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                disabled={images.length >= MAX_IMAGE_COUNT}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Preview ${index}`}
                      className="h-32 w-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link
                to="/"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Отмена
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Создание...' : 'Создать объявление'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAdPage;