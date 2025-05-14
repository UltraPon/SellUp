import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './navigation';

// Импортируем каждый компонент отдельно
import Login from '../screens/Login';
import Register from '../screens/Register';
import CheckEmail from '../screens/CheckEmail';
import ForgotPasswordPage from '../screens/ForgotPasswordPage';
import ResetPasswordPage from '../screens/ResetPasswordPage';
import Listing from '../screens/Listing';
import ListingDetails from '../screens/ListingDetails';
import CreateAdPage from '../screens/CreateAdPage';
import MyAdsPage from '../screens/MyAdsPage';
import MyFavoritesPage from '../screens/MyFavoritesPage';
import Profile from '../screens/Profile';
import MessagePage from '../screens/MessagePage';

const Stack = createStackNavigator<RootStackParamList>();

export const MainNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        animationTypeForReplace: 'push'
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={Login}
      />
      <Stack.Screen 
        name="Register" 
        component={Register} 
      />
      <Stack.Screen 
        name="CheckEmail" 
        component={CheckEmail} 
      />
      <Stack.Screen 
        name="ForgotPasswordPage" 
        component={ForgotPasswordPage} 
      />
      <Stack.Screen 
        name="ResetPasswordPage" 
        component={ResetPasswordPage} 
      />
      <Stack.Screen 
        name="Listing" 
        component={Listing} 
      />
      <Stack.Screen 
        name="ListingDetails" 
        component={ListingDetails} 
      />
      <Stack.Screen 
        name="CreateAdPage" 
        component={CreateAdPage} 
      />
      <Stack.Screen 
        name="MyAdsPage" 
        component={MyAdsPage} 
      />
      <Stack.Screen 
        name="MyFavoritesPage" 
        component={MyFavoritesPage} 
      />
      <Stack.Screen 
        name="Profile" 
        component={Profile} 
      />
      <Stack.Screen 
        name="MessagePage" 
        component={MessagePage} 
      />
    </Stack.Navigator>
  );
};