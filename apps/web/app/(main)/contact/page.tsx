import { ContactForm } from './ContactForm';

export const metadata = {
  title: 'Contact Us | CFB Social',
  description: 'Get in touch with The Gridiron. Report bugs, request features, ask questions, or explore partnership opportunities.',
  openGraph: {
    title: 'Contact Us | CFB Social',
    description: 'Get in touch with The Gridiron. Report bugs, request features, ask questions, or explore partnership opportunities.',
  },
};

export default function ContactPage() {
  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Contact Us</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Have a question, found a bug, or want to partner with The Gridiron? Drop us a line.
        </p>
      </div>

      <ContactForm />
    </div>
  );
}
