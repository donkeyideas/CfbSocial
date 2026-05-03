import { Suspense } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = {
  title: 'Reset Your Password',
  description: 'Reset your CFB Social password. Enter your email and we will send you a link to create a new password.',
  alternates: {
    canonical: 'https://www.cfbsocial.com/forgot-password',
  },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
