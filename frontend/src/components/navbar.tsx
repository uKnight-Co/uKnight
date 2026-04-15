"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Navbar() {
    const { user, signOut } = useAuth()
    return (
        <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 w-full items-center px-4 md:px-8">
                <div className="mr-4 flex">
                    <Link className="mr-6 flex items-center gap-1 group" href="/">
                        <Image
                            src="/uKnight_Icon.png"
                            alt="uKnight Logo"
                            width={36}
                            height={36}
                            priority
                            className="h-[36px] w-[36px] object-contain transform transition-transform group-hover:scale-105"
                        />
                        <Image
                            src="/UKnightText.png"
                            alt="uKnight Text"
                            width={80}
                            height={22}
                            loading="eager"
                            className="block h-[22px] object-contain pb-0.5 transform transition-transform group-hover:scale-105 group-hover:-rotate-1"
                            style={{ width: 'auto' }}
                        />
                    </Link>
                </div>
                <div id="navbar-center-portal" className="flex flex-1 justify-center px-2 min-w-0 overflow-hidden" />
                <nav className="ml-auto flex items-center space-x-4">
                    <Link href="https://forms.gle/frnfixAqKsSA8T6fA" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="hidden sm:flex border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
                            Provide Feedback
                        </Button>
                    </Link>
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                        <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    Log in
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm">Get Started</Button>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
