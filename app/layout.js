import './globals.css';

export const metadata = {
  title: 'Registro del almacén',
  description: 'Registro diario de ventas del almacén',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
