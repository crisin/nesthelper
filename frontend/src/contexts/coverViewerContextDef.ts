import { createContext } from 'react'

export type OpenCover = (info: { src: string; track?: string; artist?: string }) => void

export const CoverViewerContext = createContext<OpenCover>(() => {})
