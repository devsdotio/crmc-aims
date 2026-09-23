import { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to CRMC AIMS — the Asset & Inventory Management System for Cebu Roosevelt Memorial Colleges.",
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
