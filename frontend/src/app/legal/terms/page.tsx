"use client"

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col pt-20">
            <main className="container flex-1 px-4 py-20 md:px-8">
                <article className="prose prose-invert mx-auto max-w-3xl">
                    <h1>Terms of Service</h1>
                    <p className="lead">Last updated: February 10, 2026</p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing uKnight, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

                    <h2>2. Eligibility</h2>
                    <p>You must be a verified university student with a valid .edu email address to use uKnight.</p>

                    <h2>3. Code of Conduct</h2>
                    <p>You agree to treat all users with respect. Harassment, hate speech, nudity, and illegal activities are strictly prohibited and will result in an immediate ban.</p>

                    <h2>4. Disclaimer</h2>
                    <p>uKnight is provided &quot;as is&quot; without warranties of any kind. We are not responsible for the actions of users on the platform.</p>
                </article>
            </main>
        </div>
    )
}
