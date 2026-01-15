import { getInvitationData } from "./actions";
import InvitationClient from "./InvitationClientComponent";
import { X } from "lucide-react";

export default async function InvitationPage({ params }: { params: Promise<{ guestId: string }> }) {
    const { guestId } = await params;
    const data = await getInvitationData(guestId);

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
                    <p className="text-gray-500">
                        We couldn't find your invitation. The link might be incorrect or expired.
                    </p>
                </div>
            </div>
        );
    }

    return <InvitationClient data={data} />;
}
