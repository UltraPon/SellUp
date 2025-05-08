import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  CheckEmail: undefined;
  ForgotPasswordPage: undefined;
  ResetPasswordPage: { token: string };
  Listing: undefined;
  ListingDetails: { id: string };
  CreateAdPage: undefined;
  MyAdsPage: undefined;
  MyFavoritesPage: undefined;
  Profile: undefined;
  MessagePage: { userId?: string };
};

export type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList>;