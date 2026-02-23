declare module 'dom-to-image-more' {
  const domToImage: {
    toPng(node: Node, options?: Record<string, unknown>): Promise<string>
    toJpeg(node: Node, options?: Record<string, unknown>): Promise<string>
    toBlob(node: Node, options?: Record<string, unknown>): Promise<Blob>
    toSvg(node: Node, options?: Record<string, unknown>): Promise<string>
    toPixelData(node: Node, options?: Record<string, unknown>): Promise<Uint8ClampedArray>
  }
  export default domToImage
}
