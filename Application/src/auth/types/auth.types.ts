import { UserRole } from '../../shared/constants/roles';

export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  Login: { role?: UserRole } | undefined;
  OtpVerification: { phoneNumber: string; role?: UserRole };
  CitizenRegister: { phoneNumber: string };
};
