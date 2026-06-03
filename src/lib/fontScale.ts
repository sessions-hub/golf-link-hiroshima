export function applyFontScale() {
  const scale = localStorage.getItem('font_scale') ?? 'normal'
  if (scale === 'large') {
    document.body.classList.add('font-large')
  } else {
    document.body.classList.remove('font-large')
  }
}

export function setFontScale(scale: 'normal' | 'large') {
  localStorage.setItem('font_scale', scale)
  applyFontScale()
}

export function getFontScale(): 'normal' | 'large' {
  return (localStorage.getItem('font_scale') ?? 'normal') as 'normal' | 'large'
}
