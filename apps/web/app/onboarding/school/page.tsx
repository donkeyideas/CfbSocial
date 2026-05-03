import { Suspense } from 'react';
import { SchoolPicker } from './SchoolPicker';

export const metadata = {
  title: 'Pick Your School',
  description: 'Choose your college football school to complete your CFB Social profile.',
};

export default function SchoolOnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold text-ink">CFB Social</h1>
          <hr className="gridiron-divider mx-auto mt-3 w-24" />
        </div>

        <div className="gridiron-card p-8">
          <Suspense>
            <SchoolPicker />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
