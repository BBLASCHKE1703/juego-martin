export const metadata = { title: "Caos Martín - GP Tracker" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Ubuntu", background:"#0e1020", color:"#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
