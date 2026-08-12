/**
 * Landing route for the application.
 *
 * This page deliberately redirects users to the login route so the app begins in
 * a single, predictable state. It keeps the root route simple and lets the
 * auth gate and login screens handle user flow and access control.
 */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
