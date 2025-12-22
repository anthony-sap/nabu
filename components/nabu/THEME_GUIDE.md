# Nabu Theme Guide

This guide explains how to use the Nabu brand colors and utilities in the application.

## Brand Colors

### RGB Tokens (for direct use)
```css
--nabu-mint: 0 179 166        /* #00B3A6 - Primary brand color */
--nabu-deep: 7 22 51          /* #071633 - Deep navy */
--nabu-lapis: 30 64 175       /* #1E40AF - Secondary blue */
--nabu-gold: 197 155 47       /* #C59B2F - Accent gold */
--nabu-gold-access: 224 195 106 /* #E0C36A - Lighter gold */
--nabu-clay: 231 220 199      /* #E7DCC7 - Warm neutral */
--nabu-white: 255 255 255
```

### Design Tokens (shadcn/ui)

#### Light Mode
- **Primary**: Mint (`#00B3A6`) - Used for buttons, links, focus states
- **Secondary**: Lapis (`#1E40AF`) - Used for secondary actions
- **Accent**: Gold (`#C59B2F`) - Used for highlights
- **Muted**: Clay (`#E7DCC7`) - Used for subtle backgrounds

#### Dark Mode
- **Background**: Deep navy (`hsl(226 58% 11%)`)
- **Primary**: Brighter mint (`hsl(173 100% 45%)`)
- All other tokens automatically adjust for dark mode

## Utility Classes

### Background Colors
```tsx
<div className="bg-nabu-mint">Mint background</div>
<div className="bg-nabu-deep">Deep navy background</div>
<div className="bg-nabu-lapis">Lapis blue background</div>
<div className="bg-nabu-gold">Gold background</div>
<div className="bg-nabu-clay">Clay background</div>
```

### Text Colors
```tsx
<p className="text-nabu-mint">Mint text</p>
<p className="nabu-text-muted">Muted text (uses theme token)</p>
```

### Surface Utilities
```tsx
<div className="nabu-surface-deep">Deep navy surface</div>
<div className="nabu-surface-lapis">Lapis surface</div>
```

### Border Radius
```tsx
<div className="rounded-nabu">Nabu-style rounded corners (16px)</div>
```

## Component Utilities

### Glass Effect
Creates a frosted glass morphism effect:
```tsx
<div className="nabu-glass p-4">
  Glass card content
</div>
```

### Pill Badge
Creates a mint-themed pill badge:
```tsx
<span className="nabu-pill">New Feature</span>
```

## Box Shadows

### Standard Nabu Shadow
```tsx
<div className="shadow-nabu">
  Content with signature Nabu shadow
</div>
```

### Card Shadow (Subtle)
```tsx
<Card className="shadow-nabu-card">
  Subtle card shadow
</Card>
```

### Glow Effect (Mint)
```tsx
<Card className="shadow-nabu-glow">
  Mint glow effect on hover
</Card>
```

## Using shadcn/ui Tokens

### Primary (Mint)
```tsx
<Button className="bg-primary text-primary-foreground">
  Primary Button
</Button>
```

### Secondary (Lapis)
```tsx
<Button className="bg-secondary text-secondary-foreground">
  Secondary Button
</Button>
```

### Accent (Gold)
```tsx
<Badge className="bg-accent text-accent-foreground">
  Accent Badge
</Badge>
```

### Muted (Clay)
```tsx
<div className="bg-muted text-muted-foreground">
  Muted background with muted text
</div>
```

## Focus States

The theme automatically applies mint-colored focus outlines to all focusable elements:
```css
:focus-visible {
  outline: 3px solid hsl(var(--ring) / 0.35);
  outline-offset: 2px;
}
```

## Best Practices

1. **Use design tokens first**: Prefer `bg-primary`, `text-muted-foreground`, etc. over direct color classes
2. **Dark mode support**: Design tokens automatically adapt to dark mode
3. **Glass effects**: Use `nabu-glass` for overlay cards and modals
4. **Shadows**: Use `shadow-nabu` for primary focus, `shadow-nabu-card` for subtle elevation
5. **Consistency**: Stick to the 16px border radius (`rounded-nabu` or via `--radius` token)

## Examples

### Primary Action Card
```tsx
<Card className="shadow-nabu-card hover:shadow-nabu transition-shadow">
  <CardContent className="p-6">
    <Button className="bg-primary text-primary-foreground">
      Take Action
    </Button>
  </CardContent>
</Card>
```

### Glass Overlay
```tsx
<div className="nabu-glass rounded-nabu p-6">
  <h3 className="text-foreground font-serif">Glass Card</h3>
  <p className="nabu-text-muted">Subtle frosted glass effect</p>
</div>
```

### Pill Tags
```tsx
<div className="flex gap-2">
  <span className="nabu-pill">Tag 1</span>
  <span className="nabu-pill">Tag 2</span>
</div>
```

## Theme Variables in CSS

If you need to use the theme in custom CSS:

```css
/* Using HSL tokens */
.custom-element {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid hsl(var(--border));
}

/* Using RGB tokens */
.custom-brand {
  background: rgb(var(--nabu-mint));
}
```

## Responsive Design

All theme utilities work with Tailwind's responsive prefixes:

```tsx
<div className="bg-muted md:bg-primary lg:shadow-nabu">
  Responsive theming
</div>
```

