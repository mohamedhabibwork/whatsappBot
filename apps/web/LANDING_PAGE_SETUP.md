# Landing Page Setup Guide

## Overview
The landing page has been implemented at `/[locale]/landing` with full internationalization support for English and Arabic.

## File Structure

```
apps/web/
├── app/
│   └── [locale]/
│       └── landing/
│           └── page.tsx          # Main landing page component
├── messages/
│   ├── en.json                   # English translations
│   └── ar.json                   # Arabic translations
└── components/
    └── language-switcher.tsx     # Language toggle component
```

## Accessing the Landing Page

### Development URLs:
- **English**: `http://localhost:3000/en/landing`
- **Arabic**: `http://localhost:3000/ar/landing`

### Production URLs:
- **English**: `https://yourdomain.com/en/landing`
- **Arabic**: `https://yourdomain.com/ar/landing`

## Setting as Homepage

To make the landing page your main homepage, you have two options:

### Option 1: Update Root Page Redirect
Edit `apps/web/middleware.ts` to redirect root to landing:

```typescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/', '/(ar|en)/:path*']
};
```

Then create a redirect in `app/[locale]/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/landing');
}
```

### Option 2: Replace Root Page
Copy the landing page content to `apps/web/app/[locale]/page.tsx` to make it the homepage directly.

## Customization

### Updating Content

#### Text Content
All text is in translation files:
- Edit `messages/en.json` for English
- Edit `messages/ar.json` for Arabic

#### Styling
The page uses Tailwind CSS v4. Modify styles in `page.tsx`:
- Change colors via Tailwind classes
- Update gradients in className attributes
- Adjust spacing and sizing with Tailwind utilities

#### Features Section
Update features array in `page.tsx`:

```typescript
const features = [
  {
    icon: MessageSquare,           // Import from lucide-react
    titleKey: "features.messaging.title",
    descriptionKey: "features.messaging.description",
  },
  // Add more features...
];
```

#### Pricing Plans
Pricing is defined in translation files. Update `messages/en.json` and `messages/ar.json`:

```json
{
  "landing": {
    "pricing": {
      "free": {
        "name": "Free",
        "price": "$0",
        "features": {
          "messages": "100 messages/month"
        }
      }
    }
  }
}
```

### Brand Colors
Update your brand colors in `tailwind.config.js` or component styles:

```typescript
// In page.tsx, find and replace color classes:
className="text-primary"        // Your brand primary color
className="bg-primary/10"       // Primary with opacity
className="border-primary"      // Primary borders
```

### Images and Logos
Replace placeholder images:

1. Add your logo to `apps/web/public/`
2. Update the logo reference in the header:

```typescript
<div className="flex items-center gap-2">
  <MessageSquare className="h-6 w-6 text-primary" />
  <span className="text-xl font-bold">Your Brand</span>
</div>
```

## Required Components

The landing page uses these shadcn/ui components (already installed):

- `Button` - Call-to-action buttons
- `Card` - Feature and pricing cards
- `Badge` - Labels and tags

Lucide React icons used:
- `MessageSquare`, `Zap`, `Users`, `BarChart`
- `Shield`, `Globe`, `Check`, `ArrowRight`
- `Star`, `Sparkles`

## Navigation Links

Current navigation links (update as needed):

- **Features**: Scrolls to `#features` section
- **Pricing**: Scrolls to `#pricing` section
- **About**: Scrolls to `#about` section (add your about section)
- **Login**: Links to `/login` (create auth pages)
- **Sign Up**: Links to `/signup` (create auth pages)

## SEO Optimization

### Add Metadata
Create `apps/web/app/[locale]/landing/metadata.ts`:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Bot - Automate Your Communication',
  description: 'Send bulk messages, manage contacts, create campaigns, and track analytics.',
  keywords: ['whatsapp', 'automation', 'bulk messaging', 'crm'],
  openGraph: {
    title: 'WhatsApp Bot Platform',
    description: 'The most powerful WhatsApp automation platform',
    images: ['/og-image.png'],
  },
};
```

### Sitemap
Add to `apps/web/app/sitemap.ts`:

```typescript
export default function sitemap() {
  return [
    {
      url: 'https://yourdomain.com/en/landing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://yourdomain.com/ar/landing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
```

## Analytics Integration

### Google Analytics
Add to `apps/web/app/layout.tsx`:

```typescript
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Performance Optimization

### Image Optimization
Use Next.js Image component for all images:

```typescript
import Image from 'next/image';

<Image
  src="/your-image.png"
  alt="Description"
  width={800}
  height={600}
  priority={false}  // true for above-fold images
/>
```

### Code Splitting
The page automatically benefits from Next.js code splitting. For additional optimization:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <p>Loading...</p>,
});
```

## Testing

### Visual Testing
Test the landing page in different scenarios:

```bash
# Development
bun run dev

# Production build
bun run build
bun run start
```

### Responsiveness
Test on different screen sizes:
- Mobile (320px - 768px)
- Tablet (768px - 1024px)
- Desktop (1024px+)

### Browser Testing
Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (especially for iOS)

### Language Switching
Test both English and Arabic:
- Verify RTL layout for Arabic
- Check text rendering
- Verify all translations are present

## Deployment Checklist

Before deploying to production:

- [ ] Update all placeholder text with actual content
- [ ] Replace demo images with real brand assets
- [ ] Add your logo and favicon
- [ ] Configure SEO metadata
- [ ] Set up analytics tracking
- [ ] Test all CTAs lead to correct pages
- [ ] Verify responsive design on real devices
- [ ] Test both English and Arabic versions
- [ ] Add contact information in footer
- [ ] Set up privacy policy and terms pages
- [ ] Configure proper redirects for root domain
- [ ] Enable HTTPS
- [ ] Set up CDN for static assets
- [ ] Test loading speed (aim for <3s)

## Support

For issues or questions:
1. Check the implementation documentation
2. Review TRPC router definitions
3. Verify translation files are complete
4. Ensure all dependencies are installed

## Next Steps

After the landing page is live:

1. **Create Auth Pages**: Implement `/login` and `/signup`
2. **Dashboard**: Build authenticated user dashboard
3. **Payment Integration**: Connect payment gateway for subscriptions
4. **Email Templates**: Design invoice and welcome emails
5. **Help Center**: Add documentation and FAQs
6. **Blog**: Consider adding a blog for SEO and content marketing

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
