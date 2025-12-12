export type WeddingRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
    user_id: string;
    wedding_id: string;
    role: WeddingRole;
    joined_at: string;
    profiles?: {
        email: string;
        full_name: string;
        avatar_url: string;
    }
}

export interface Invitation {
    id: string;
    wedding_id: string;
    email: string;
    token: string;
    role: WeddingRole;
    status: 'pending' | 'accepted';
    created_at: string;
    expires_at: string;
}
