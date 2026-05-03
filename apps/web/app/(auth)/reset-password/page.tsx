import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your CFB Social account.',
  alternates: {
    canonical: 'https://www.cfbsocial.com/reset-password',
  },
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
