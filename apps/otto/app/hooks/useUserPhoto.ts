import { useState, useEffect } from 'react';

type UseUserPhotoResult = {
  photoUrl: string | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Hook to fetch user profile photo from Microsoft Graph API
 * Uses the MSAL account to get an access token and fetch the photo
 */
export const useUserPhoto = (instance: any, account: any, isAuthenticated: boolean): UseUserPhotoResult => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !instance || !account) {
      return;
    }

    const fetchPhoto = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get access token for Microsoft Graph
        const response = await instance.acquireTokenSilent({
          scopes: ['User.Read'],
          account: account,
        });

        // Fetch the photo from Microsoft Graph
        const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photos/96x96/$value', {
          headers: {
            Authorization: `Bearer ${response.accessToken}`,
          },
        });

        if (photoResponse.ok) {
          const contentType = photoResponse.headers.get('content-type');

          // Check if response is an image or JSON error
          if (contentType?.startsWith('image/')) {
            const blob = await photoResponse.blob();
            const url = URL.createObjectURL(blob);
            setPhotoUrl(url);
          } else {
            // Graph API returned JSON error (e.g., ImageNotFound)
            const errorData = await photoResponse.json();
            console.log('User profile photo not available:', errorData.error?.code);
            setPhotoUrl(null);
          }
        } else if (photoResponse.status === 404) {
          // User doesn't have a profile photo
          setPhotoUrl(null);
        } else {
          throw new Error(`Failed to fetch photo: ${photoResponse.status}`);
        }
      } catch (err) {
        console.error('Error fetching user photo:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setPhotoUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();

    // Cleanup function to revoke object URL
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [isAuthenticated, instance, account, photoUrl]);

  return { photoUrl, isLoading, error };
};
