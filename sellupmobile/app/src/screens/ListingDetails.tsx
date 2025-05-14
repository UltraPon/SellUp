import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added import for AsyncStorage
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StarRating from 'react-native-star-rating-widget';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const API_BASE_URL = 'https://sellup.onrender.com/api/';

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

interface Favorite {
  id: number;
  listing: number;
}

const ListingDetails = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { id } = route.params as { id: string };
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{id: number} | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');

  const fetchReviews = async (userId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.get(
        `${API_BASE_URL}reviews/`,
        {
          params: { reviewed: userId },
          headers: headers
        }
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        navigation.navigate('Login');
      }
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}reviews/${reviewId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('Ошибка при удалении отзыва:', error);
      Alert.alert('Ошибка', 'Не удалось удалить отзыв');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const userResponse = await axios.get(`${API_BASE_URL}profile/`, {
              headers: {
                'Authorization': `Token ${token}`
              }
            });
            setCurrentUser({id: userResponse.data.id});
          } catch (error) {
            console.error('Ошибка при загрузке пользователя:', error);
          }
        }

        const listingResponse = await axios.get(`${API_BASE_URL}listings/${id}/`);
        setListing(listingResponse.data);

        if (listingResponse.data.images && listingResponse.data.images.length > 0) {
          setMainImage(listingResponse.data.images[0].url);
        }

        if (token) {
          try {
            const favoriteResponse = await axios.get(`${API_BASE_URL}favorites/?listing=${id}`, {
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
      } catch (err) {
        console.error("Ошибка при загрузке объявления:", err);
        setError("Не удалось загрузить объявление");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    try {
      const numericId = Number(id);

      if (isFavorite && favoriteId) {
        await axios.delete(`${API_BASE_URL}favorites/${favoriteId}/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const response = await axios.post(
          `${API_BASE_URL}favorites/`,
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
      if (axios.isAxiosError(error)) {
        console.error('Ошибка при работе с избранным:', error.response?.data);
        if (error.response?.status === 401 || error.response?.status === 403) {
          AsyncStorage.removeItem('token');
          navigation.navigate('Login');
        } else {
          Alert.alert('Ошибка', 'Произошла ошибка. Пожалуйста, попробуйте позже.');
        }
      } else if (error instanceof Error) {
        console.error('Неожиданная ошибка:', error.message);
      } else {
        console.error('Неизвестная ошибка:', error);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!listing || !currentUser) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    try {
      setReviewLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}reviews/`,
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
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          Alert.alert('Ошибка', 'Недостаточно прав для выполнения этого действия');
        } else {
          Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось отправить отзыв');
        }
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!listing || !currentUser) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}messages/`,
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

      setMessageContent('');
      setIsMessageModalOpen(false);
      Alert.alert('Успех', 'Сообщение отправлено!');
      // Changed 'Messages' to 'MessagePage' to match the route name in RootStackParamList
      navigation.navigate('MessagePage', { userId: String(listing.user.id) });
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.container}>
        <Text>Объявление не найдено</Text>
      </View>
    );
  }

  const isOwner = currentUser?.id === listing.user.id;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SellUp</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-circle" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{listing.title}</Text>

        {!isOwner && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={toggleFavorite}
          >
            <Icon 
              name={isFavorite ? "favorite" : "favorite-border"} 
              size={20} 
              color={isFavorite ? "#ef4444" : "#3b82f6"} 
            />
            <Text style={[styles.favoriteText, { color: isFavorite ? "#ef4444" : "#3b82f6" }]}>
              {isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Main Image */}
        <View style={styles.mainImageContainer}>
          {mainImage ? (
            <Image 
              source={{ uri: mainImage }} 
              style={styles.mainImage} 
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Text>Нет изображения</Text>
            </View>
          )}
        </View>

        {/* Thumbnail Images */}
        {listing.images && listing.images.length > 1 && (
          <ScrollView horizontal style={styles.thumbnailContainer}>
            {listing.images.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setMainImage(image.url)}
                style={[
                  styles.thumbnail,
                  mainImage === image.url && styles.selectedThumbnail
                ]}
              >
                <Image 
                  source={{ uri: image.url }} 
                  style={styles.thumbnailImage} 
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Address */}
        <View style={styles.addressContainer}>
          <Icon name="location-on" size={20} color="#6b7280" />
          <Text style={styles.addressText}>{listing.address}</Text>
        </View>

        {/* Price and Seller Info */}
        <View style={styles.priceSellerContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{listing.price} ₽</Text>
            <Text style={styles.dateText}>
              Размещено: {format(new Date(listing.created_at), 'dd MMMM yyyy', { locale: ru })}
            </Text>
          </View>

          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Продавец</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.avatarText}>
                  {listing.user.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.sellerName}>{listing.user.username}</Text>
                {listing.user.phone_number && (
                  <Text style={styles.sellerPhone}>{listing.user.phone_number}</Text>
                )}
              </View>
            </View>

            {!isOwner && (
              <View style={styles.sellerButtons}>
                {listing.user.phone_number && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                    onPress={() => Linking.openURL(`tel:${listing.user.phone_number}`)}
                  >
                    <Icon name="call" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Позвонить продавцу</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                  onPress={() => setIsMessageModalOpen(true)}
                >
                  <Icon name="message" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Написать продавцу</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.descriptionText}>{listing.description}</Text>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Отзывы о продавце</Text>

          {!isOwner && currentUser && (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Оставить отзыв</Text>
              
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Ваша оценка</Text>
                <StarRating
                  rating={newReview.rating}
                  onChange={(rating) => setNewReview({...newReview, rating})}
                  starSize={30}
                  color="#f59e0b"
                />
              </View>

              <View style={styles.commentContainer}>
                <Text style={styles.ratingLabel}>Комментарий</Text>
                <TextInput
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview({...newReview, comment: text})}
                  style={styles.commentInput}
                  placeholder="Напишите ваш отзыв здесь..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!newReview.comment.trim() || reviewLoading) && styles.disabledButton]}
                onPress={handleSubmitReview}
                disabled={reviewLoading || !newReview.comment.trim()}
              >
                <Text style={styles.submitButtonText}>
                  {reviewLoading ? 'Отправка...' : 'Отправить отзыв'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>Пока нет отзывов о продавце</Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.avatarText}>
                          {review.reviewer?.username?.charAt(0).toUpperCase() ?? 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>
                          {review.reviewer?.username ?? 'Аноним'}
                        </Text>
                        <StarRating
                          rating={review.rating}
                          onChange={() => {}}
                          starSize={20}
                          color="#f59e0b"
                          enableHalfStar={false}
                          enableSwiping={false}
                        />
                      </View>
                    </View>

                    {currentUser?.id === review.reviewer.id && (
                      <TouchableOpacity onPress={() => handleDeleteReview(review.id)}>
                        <Icon name="delete" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>
                    {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: ru })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Message Modal */}
      <Modal
        visible={isMessageModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMessageModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Написать продавцу</Text>
            <TextInput
              value={messageContent}
              onChangeText={setMessageContent}
              style={styles.messageInput}
              placeholder="Введите ваше сообщение..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsMessageModalOpen(false)}
              >
                <Text style={styles.modalButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendMessage}
              >
                <Text style={styles.modalButtonText}>Отправить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  content: {
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  favoriteText: {
    marginLeft: 5,
  },
  mainImageContainer: {
    height: 300,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    marginBottom: 20,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 20,
  },
  addressText: {
    marginLeft: 5,
    color: '#6b7280',
    fontSize: 16,
  },
  priceSellerContainer: {
    marginBottom: 20,
  },
  priceContainer: {
    marginBottom: 15,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sellerContainer: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#1e40af',
    fontWeight: 'bold',
    fontSize: 18,
  },
  sellerName: {
    fontWeight: '500',
  },
  sellerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  sellerButtons: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },
  descriptionText: {
    color: '#4b5563',
    lineHeight: 22,
  },
  reviewForm: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  reviewFormTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  ratingContainer: {
    marginBottom: 15,
  },
  ratingLabel: {
    marginBottom: 5,
    color: '#4b5563',
  },
  commentContainer: {
    marginBottom: 15,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  noReviewsText: {
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 20,
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 15,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerName: {
    fontWeight: '500',
  },
  reviewComment: {
    color: '#4b5563',
    marginLeft: 50,
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 50,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default ListingDetails;