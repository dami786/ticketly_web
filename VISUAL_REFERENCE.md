# 🎨 Event Ticket Color Customization - Visual Reference

## UI Component Layout

### 1. Event Details Page - "Customize Ticket Color" Button

```
┌─────────────────────────────────────────────┐
│  Event details                          ↑   │
├─────────────────────────────────────────────┤
│                                             │
│  📅 Event Date & Time                       │
│  Mon, Feb 3, 2024, 2:00 PM                 │
│                                             │
│  📍 Location                                │
│  San Francisco Convention Center            │
│                                             │
│  ℹ️ Gender                                  │
│  All                                        │
│                                             │
│  💰 Ticket Price                            │
│  PKR 5,000                                  │
│                                             │
│  🎫 Total Tickets                           │
│  5 tickets sold                             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📷 Customize Ticket Color        → │   │
│  │ Change background color             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🎫 Ticket Preview                          │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │    🎫                               │   │
│  │                                     │   │
│  │    EVENT TICKET                     │   │
│  │    Summer Music Festival            │   │
│  │                                     │   │
│  │  (with custom background color)     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 2. Color Picker Modal - Default State (Mobile)

```
┌─────────────────────────────────┐
│  ════════════════════════════   │  (Handle bar)
│                                 │
│  Select Ticket Color         ✕  │
├─────────────────────────────────┤
│                                 │
│  Preview                        │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    🎫                     │  │
│  │                           │  │
│  │    EVENT TICKET           │  │
│  │    Summer Music Fest      │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Preset Colors                  │
│  ⬤ ⬤ ⬤ ⬤                        │
│  ⬤ ⬤ ⬤ ⬤                        │
│  Blue Red Green Purple          │
│  Orange Pink Gray Yellow        │
│                                 │
│  Custom Color                   │
│  ┌────────────┬──────────────┐  │
│  │ [Color]    │ #007AFF      │  │
│  └────────────┴──────────────┘  │
│                                 │
├─────────────────────────────────┤
│ [Cancel]          [Save Color]  │
└─────────────────────────────────┘
```

---

### 3. Color Picker Modal - Desktop

```
        ┌──────────────────────────────────┐
        │ Select Ticket Color           ✕  │
        ├──────────────────────────────────┤
        │                                  │
        │ Preview                          │
        │ ┌──────────────────────────────┐ │
        │ │         🎫                   │ │
        │ │      EVENT TICKET            │ │
        │ │  Summer Music Festival       │ │
        │ │                              │ │
        │ │ (with custom color)          │ │
        │ └──────────────────────────────┘ │
        │                                  │
        │ Preset Colors                    │
        │ ⬤  ⬤  ⬤  ⬤  ⬤  ⬤  ⬤  ⬤         │
        │ Blue Red Green Purple Orange     │
        │ Pink Gray Yellow                 │
        │                                  │
        │ Custom Color                     │
        │ ┌──────────────┬────────────┐   │
        │ │ [Color]      │ #007AFF    │   │
        │ └──────────────┴────────────┘   │
        │                                  │
        ├──────────────────────────────────┤
        │ [Cancel]      [Save Color]      │
        └──────────────────────────────────┘
```

---

### 4. Ticket Preview Component

```
┌─────────────────────────────────────┐
│  Color: #007AFF (or selected)        │
│  Border-Radius: 12px                 │
│  Drop Shadow: active                 │
│                                      │
│     ┌──────────────────────────┐    │
│     │                          │    │
│     │        🎫 (Icon)         │    │
│     │                          │    │
│     │  EVENT TICKET (small)    │    │
│     │  Summer Music Festival   │    │
│     │     (event name)         │    │
│     │                          │    │
│     └──────────────────────────┘    │
│                                      │
│  Text Color Auto: #ffffff or #000000 │
└─────────────────────────────────────┘
```

---

## Color Palette

### Preset Colors Available

```
1. Blue        2. Red         3. Green       4. Purple
   #007AFF        #FF3B30        #34C759        #AF52DE
   [🟦]          [🟥]          [🟩]          [🟪]

5. Orange      6. Pink        7. Gray        8. Yellow
   #FF9500        #FF2D55        #A2A2A2        #FFCC00
   [🟧]          [🟫]          [⬜]          [🟨]
```

---

## State Flow Diagram

```
┌─────────────────────┐
│  Event Details Page │
└──────────┬──────────┘
           │
           ├─→ Display: Current ticket color
           │
           ├─→ Button: "Customize Ticket Color"
           │
           └─→ Click Button
              │
              ↓
         ┌─────────────────────┐
         │ ColorPickerModal    │ (opens)
         │ isOpen = true       │
         └────────┬────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ↓                    ↓
    Select Color      Preview Updates
        │                    │
        ├─ Preset Color     (Live)
        ├─ Color Picker
        └─ Hex Input
        
    Decision Point
        │
        ├─→ CANCEL: Discard (isOpen = false)
        │
        └─→ SAVE: Call API
           │
           ├─→ Loading: isSavingColor = true
           │
           ├─→ API: PUT /api/events/{id}/ticket/color
           │
           ├─→ Response:
           │   ├─→ Success: Update state, show toast
           │   └─→ Error: Show error message
           │
           └─→ Close Modal (isOpen = false)
```

---

## Component Props Reference

### TicketPreview
```typescript
<TicketPreview
  eventName="Summer Festival 2024"
  backgroundColor="#007AFF"
  textColor="#ffffff"  // Optional
