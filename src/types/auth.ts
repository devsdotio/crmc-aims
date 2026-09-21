export interface SignInFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface AuthFormState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export interface AuthErrorResponse {
  code: string;
  message: string;
}

export type ForgotPasswordStep = 'request' | 'confirmation';
