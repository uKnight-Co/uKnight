"use client"

export default function PrivacyPage() {
    return (
        <div className="flex min-h-screen flex-col pt-20">
            <main className="container flex-1 px-4 py-20 md:px-8">
                <article className="prose prose-invert mx-auto max-w-3xl">
                    <h1>Privacy Policy</h1>
                    <p className="lead">Last updated: February 10, 2026</p>

                    <h2>1. Introduction</h2>
                    <p>uKnight (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) values your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.</p>

                    <h2>2. Data We Collect</h2>
                    <ul>
                        <li><strong>Authentication Data:</strong> Google Account information (Name, Email, Photo) used for sign-in.</li>
                        <li><strong>Verification Data:</strong> .edu email addresses to verify student status.</li>
                        <li><strong>Usage Data:</strong> Anonymous statistics about platform usage (e.g., number of matches).</li>
                    </ul>

                    <h2>3. No Recording</h2>
                    <p>We do not record your video or audio calls. Connections are established peer-to-peer whenever possible. Signalling data is transient and not stored.</p>

                    <h2>4. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at privacy@uknight.edu.</p>
                </article>
            </main>
        </div>
    )
}
