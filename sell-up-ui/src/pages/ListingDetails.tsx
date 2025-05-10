import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/apiClient";

const StarRating = ({ rating, setRating }: { rating: number; setRating?: (rating: number) => void }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating && setRating(star)}
          className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          disabled={!setRating}
        >
          ★
        </button>
      ))}
    </div>
  );
};

interface Listing {
  id: number;
  title: string;
  description: string;
  price: string;
  address: string;
  created_at: string;
  images?: { url: string }[];
  user: {
    id: number;
    username: string;
    phone_number?: string;
  };
}

interface Review {
  id: number;
  reviewer: {
    id: number;
    username: string;
  };
  rating: number;
  comment: string;
  created_at: string;
}

interface Message {
  id: number;
  content: string;
  created_at: string;
}

interface Favorite {
  id: number;
  listing: number;
}

interface ApiError {
  isAxiosError?: boolean;
  response?: {
    status?: number;
    data?: any;
    statusText?: string;
  };
  message?: string;
}

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{id: number} | null>(null);
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const navigateToChat = () => {
  if (!listing) return;
  navigate(`/messages/${listing.user.id}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem('token');

        // Параллельная загрузка основных данных
        const [listingResponse, userResponse, favoriteResponse] = await Promise.all([
          api.get(`listings/${id}/`),
          token ? api.get('profile/', { headers: { 'Authorization': `Token ${token}` } }).catch(() => null) : null,
          token ? api.get(`favorites/?listing=${id}`, { headers: { 'Authorization': `Token ${token}` } }).catch(() => null) : null
        ]);

        // Обработка данных объявления
        if (!listingResponse.data) {
          throw new Error("Данные объявления не получены");
        }
        setListing(listingResponse.data);

        if (listingResponse.data.images?.[0]?.url) {
          setMainImage(listingResponse.data.images[0].url);
        }

        // Обработка данных пользователя
        if (userResponse?.data) {
          setCurrentUser({ id: userResponse.data.id });
        }

        // Обработка избранного
        if (favoriteResponse && favoriteResponse.data && favoriteResponse.data.length > 0) {
          setIsFavorite(true);
          setFavoriteId(favoriteResponse.data[0].id);
        }

        // Загрузка отзывов
        if (listingResponse.data.user?.id) {
          await fetchReviews(listingResponse.data.user.id);
        }

      } catch (err: unknown) {
        const error = err as ApiError;
        console.error("Ошибка при загрузке данных:", error);
        setError(error.response?.data?.message || "Не удалось загрузить объявление");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Оптимизированная версия fetchReviews
  const fetchReviews = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await api.get(`reviews/`, {
        params: { reviewed: userId },
        headers
      });

      setReviews(response.data || []);
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Ошибка при загрузке отзывов:', err);
      if (err.isAxiosError && err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await api.delete(`reviews/${reviewId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Ошибка при удалении отзыва:', err);
      alert('Не удалось удалить отзыв');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('token');
        if (token) {
          try {
            const userResponse = await api.get('profile/', {
              headers: {
                'Authorization': `Token ${token}`
              }
            });
            setCurrentUser({id: userResponse.data.id});
          } catch (error) {
            console.error('Ошибка при загрузке пользователя:', error);
          }
        }

        const listingResponse = await api.get(`listings/${id}/`);
        setListing(listingResponse.data);

        if (listingResponse.data.images && listingResponse.data.images.length > 0) {
          setMainImage(listingResponse.data.images[0].url);
        }

        if (token) {
          try {
            const favoriteResponse = await api.get(`favorites/?listing=${id}`, {
              headers: {
                'Authorization': `Token ${token}`
              }
            });

            if (favoriteResponse.data.length > 0) {
              setIsFavorite(true);
              setFavoriteId(favoriteResponse.data[0].id);
            }
          } catch (error) {
            console.error('Ошибка при проверке избранного:', error);
          }
        }

        if (listingResponse.data?.user?.id) {
          await fetchReviews(listingResponse.data.user.id);
        }
      } catch (err: unknown) {
        const error = err as ApiError;
        console.error("Ошибка при загрузке объявления:", error);
        setError("Не удалось загрузить объявление");
      }
    };
    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/login');
    return;
  }

  try {
    const numericId = Number(id);

    if (isFavorite && favoriteId) {
      // Удаляем из избранного
      await api.delete(`favorites/${favoriteId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setIsFavorite(false);
      setFavoriteId(null);
    } else {
      // Добавляем в избранное
      const response = await api.post(
        'favorites/',
        { listing_id: numericId },
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setIsFavorite(true);
      setFavoriteId(response.data.id);
    }
  } catch (error: unknown) {
    const err = error as ApiError;
    if (err.isAxiosError) {
      console.error('Ошибка при работе с избранным:', err.response?.data);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    }
    console.error('Ошибка:', err.message || 'Неизвестная ошибка');
  }
};

  const handleSubmitReview = async () => {
    if (!listing || !currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setReviewLoading(true);
      const response = await api.post(
        'reviews/',
        {
          reviewed: listing.user.id,
          rating: newReview.rating,
          comment: newReview.comment,
        },
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setReviews([response.data, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Ошибка при отправке отзыва:', err);
      if (err.isAxiosError) {
        if (err.response?.status === 403) {
          alert('Недостаточно прав для выполнения этого действия');
        } else {
          alert(err.response?.data?.detail || 'Не удалось отправить отзыв');
        }
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!listing || !currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(
        'messages/',
        {
          receiver: listing.user.id,
          content: messageContent
        },
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessages([...messages, response.data]);
      setMessageContent('');
      setIsMessageModalOpen(false);
      alert('Сообщение отправлено!');
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Ошибка при отправке сообщения:', err);
      alert('Не удалось отправить сообщение');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!listing) {
    return <div className="p-4">Объявление не найдено</div>;
  }

  const isOwner = currentUser?.id === listing.user.id;

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
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>

          {!isOwner && (
              <button
                  onClick={toggleFavorite}
                  className={`mb-6 flex items-center ${isFavorite ? 'text-red-600' : 'text-blue-600'} hover:opacity-80 transition`}
              >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill={isFavorite ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            </button>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-2/3">
              <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={listing.title}
                    className="w-full h-96 object-contain"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center text-gray-500">
                    Нет изображения
                  </div>
                )}
              </div>

              {listing.images && listing.images.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {listing.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImage(image.url)}
                      className={`w-16 h-16 rounded border-2 ${mainImage === image.url ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <img
                        src={image.url}
                        alt={`${listing.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-start mt-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-700 text-lg">{listing.address}</span>
              </div>
            </div>

            <div className="md:w-1/3">
              <div className="bg-gray-50 p-4 rounded-lg sticky top-4">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{listing.price} ₽</h2>
                  <p className="text-sm text-gray-500">
                    Размещено: {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-lg mb-3">Продавец</h3>
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                      {listing.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{listing.user.username}</p>
                      {listing.user.phone_number && (
                        <p className="text-sm text-gray-600">{listing.user.phone_number}</p>
                      )}
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="space-y-3">
                      {listing.user.phone_number && (
                        <button
                          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                          onClick={() => window.location.href = `tel:${listing.user.phone_number}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Позвонить продавцу
                        </button>
                      )}

                      <button
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                        onClick={navigateToChat}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Написать продавцу
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-0">
            <h2 className="text-xl font-semibold mb-4">Описание</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
            </div>
          </div>

          {/* Секция отзывов */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Отзывы о продавце</h2>

            {!isOwner && currentUser && (
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="text-lg font-medium mb-4">Оставить отзыв</h3>

                {/* Блок оценки */}
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Ваша оценка</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({...newReview, rating: star})}
                        className={`text-3xl ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Блок комментария */}
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Комментарий</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                    className="border rounded px-3 py-2 w-full h-24"
                    placeholder="Напишите ваш отзыв здесь..."
                  />
                </div>

                {/* Кнопка отправки */}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewLoading || !newReview.comment.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {reviewLoading ? 'Отправка...' : 'Отправить отзыв'}
                </button>
              </div>
            )}

            {/* Список отзывов */}
            {reviews.length === 0 ? (
              <p className="text-gray-500">Пока нет отзывов о продавце</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                          {review.reviewer?.username?.charAt(0).toUpperCase() ?? 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{review.reviewer?.username ?? 'Аноним'}</p>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-xl ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Кнопка удаления для автора отзыва */}
                      {currentUser?.id === review.reviewer.id && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 mt-2 ml-13">{review.comment}</p>
                    <p className="text-sm text-gray-500 mt-2 ml-13">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
}