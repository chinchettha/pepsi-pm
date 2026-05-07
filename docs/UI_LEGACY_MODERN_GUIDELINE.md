# UI Legacy-Modern Snapshot (Reuse)

Use this snapshot for pages that should look legacy (factory desktop form) but still feel modern/macOS clean.

## 1) Tabs (Legacy bevel + modern clarity)

- Width/size: `min-width: 116px`, `min-height: 40px`, `padding: 9px 20px 8px`
- Typography: `font-size: 13px`, `font-weight: 700`, `line-height: 1.08`
- Shape: `border-radius: 8px 8px 0 0`
- Border tone: default `#98b5d9`, active `#7ea6d6`
- Fill:
  - default: `linear-gradient(180deg, #fbfdff 0%, #d9e9fb 54%, #c9ddf4 100%)`
  - active: `linear-gradient(180deg, #c9ddf8 0%, #b5d0ef 52%, #a6c3e7 100%)`
- Shadow:
  - default: `inset 0 1px 0 rgba(255,255,255,.96), inset 0 -1px 0 rgba(149,176,205,.35), 0 1px 0 rgba(112,148,187,.2)`
  - active: `inset 0 1px 0 rgba(255,255,255,.78), inset 0 -1px 0 rgba(98,133,172,.45), 0 1px 0 rgba(83,126,171,.28)`
- Tabs spacing: tab gap `4px`, nav bottom gap `6px`, hide AntD ink bar

## 2) Content Panel (Form block)

- Modal body padding: `14px`
- Panel background: `linear-gradient(180deg, #d9e9ff 0%, #c9dff9 100%)`
- Panel border: `1px solid #b0cdef`
- Panel radius: `8px`
- Panel padding: `16px`

## 3) Worker Grid Buttons (Assign/Actual worker)

- Grid: 4 columns, gap `6px`
- Container: border `#adc2de`, radius `6px`, padding `9px`
- Button size: `height: 54px`, radius `2px`
- Typography: code + name stacked, compact line-height `1.2`
- Default button:
  - border `#b9c1cb`
  - fill `linear-gradient(180deg, #fefefe 0%, #eaedf1 55%, #dde2e8 100%)`
  - shadow `inset 0 1px 0 rgba(255,255,255,.97), inset 0 -1px 0 rgba(182,190,200,.82)`
- Active button:
  - border `#6a93c3`
  - fill `linear-gradient(180deg, #deeeff 0%, #bfd8f3 56%, #afcaea 100%)`
  - shadow `inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 0 rgba(92,128,167,.52)`

## 4) Text Rules (International)

- Labels/UI controls in English for shared/global screens (`Start Time`, `Finish Time`, `Total Hours`)
- Keep domain wording stable (`Planning`, `Close WO`, `Work Center`)
- Form label baseline: `font-size: 13px`, `line-height: 1.25`
- Body typography line-height: `1.3`

## 5) Reuse Checklist

- Keep bevel effects subtle (avoid heavy 3D)
- Keep blue tone family consistent (tab/panel/button selected)
- Keep all spacing on 2px rhythm where possible (6, 8, 14, 16)
- Validate at 100% zoom before sign-off

