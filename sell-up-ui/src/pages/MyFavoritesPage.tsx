import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
}

interface Listing {
  id: number;
  title: string;
  price: string;
  description: string;
  address: string;
  created_at: string;
  images: { url: string }[];
  user: User | null;
}

interface Favorite {
  id: number;
  listing: Listing;
}

const MyFavoritesPage = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://127.0.0.1:8000/api/my-favorites/', {
          headers: {
            'Authorization': `Token ${token}`
          }
        });

        // Нормализация данных
        const normalizedFavorites = response.data.map((favorite: any) => ({
          ...favorite,
          listing: {
            ...favorite.listing,
            user: favorite.listing.user || null,
            images: favorite.listing.images || [],
            created_at: favorite.listing.created_at || new Date().toISOString()
          }
        }));

        setFavorites(normalizedFavorites);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Не удалось загрузить избранное. Пожалуйста, попробуйте позже.');
          console.error('Ошибка загрузки избранного:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [navigate]);

  const removeFromFavorites = async (favoriteId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(`http://127.0.0.1:8000/api/favorites/${favoriteId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
    } catch (err) {
      console.error('Ошибка при удалении из избранного:', err);
      setError('Не удалось удалить из избранного');
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleDateString('ru-RU');
    } catch {
      return 'Дата не указана';
    }
  };

  return (
      <div className="min-h-screen flex flex-col">
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

        <div className="flex-1 container mx-auto px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Мои избранные объявления</h1>

            {favorites.length === 0 ? (
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
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">У вас пока нет избранных объявлений</h3>
                  <p className="mt-2 text-gray-500">Добавляйте понравившиеся объявления в избранное</p>
                  <div className="mt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Найти объявления
                    </Link>
                  </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites.map((favorite) => (
                      <div key={favorite.id}
                           className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <div className="relative h-48 w-full overflow-hidden">
                          {favorite.listing.images?.length > 0 ? (
                              <img
                                  src={favorite.listing.images[0].url}
                                  alt={favorite.listing.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = '';
                                    target.parentElement!.className = 'w-full h-full bg-gray-200 flex items-center justify-center';
                                    target.parentElement!.innerHTML = '<span className="text-gray-500">Нет изображения</span>';
                                  }}
                              />
                          ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Нет изображения</span>
                              </div>
                          )}
                          <div
                              className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-md text-sm font-semibold">
                            {favorite.listing.price} ₽
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">{favorite.listing.title}</h2>
                            <button
                                onClick={() => removeFromFavorites(favorite.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Удалить из избранного"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                                   fill="currentColor">
                                <path fillRule="evenodd"
                                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                      clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                          <p className="mt-2 text-gray-600 line-clamp-2">{favorite.listing.description}</p>
                          <p className="mt-2 text-sm text-gray-500">Продавец: {favorite.listing.user?.username || 'Неизвестно'}</p>
                          <p className="mt-1 text-sm text-gray-500">{favorite.listing.address}</p>

                          <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {formatDate(favorite.listing.created_at)}
                      </span>
                            <Link
                                to={`/listing/${favorite.listing.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                              Подробнее
                            </Link>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>

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

export default MyFavoritesPage;