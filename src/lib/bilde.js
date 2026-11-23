/* Bilder fra kamera */
/** Komprimer bilde fra kamera til JPEG-dataURL (maks 1024 px). */
export function komprimer(file, maks = 1024) {
  return new Promise((res) => {
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => res('')
    img.src = url
  })
}
