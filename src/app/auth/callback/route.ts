import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    console.log('🔍 Callback Params:', Object.fromEntries(searchParams.entries()))

    // Handle OAuth errors
    if (error) {
        console.error('❌ OAuth Error:', error_description)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
    }

    // Exchange code for session
    if (code) {
        const supabase = await createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
            console.error('❌ Session Exchange Error:', exchangeError.message)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
        }

        console.log('✅ OAuth successful - redirecting to dashboard')
        // Always redirect to dashboard after successful OAuth
        return NextResponse.redirect(`${origin}/dashboard`)
    }

    // No code - redirect to login
    console.log('⚠️ No code found in callback - redirecting to login')
    return NextResponse.redirect(`${origin}/login`)
}
