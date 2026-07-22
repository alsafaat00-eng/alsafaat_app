import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Legacy route — redirects to subscription hub (fees page hidden from users). */
export default function FeesScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/subscription' as never);
  }, [router]);

  return null;
}
