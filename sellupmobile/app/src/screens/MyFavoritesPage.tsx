import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const API_BASE_URL = 'https://sellup.onrender.com/api/';

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
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.navigate('Login');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}my-favorites/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });

        // Normalize data
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
          navigation.navigate('Login');
        } else {
          setError('Не удалось загрузить избранное. Пожалуйста, попробуйте позже.');
          console.error('Ошибка загрузки избранного:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [navigation]);

  const removeFromFavorites = async (favoriteId: number) => {
    Alert.alert(
      'Удаление из избранного',
      'Вы уверены, что хотите удалить это объявление из избранного?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                navigation.navigate('Login');
                return;
              }

              await axios.delete(`${API_BASE_URL}/favorites/${favoriteId}/`, {
                headers: {
                  'Authorization': `Token ${token}`
                }
              });

              setFavorites(favorites.filter(fav => fav.id !== favoriteId));
            } catch (err) {
              console.error('Ошибка при удалении из избранного:', err);
              setError('Не удалось удалить из избранного');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Дата не указана' : format(date, 'dd MMMM yyyy', { locale: ru });
    } catch {
      return 'Дата не указана';
    }
  };

  const renderFavoriteItem = ({ item }: { item: Favorite }) => (
    <View style={styles.favoriteCard}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.listing.images?.length > 0 ? (
          <Image
            source={{ uri: item.listing.images[0].url }}
            style={styles.listingImage}
            resizeMode="cover"
            onError={() => console.log('Image load error')}
          />
        ) : (
          <View style={styles.noImage}>
            <Text>Нет изображения</Text>
          </View>
        )}
        {/* Price badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.listing.price} ₽</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.favoriteContent}>
        <View style={styles.titleRow}>
          <Text style={styles.favoriteTitle} numberOfLines={1}>{item.listing.title}</Text>
          <TouchableOpacity
            onPress={() => removeFromFavorites(item.id)}
            style={styles.favoriteButton}
          >
            <Icon name="favorite" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.favoriteDescription} numberOfLines={2}>{item.listing.description}</Text>
        
        <Text style={styles.sellerText}>
          Продавец: {item.listing.user?.username || 'Неизвестно'}
        </Text>
        
        <Text style={styles.addressText} numberOfLines={1}>
          {item.listing.address}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.dateText}>
            {formatDate(item.listing.created_at)}
          </Text>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('ListingDetails', { id: item.listing.id.toString() })}
          >
            <Text style={styles.detailsButton}>Подробнее</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SellUp</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="account-circle" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SellUp</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="account-circle" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SellUp</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => {
              // Проверяем, есть ли маршрут "Messages" в типах навигации
              // @ts-ignore - игнорируем ошибку TypeScript, если маршрут не определен
              navigation.navigate('Messages');
            }}
            style={styles.messageButton}
          >
            <Icon name="message" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="account-circle" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        <Text style={styles.pageTitle}>Мои избранные объявления</Text>

        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="favorite-border" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>У вас пока нет избранных объявлений</Text>
            <Text style={styles.emptyText}>Добавляйте понравившиеся объявления в избранное</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                // Проверяем, есть ли маршрут "Home" в типах навигации
                // @ts-ignore - игнорируем ошибку TypeScript, если маршрут не определен
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.emptyButtonText}>Найти объявления</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.favoritesContainer}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButton: {
    marginRight: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  favoriteCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  favoriteContent: {
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  favoriteButton: {
    marginLeft: 10,
  },
  favoriteDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  sellerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  detailsButton: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  favoritesContainer: {
    paddingBottom: 20,
  },
  errorContainer: {
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
});

export default MyFavoritesPage;