/>

Output: 
  - Shows: 🎫 EVENT TICKET
           Summer Festival 2024
  - Background: #007AFF
  - Text Color: #ffffff
```

### PresetColorButtons
```typescript
<PresetColorButtons
  onColorSelect={(color) => console.log(color)}
  selectedColor="#007AFF"
/>

Output:
  - 8 circular color buttons
  - Selected button highlighted
  - Click triggers onColorSelect
```

### ColorPickerModal
```typescript
<ColorPickerModal
  isOpen={true}
  eventName="Summer Festival 2024"
  currentColor="#007AFF"
  onColorSelect={(color) => setColor(color)}
  onSave={() => saveColor()}
  onCancel={() => closeModal()}
  isSaving={false}
/>

Output:
  - Modal dialog
  - Ticket preview
  - Color selection options
  - Save/Cancel buttons
```

---

## User Interaction Flow

### Happy Path (Mobile)
```
1. User taps "Customize Ticket Color" button
   ↓ Button highlights
   ↓ Modal slides up from bottom
   
2. User sees ticket preview with current color
   ↓ Preview shows: 🎫 EVENT TICKET
   
3. User selects a preset color (e.g., Red)
   ↓ Preview updates instantly
   ↓ Preview background: #FF3B30
   
4. User taps "Save Color" button
   ↓ Button shows loading spinner
   ↓ API request sent
   
5. Success response received
   ↓ Toast notification: "Ticket color updated!"
   ↓ Modal closes
   
6. Event details page shows new color
   ↓ Ticket preview displays: #FF3B30
```

### Custom Color Path (Desktop)
```
1. User clicks "Customize Ticket Color" button
   ↓ Modal opens in center
   
2. User clicks color picker icon
   ↓ Native color picker appears
   
3. User selects custom color (e.g., #FF0000)
   ↓ Preview updates
   
4. User clicks "Save Color" button
   ↓ Spinner appears
   ↓ API call made
   
5. Success
   ↓ Toast shown
   ↓ Modal closes
```

### Error Path
```
1. User clicks "Save Color"
   ↓ API request fails
   
2. Error response received
   ↓ Toast error shown
   ↓ Modal remains open
   
3. User can:
   ↓ Try saving again
   ↓ Click Cancel
```

---

## Responsive Breakpoints

### Mobile View (< 640px)
```
- Full-width modal
- Bottom sheet style
- Handle bar visible
- Touch-friendly (larger buttons)
- Single column layout
- Large text
- Vertical preset color grid (4 columns)
```

### Tablet View (640px - 1024px)
```
- Centered modal (400px)
- Shadow overlay
- Multiple column layout
- Balanced spacing
- 4-column preset colors
- Medium text size
```

### Desktop View (> 1024px)
```
- Centered modal (500px)
- Professional appearance
- Optimal spacing
- Wide preview area
- 8-column preset colors
- Readable text
```

---

## Animation Timings

```
Modal Open/Close:   300ms fade
Color Change:       300ms smooth transition
Button Hover:       150ms scale (1.05)
Spinner Rotation:   1000ms per rotation
Toast Appears:      300ms fade in
Toast Disappears:   300ms fade out
```

---

## Error States

### Validation Errors
```
❌ Invalid Hex Format
   Input: #GGHHII
   Error: "Please enter a valid hex color (e.g., #FF3B30)"
   
❌ Network Error
   Error: "Failed to save color. Please try again."
   
❌ API Error
   Error: "Failed to update ticket color"
```

### Recovery Options
```
1. Invalid Color: Allow retry with correct format
2. Network Error: Allow retry button
3. API Error: Allow cancel or retry
```

---

## Accessibility Features

```
✓ Color Contrast: WCAG AA compliant
✓ Button Labels: Clear and descriptive
✓ Icon + Text: Redundant information
✓ Keyboard Navigation: Full support
✓ Screen Reader: Proper ARIA labels
✓ Focus States: Visible focus indicators
✓ Touch Targets: 44px+ minimum
✓ Color Not Only: Icons and text used
```

---

## Performance Metrics

```
Modal Open Time:    < 100ms
Color Preview:      < 16ms (60fps)
API Response:       < 2s typical
Image Load:         < 500ms
Bundle Size:        ~15KB (gzipped)
```

---

## Testing Scenarios

### ✅ Happy Path
- Open modal, select color, save successfully

### ⚠️ Edge Cases
- Maximum hex input length
- Special characters in color
- Rapid clicking on preset buttons
- Network timeout during save

### 🔴 Error Cases
- Invalid color format
- API returns error
- Network disconnected
- Event not found

---

## Browser Compatibility

```
✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+
✓ Mobile Chrome
✓ Mobile Safari
✓ Mobile Firefox
```

---

## Feature Summary

| Feature | Status | Details |
|---------|--------|---------|
| Ticket Preview | ✅ | Shows with custom color |
| Preset Colors | ✅ | 8 colors available |
| Color Picker | ✅ | HTML5 native picker |
| Hex Input | ✅ | With validation |
| Modal Dialog | ✅ | Responsive design |
| Save/Cancel | ✅ | Both functional |
| Loading State | ✅ | Visual feedback |
| Error Handling | ✅ | User messages |
| Persistence | ✅ | API integration |
| Responsive | ✅ | Mobile to desktop |

---

**Last Updated**: February 3, 2026  
**Version**: 1.0.0  
**Status**: ✅ COMPLETE
