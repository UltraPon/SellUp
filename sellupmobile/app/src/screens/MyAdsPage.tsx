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

interface Listing {
  id: number;
  title: string;
  price: number;
  description: string;
  created_at: string;
  images: { url: string }[];
  user: number;
}

const MyAdsPage = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.navigate('Login');
          return;
        }

        // Get current user
        const userResponse = await axios.get(`${API_BASE_URL}profile/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        setCurrentUser(userResponse.data.id);

        // Get listings
        const listingsResponse = await axios.get(`${API_BASE_URL}my-listings/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });

        setListings(listingsResponse.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigation.navigate('Login');
        } else {
          setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
          console.error('Ошибка загрузки:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigation]);

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Подтверждение',
      'Вы уверены, что хотите удалить это объявление?',
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

              await axios.delete(`${API_BASE_URL}listings/${id}/`, {
                headers: {
                  'Authorization': `Token ${token}`
                }
              });

              // Update list after deletion
              setListings(listings.filter(listing => listing.id !== id));
            } catch (err) {
              console.error('Ошибка при удалении:', err);
              setError('Не удалось удалить объявление');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const renderListingItem = ({ item }: { item: Listing }) => (
    <View style={styles.listingCard}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.images?.length > 0 ? (
          <Image
            source={{ uri: item.images[0].url }}
            style={styles.listingImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Text>Нет изображения</Text>
          </View>
        )}
        {/* Price badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.price} ₽</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.listingContent}>
        <View style={styles.titleRow}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={styles.listingDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.footerRow}>
          <Text style={styles.dateText}>
            {format(new Date(item.created_at), 'dd MMMM yyyy', { locale: ru })}
          </Text>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ListingDetails', { id: item.id.toString() })}
            >
              <Text style={styles.viewButton}>Просмотр</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteButton}>Удалить</Text>
            </TouchableOpacity>
          </View>
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
            onPress={() => navigation.navigate('MessagePage', {})}
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
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Мои объявления</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateAdPage')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Создать новое</Text>
          </TouchableOpacity>
        </View>

        {listings.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="info-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>У вас пока нет объявлений</Text>
            <Text style={styles.emptyText}>Начните продавать - создайте свое первое объявление</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateAdPage')}
            >
              <Text style={styles.emptyButtonText}>Создать объявление</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listings}
            renderItem={renderListingItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={1}
            scrollEnabled={false}
            contentContainerStyle={styles.listingsContainer}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 5,
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
  listingsContainer: {
    paddingBottom: 20,
  },
  listingCard: {
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
    top: 10,
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
  listingContent: {
    padding: 15,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  listingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  viewButton: {
    color: '#3b82f6',
    fontWeight: '500',
    marginRight: 15,
  },
  deleteButton: {
    color: '#ef4444',
    fontWeight: '500',
  },
  errorContainer: {
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
});

export default MyAdsPage;