# Azure Entra ID (Azure AD) Authentication Setup

This application uses MSAL (Microsoft Authentication Library) for Azure Entra ID authentication.

## Prerequisites

1. An Azure subscription
2. Access to Azure Entra ID (formerly Azure Active Directory)
3. Permission to create app registrations in Entra ID

## Azure Entra ID Configuration

### 1. Create an App Registration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Entra ID** (or **Azure Active Directory**)
3. Click on **App registrations** in the left menu
4. Click **New registration**
5. Fill in the application details:
   - **Name**: Your application name (e.g., "Otto - Logic Apps UX")
   - **Supported account types**: Choose the appropriate option (typically "Accounts in this organizational directory only")
   - **Redirect URI**: Select "Single-page application (SPA)" and enter:
     - For local development: `http://localhost:4201`
     - For production: Your production URL
6. Click **Register**

### 2. Configure Authentication

After creating the app registration:

1. Go to **Authentication** in the left menu
2. Under **Platform configurations**, ensure your redirect URIs are listed
3. Under **Implicit grant and hybrid flows**, ensure both checkboxes are **unchecked** (MSAL uses PKCE flow)
4. Under **Allow public client flows**, set to **No**
5. Click **Save**

### 3. Configure API Permissions

1. Go to **API permissions** in the left menu
2. You should see `User.Read` permission already added (Microsoft Graph API)
3. If not, click **Add a permission**:
   - Select **Microsoft Graph**
   - Select **Delegated permissions**
   - Find and select **User.Read**
   - Click **Add permissions**
4. Click **Grant admin consent** if required by your organization

### 4. Get Your Configuration Values

1. Go to **Overview** in the left menu
2. Copy the following values:
   - **Application (client) ID** - This is your `VITE_ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** - This is your `VITE_ENTRA_TENANT_ID`

## Application Configuration

### 1. Set Up Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your values:
   ```env
   VITE_ENTRA_CLIENT_ID=your-client-id-here
   VITE_ENTRA_TENANT_ID=your-tenant-id-here
   VITE_ENTRA_REDIRECT_URI=http://localhost:4201
   ```

### 2. Start the Development Server

```bash
pnpm run dev
```

The application will now require authentication. When you visit the app:

1. You'll be redirected to the Microsoft login page
2. Sign in with your organizational account
3. Grant consent to the requested permissions (if prompted)
4. You'll be redirected back to the application

## How It Works

### Authentication Flow

1. **App Loads**: The `AuthProvider` component initializes MSAL
2. **Check Authentication**: The `RequireAuth` component checks if the user is authenticated
3. **Redirect to Login**: If not authenticated, redirects to Microsoft login page
4. **User Signs In**: User enters credentials on Microsoft's login page
5. **Redirect Back**: After successful login, user is redirected back to the app
6. **Set Active Account**: MSAL sets the active account and stores tokens
7. **App Renders**: The protected content is now displayed

### Key Components

- **`app/env.ts`**: Environment variable validation using t3-env and Zod
- **`app/auth/msalConfig.ts`**: MSAL configuration and login scopes
- **`app/auth/AuthProvider.tsx`**:
  - `AuthProvider`: Wraps the app with MSAL context
  - `RequireAuth`: Enforces authentication on protected routes
  - `useAuth`: Custom hook to access auth state and methods
- **`app/components/UserProfile.tsx`**: Example component showing user info and logout

### Using Authentication in Your Components

```tsx
import { useAuth } from "../auth/AuthProvider";

export function MyComponent() {
  const { isAuthenticated, account, logout } = useAuth();

  return (
    <div>
      {isAuthenticated && (
        <>
          <p>Welcome, {account?.name}!</p>
          <button onClick={logout}>Sign Out</button>
        </>
      )}
    </div>
  );
}
```

### Getting an Access Token

To call Microsoft Graph API or other protected APIs:

```tsx
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";

export function useAccessToken() {
  const { instance, accounts } = useMsal();

  const getToken = async () => {
    const request = {
      ...loginRequest,
      account: accounts[0],
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      // If silent acquisition fails, try interactive
      const response = await instance.acquireTokenPopup(request);
      return response.accessToken;
    }
  };

  return { getToken };
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your redirect URI is configured correctly in Azure
2. **Invalid Client Error**: Check that your Client ID is correct
3. **Redirect Loop**: Clear your browser cache and localStorage
4. **Environment Variables Not Loading**:
   - Ensure variable names start with `VITE_`
   - Restart the dev server after changing `.env`
   - Check that `.env` is in the correct directory

### Testing Different Accounts

To test with different accounts:
1. Open the app in incognito/private mode
2. Or clear localStorage and refresh the page
3. Or use the logout button and sign in with a different account

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different app registrations** for development and production
3. **Regularly rotate** client secrets if you use them
4. **Enable Conditional Access** policies in Azure AD for additional security
5. **Monitor sign-in logs** in Azure Portal for suspicious activity

## Additional Resources

- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [t3-env Documentation](https://env.t3.gg/)
