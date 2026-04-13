import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const invite = await prisma.invitation.findUnique({
        where: { token },
        include: { wedding: true }
    });

    if (!invite || invite.accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Code</h1>
                    <p className="text-gray-600 mb-6">This invitation link is invalid or has expired.</p>
                    <Link href="/" className="text-primary hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }

    const session = await auth();
    const currentUserEmail = session?.user?.email;
    const isEmailMismatch = session?.user && (currentUserEmail !== invite.email);

    // Action to accept if already logged in matches invite email
    async function acceptInviteAndRedirect() {
        "use server";
        if (!session?.user?.id) throw new Error("Not authenticated");
        const userId = session.user.id;

        try {
            // Use transaction to accept invite
            await prisma.$transaction(async (tx: any) => {
                const currentInvite = await tx.invitation.findUnique({ where: { token } });
                if (!currentInvite || currentInvite.accepted) {
                    throw new Error("Invalid or expired invitation");
                }
                
                // Add collaborator
                await tx.collaborator.create({
                    data: {
                        userId,
                        weddingId: currentInvite.weddingId,
                        role: currentInvite.role,
                    }
                });

                // Update invite status
                await tx.invitation.update({
                    where: { token },
                    data: { accepted: true }
                });
            });
        } catch (error: any) {
            const errorMessage = error?.message || "Failed to accept invitation";
            redirect(`/dashboard?error=${encodeURIComponent(errorMessage)}`);
            return;
        }

        redirect('/dashboard');
    }

    const weddingName = `${invite.wedding?.coupleName1} & ${invite.wedding?.coupleName2}'s Wedding`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-primary">
                    💌
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
                <p className="text-gray-600 mb-6">
                    You have been invited to collaborate on<br />
                    <span className="font-semibold text-gray-900">{weddingName}</span>
                </p>

                {session ? (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-sm mb-4 ${isEmailMismatch ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50'}`}>
                            {isEmailMismatch ? (
                                <>
                                    <strong>Warning:</strong> You are logged in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invite.email}</strong>.
                                    <div className="mt-2 text-xs">Please log out to accept this invitation.</div>
                                </>
                            ) : (
                                <>You are logged in as <strong>{currentUserEmail}</strong></>
                            )}
                        </div>

                        {!isEmailMismatch ? (
                            <form action={acceptInviteAndRedirect}>
                                <button className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg">
                                    Accept & Join Dashboard
                                </button>
                            </form>
                        ) : (
                            <Link href="/login" className="block w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-all">
                                Log Out & Switch Account
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Link
                            href={`/login?invite_token=${token}`}
                            className="block w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg"
                        >
                            Log In to Join
                        </Link>
                        <Link
                            href={`/login?invite_token=${token}&signup=true`}
                            className="block w-full py-3 bg-white border-2 border-primary/20 text-primary font-medium rounded-xl hover:bg-primary/5 transition-all"
                        >
                            Create Account
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
