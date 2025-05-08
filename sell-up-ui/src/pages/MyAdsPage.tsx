import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

interface Listing {
  id: number;
  title: string;
  price: number;
  description: string;
  created_at: string;
  images: { url: string }[];
  user: number; // Добавляем информацию о владельце
}

const MyAdsPage = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Получаем текущего пользователя
        const userResponse = await axios.get('http://127.0.0.1:8000/api/profile/', {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        setCurrentUser(userResponse.data.id);

        // Получаем объявления
        const listingsResponse = await axios.get('http://127.0.0.1:8000/api/my-listings/', {
          headers: {
            'Authorization': `Token ${token}`
          }
        });

        setListings(listingsResponse.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
          console.error('Ошибка загрузки:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это объявление?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(`http://127.0.0.1:8000/api/listings/${id}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      // Обновляем список после удаления
      setListings(listings.filter(listing => listing.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении:', err);
      setError('Не удалось удалить объявление');
    }
  };

  if (loading) return (
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </div>
  );

  if (error) return (
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    </div>
  );

  return (
      <div className="min-h-screen flex flex-col">
        {/* Шапка */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-600">SellUp</Link>
            </div>

            <div className="flex items-center space-x-4">
              <button
                  onClick={() => navigate('/messages')}
                  className="p-2 text-gray-600 hover:text-blue-600"
                  title="Сообщения"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </button>
              <Link to="/profile" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Профиль
              </Link>
            </div>
          </div>
        </header>


        {/* Основное содержимое */}
        <div className="flex-1 container mx-auto px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Мои объявления</h1>
              <Link
                  to="/create-ad"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20"
                     fill="currentColor">
                  <path fillRule="evenodd"
                        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                        clipRule="evenodd"/>
                </svg>
                Создать новое
              </Link>
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                  <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">У вас пока нет объявлений</h3>
                  <p className="mt-2 text-gray-500">Начните продавать - создайте свое первое объявление</p>
                  <div className="mt-6">
                    <Link
                        to="/create-ad"
                        className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Создать объявление
                    </Link>
                  </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                      <div key={listing.id}
                           className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Изображение */}
                        <div className="relative h-48 w-full overflow-hidden">
                          {listing.images?.length > 0 ? (
                              <img
                                  src={listing.images[0].url}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                              />
                          ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Нет изображения</span>
                              </div>
                          )}
                          {/* Бейдж цены */}
                          <div
                              className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-md text-sm font-semibold">
                            {listing.price} ₽
                          </div>
                        </div>

                        {/* Контент карточки */}
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">{listing.title}</h2>
                          </div>
                          <p className="mt-2 text-gray-600 line-clamp-2">{listing.description}</p>

                          <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                      </span>

                            <div className="mt-4 flex justify-between items-center">

                              {/* Кнопки действий */}
                              <div className="flex space-x-2">
                                <Link
                                    to={`/listing/${listing.id}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                  Просмотр
                                </Link>

                                <button
                                    onClick={() => handleDelete(listing.id)}
                                    className="text-sm font-medium text-red-600 hover:text-red-500"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Подвал */}
        <footer className="bg-gray-800 text-white py-6">
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

export default MyAdsPage;