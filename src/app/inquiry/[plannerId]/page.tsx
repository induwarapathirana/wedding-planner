import { getPlannerDetails } from "./actions";
import { InquiryFormClient } from "./InquiryFormClient";

export default async function InquiryPage({ params }: { params: Promise<{ plannerId: string }> }) {
    const { plannerId } = await params;
    const planner = await getPlannerDetails(plannerId);

    // Use company_name from planner settings, fallback to full_name or generic name
    const businessName = planner?.company_name || planner?.full_name || "Wedding Planner";
    const logoUrl = planner?.logo_url || null;

    return (
        <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
            <div className="max-w-xl w-full">
                {/* Header */}
                <div className="text-center mb-10 space-y-4">
                    {logoUrl && (
                        <img
                            src={(() => {
                                const driveMatch = logoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                if (driveMatch && driveMatch[1]) {
                                    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                                }
                                return logoUrl;
                            })()}
                            alt="Logo"
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-full mx-auto object-cover shadow-md"
                        />
                    )}
                    <h1 className="text-4xl font-serif font-bold text-gray-900">{businessName}</h1>
                    <p className="text-gray-500 text-lg">Inquiry Form</p>
                </div>

                {/* Form Card */}
                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
                    <InquiryFormClient plannerId={plannerId} />
                </div>

                <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                    Powered by Vow & Venue
                </div>
            </div>
        </div>
    );
}
