import { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign In | AIMS',
  description: 'Sign in to the Asset & Inventory Management System',
};

export default function SignInPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
