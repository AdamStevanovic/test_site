export const metadata = {
  title: "Papagaj glas — demo",
  description: "Upload ili snimi glas -> obrada u privatnom HF Space-u -> papagaj verzija.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
