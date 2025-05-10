import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';

interface UserProfile {
  username: string;
  email: string;
  phone_number?: string;
}

interface Listing {
  id: number;
  title: string;
  price: string;
  category?: string;
  created_at: string;
}

interface Favorite {
  id: number;
  listing: Listing;
}

interface ApiError {
  isAxiosError?: boolean;
  response?: {
    status?: number;
    data?: any;
  };
  message?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    phone_number: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [myAds, setMyAds] = useState<Listing[]>([]);
  const [favoriteAds, setFavoriteAds] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get<UserProfile>('profile/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      const profileData = {
        username: response.data.username || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || ''
      };

      setProfile(profileData);
      setFormData({
        username: profileData.username,
        phone_number: profileData.phone_number || ''
      });
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка при загрузке профиля:', error);
      setError('Не удалось загрузить профиль');
      if (error.isAxiosError && error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchMyAds = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get<Listing[]>('my-listings/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setMyAds(response.data);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка при загрузке объявлений:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get<Favorite[]>('favorites/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      const favoritesListings = response.data.map(item => item.listing);
      setFavoriteAds(favoritesListings);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка при загрузке избранного:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchProfile();
        await fetchMyAds();
        await fetchFavorites();
        setError('');
      } catch (err: unknown) {
        const error = err as ApiError;
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Нет токена');

      const response = await api.put<UserProfile>(
        'profile/',
        {
          username: formData.username,
          phone_number: formData.phone_number
        },
        {
          headers: {
            'Authorization': `Token ${token}`
          }
        }
      );

      const updatedProfile = {
        username: response.data.username,
        email: response.data.email,
        phone_number: response.data.phone_number
      };

      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка при обновлении профиля:', error);
      setError('Ошибка при обновлении профиля');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-blue-600">SellUp</Link>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        Выйти
                    </button>
                </div>
            </header>

            <div className="flex flex-1 container mx-auto px-4 py-6">
                <div className="w-full mx-auto bg-white p-6 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold mb-6">Профиль пользователя</h1>

                    {loading ? (
                        <div className="text-center py-8">Загрузка профиля...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : profile ? (
                        <>
                            {isEditing ? (
                                <div className="mb-8">
                                    <div className="mb-4">
                                        <label className="block font-medium">Имя пользователя:</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block font-medium">Телефон:</label>
                                        <input
                                            type="text"
                                            name="phone_number"
                                            value={formData.phone_number || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="flex space-x-4">
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Сохранить
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8">
                                    <div className="mb-6">
                                        <p className="mb-2"><strong>Имя пользователя:</strong> {profile.username}</p>
                                        <p className="mb-2"><strong>Email:</strong> {profile.email}</p>
                                        {profile.phone_number && (
                                            <p className="mb-2"><strong>Телефон:</strong> {profile.phone_number}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col space-y-4 items-start">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-auto"
                                        >
                                            Редактировать профиль
                                        </button>

                                        <button
                                            onClick={() => navigate('/create-ad')}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-auto"
                                        >
                                            Создать объявление
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4">Мои объявления</h2>
                            <div className="space-y-3">
                                {myAds.length > 0 ? (
                                    myAds.map(ad => (
                                        <div key={ad.id} className="border-b border-gray-100 pb-2">
                                            <Link to={`/listing/${ad.id}`} className="font-medium hover:text-blue-600">
                                                {ad.title}
                                            </Link>
                                            <p className="text-sm text-gray-600">{ad.price} ₽</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(ad.created_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">У вас пока нет объявлений</p>
                                )}
                            </div>
                            <Link
                                to="/my-ads"
                                className="mt-4 inline-block text-blue-600 hover:text-blue-800"
                            >
                                Посмотреть все →
                            </Link>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h2 className="text-xl font-semibold mb-4">Избранные объявления</h2>
                            <div className="space-y-3">
                                {favoriteAds.length > 0 ? (
                                    favoriteAds.map(ad => (
                                        <div key={ad.id} className="border-b border-gray-100 pb-2">
                                            <Link to={`/listing/${ad.id}`} className="font-medium hover:text-blue-600">
                                                {ad.title || 'Без названия'}
                                            </Link>
                                            <p className="text-sm text-gray-600">{ad.price || 'Цена не указана'} ₽</p>
                                            <p className="text-xs text-gray-400">
                                                {ad.created_at ? new Date(ad.created_at).toLocaleDateString('ru-RU') : 'Дата не указана'}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">У вас пока нет избранных объявлений</p>
                                )}
                            </div>
                            <Link
                                to="/my-favorites"
                                className="mt-4 inline-block text-blue-600 hover:text-blue-800"
                            >
                                Посмотреть все →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="bg-gray-800 text-white py-4">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-4 md:mb-0">
                            <p className="text-gray-400 text-sm">SellUp - Лучшая площадка для покупки и продажи
                                товаров</p>
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

export default Profile;