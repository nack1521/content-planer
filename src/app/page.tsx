import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function RootPage() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('content_planner_locale')?.value;
  const targetLocale = savedLocale === 'en' ? 'en' : 'th';

  redirect(`/${targetLocale}/planner`);
}
