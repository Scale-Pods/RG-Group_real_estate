import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "RG Group Dubai | AI Automation",
    description: "AI-Powered Marketing & Operations managed by ScalePods",
    icons: {
        icon: '/RG-Group-Logo.png',
        shortcut: '/RG-Group-Logo.png',
        apple: '/RG-Group-Logo.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="antialiased dark">
            <body>{children}</body>
        </html>
    );
}
