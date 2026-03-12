export function Footer() {
    return (
        <footer className="border-t bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 py-12 md:px-8">
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 justify-items-center text-center sm:text-left sm:justify-items-start lg:justify-items-center">
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold">uKnight</h4>
                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto sm:mx-0">
                            Restoring the spontaneity of university life. Verified peers. No bots.
                        </p>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold">Company</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="/about" className="hover:text-foreground">About Us</a></li>
                            <li><a href="/careers" className="hover:text-foreground">Careers</a></li>
                            <li><a href="/contact" className="hover:text-foreground">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="/legal/privacy" className="hover:text-foreground">Privacy Policy</a></li>
                            <li><a href="/legal/terms" className="hover:text-foreground">Terms of Service</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold">Connect</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="https://github.com/uKnight-Co/uKnight" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} uKnight. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
