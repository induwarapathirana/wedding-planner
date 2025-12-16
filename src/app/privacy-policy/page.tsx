import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto prose prose-stone">
                <div className="mb-8">
                    <Link href="/" className="text-primary hover:text-primary/80 font-medium">← Back to Home</Link>
                </div>

                <h1 className="text-4xl font-bold font-serif text-gray-900 mb-8">Privacy Policy</h1>
                <p className="text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Introduction</h2>
                    <p>
                        Welcome to Vow & Venue ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our website and in using our services. This privacy policy outlines our practices regarding data collection and usage.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Information We Collect</h2>
                    <p>We collect information you provide directly to us when you create an account, plan a wedding, or contact us.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Personal Information:</strong> Name, email address, phone number.</li>
                        <li><strong>Wedding Details:</strong> Wedding date, partner's name, budget, guest lists, and itinerary events.</li>
                        <li><strong>Vendor Information:</strong> Contacts and contracts you upload.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">3. How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Process your wedding planning data to generate insights (e.g., budget tracking).</li>
                        <li>Send you technical notices, updates, security alerts, and support messages.</li>
                        <li>Respond to your comments, questions, and requests.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Data Sharing and Disclosure</h2>
                    <p>
                        We do not sell your personal data to third parties. We may share information as follows:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Service Providers:</strong> We may share data with third-party vendors (e.g., payment processors like PayHere) who need access to perform services for us.</li>
                        <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Data Security</h2>
                    <p>
                        We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Your Rights</h2>
                    <p>
                        You have the right to access, correct, or delete your personal information. You may do this by logging into your account settings or contacting us directly.
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at support@vowandvenue.com.
                    </p>
                </section>

                <div className="border-t pt-8">
                    <p className="text-sm text-gray-500">By using our services, you agree to the terms of this Privacy Policy.</p>
                </div>
            </div>
        </div>
    );
}
