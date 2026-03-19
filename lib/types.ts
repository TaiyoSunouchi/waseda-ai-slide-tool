export type SlideLayout = 'title' | 'content' | 'image' | 'two-column' | 'section' | 'summary'

export interface SlideImage {
  id: string
  dataUrl: string   // base64 data URL
  x: number         // pixels in 800×450 canvas
  y: number
  width: number
  height: number
  zIndex: number    // layer order
}

export interface Slide {
  id: string
  layout: SlideLayout
  title: string
  body: string[]
  imageUrl?: string
  notes?: string
  floatingImages?: SlideImage[]
  fontFamily?: string    // CSS font-family (e.g. 'Noto Sans JP')
  bodyFontSize?: number  // px — undefined = auto-scale by item count
}

export interface Presentation {
  id?: string
  title: string
  theme: 'waseda'
  slides: Slide[]
  createdAt?: string
  updatedAt?: string
}
