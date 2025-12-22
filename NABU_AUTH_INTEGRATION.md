# Nabu Landing Page - Authentication Integration

## Summary

Successfully integrated Kinde authentication into the Nabu landing page header to match the default landing page behavior. The header now dynamically shows different CTAs based on the user's authentication state.

## Changes Made

### 1. New Components Created

#### `components/nabu/nabu-header.tsx`
A client-side component that handles the Nabu header with authentication awareness:
- **Client Component**: Uses `"use client"` directive for Kinde hooks
- **Authentication Detection**: Uses `useKindeAuth()` hook
- **Dynamic Buttons**: Shows different CTAs based on auth state
- **Role-Based Routing**: Admins go to `/admin`, users go to `/dashboard`
- **Loading States**: Shows skeleton loaders while checking auth status

#### `components/nabu/nabu-mobile-nav.tsx`
A mobile hamburger menu for Nabu with authentication:
- **Responsive**: Only visible on mobile devices (< md breakpoint)
- **Overlay Menu**: Full-screen dark overlay matching Nabu theme
- **Auth-Aware Links**: Different menu items based on auth state
- **Smooth Transitions**: Prevents body scroll when open

### 2. Updated Files

#### `app/nabu/page.tsx`
- Imported new header components
- Replaced static header with dynamic `<NabuHeader />`
- Added `<NabuMobileNav />` for mobile navigation
- Kept all other sections unchanged

## Authentication States

### Not Authenticated (Default)
**Desktop Header:**
- "Live demo" button (outline style)
- "Start free" button (primary mint) → Opens Kinde login

**Mobile Menu:**
- Features, How it works, Pricing, FAQ links
- Live demo link
- "Start free" link → Opens Kinde login

### Authenticated (Regular User)
**Desktop Header:**
- "Live demo" button (outline style)
- "Dashboard" button (primary mint) → `/dashboard`

**Mobile Menu:**
- Features, How it works, Pricing, FAQ links
- Live demo link
- Dashboard link

### Authenticated (Admin User)
**Desktop Header:**
- "Live demo" button (outline style)
- "Dashboard" button (primary mint) → `/admin`

**Mobile Menu:**
- Features, How it works, Pricing, FAQ links
- Live demo link
- Admin link
- Dashboard link

### Loading State
**Desktop Header:**
- Two skeleton loaders (gray rounded rectangles)
- Prevents layout shift during auth check

## Technical Implementation

### Kinde Integration
```tsx
import { LoginLink, useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";

const { accessToken, isAuthenticated, isLoading } = useKindeAuth();
```

### Conditional Rendering
```tsx
{isAuthenticated && accessToken ? (
  // Show Dashboard button
) : !isAuthenticated && !isLoading ? (
  // Show Start free button
) : (
  // Show loading skeletons
)}
```

### Role Detection
```tsx
href={
  accessToken?.roles?.find((role) => role.key === "ADMIN")
    ? "/admin"
    : "/dashboard"
}
```

## Design Consistency

All Nabu branding preserved:
- ✅ Mint color (#00B3A6) for primary actions
- ✅ Dark navy background (#0a1428)
- ✅ Custom SVG logo icon
- ✅ Glass morphism effects
- ✅ Serif typography
- ✅ Rounded 2xl button corners
- ✅ Shadow glows on primary buttons

## Mobile Experience

### Hamburger Menu
- **Position**: Fixed top-right corner
- **Icon**: Menu (closed) / X (open)
- **Background**: Semi-transparent white on dark
- **Animation**: Smooth fade-in/out
- **Body Scroll**: Locked when menu is open

### Menu Styling
- Full-screen dark overlay
- Vertical link list with dividers
- Mint hover color for links
- Matches desktop navigation structure

## Accessibility

- ✅ Proper focus states on all interactive elements
- ✅ ARIA label on mobile menu button
- ✅ Semantic HTML with proper Link components
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

## Performance

- ✅ No additional bundle size (Kinde already in project)
- ✅ Client components only where needed
- ✅ Efficient re-renders with React hooks
- ✅ Skeleton loaders prevent layout shift

## Testing Scenarios

### To Test
1. **Not logged in**: Visit `/nabu` → See "Start free" button
2. **Click "Start free"**: Opens Kinde login flow
3. **After login**: Return to `/nabu` → See "Dashboard" button
4. **Click "Dashboard"**: Navigate to `/dashboard` (or `/admin` for admins)
5. **Mobile**: Toggle hamburger menu → See appropriate links
6. **Loading state**: Fast network → Brief skeleton display

## Future Enhancements

Consider adding:
1. User avatar/profile in header when authenticated
2. Logout button in mobile menu
3. Account settings link
4. Notification badge for dashboard link
5. Profile dropdown menu on desktop
6. Welcome message for authenticated users
7. "Back to Dashboard" banner for logged-in users

## Files Structure

```
components/
  nabu/
    ├── nabu-header.tsx        (Desktop header with auth)
    └── nabu-mobile-nav.tsx    (Mobile menu with auth)

app/
  nabu/
    ├── page.tsx               (Landing page using header)
    └── layout.tsx             (Minimal layout)
```

## Benefits

1. **Unified Experience**: Matches main site navigation patterns
2. **User Retention**: Direct access to dashboard for returning users
3. **Seamless Flow**: Login → Dashboard without confusion
4. **Professional**: Loading states and smooth transitions
5. **Maintainable**: Separate components for header concerns
6. **Responsive**: Works perfectly on all device sizes

