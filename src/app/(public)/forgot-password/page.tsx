import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: "Forgot password",
  description:
    "Reset your password for CRMC AIMS — Cebu Roosevelt Memorial Colleges Asset & Inventory Management System.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
