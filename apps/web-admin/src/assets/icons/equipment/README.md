# Equipment 3D Icons

This directory contains 3D icons for equipment categories from the Figma design pack.

## How to Add Icons

1. **Download Icons from Figma:**
   - Open: https://www.figma.com/design/akcC7NBRsBGiWSjXD0foCR/3D-Icon-Pack--Fitness---Gym--Community-?node-id=3-126&m=dev
   - Export each icon as PNG (recommended: 128x128 or 256x256 pixels)
   - Make sure icons have transparent background

2. **Save Icons with These Names:**
   - `cardio.png` - For CARDIO category
   - `strength.png` - For STRENGTH category
   - `free-weights.png` - For FREE_WEIGHTS category
   - `functional.png` - For FUNCTIONAL category
   - `stretching.png` - For STRETCHING category
   - `recovery.png` - For RECOVERY category
   - `specialized.png` - For SPECIALIZED category
   - `default.png` - Fallback icon for unknown categories

3. **Icon Specifications:**
   - Format: PNG with transparency
   - Size: 128x128 or 256x256 pixels (recommended)
   - Background: Transparent
   - Style: 3D isometric icons

## Usage

Icons are automatically loaded by the `EquipmentIcon` component. If an icon is missing, the component will fallback to Lucide React icons.

## Alternative: Using External URLs

You can also host icons on a CDN and use the `iconUrl` prop in `EquipmentIcon` component:

```tsx
<EquipmentIcon
  category="CARDIO"
  iconUrl="https://your-cdn.com/icons/cardio.png"
  className="w-10 h-10"
/>
```

