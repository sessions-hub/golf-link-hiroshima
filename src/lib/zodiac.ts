// 星座計算・相性判定

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'

export const ZODIAC_NAMES_JP: Record<ZodiacSign, string> = {
  aries:       '牡羊座 ♈',
  taurus:      '牡牛座 ♉',
  gemini:      '双子座 ♊',
  cancer:      '蟹座 ♋',
  leo:         '獅子座 ♌',
  virgo:       '乙女座 ♍',
  libra:       '天秤座 ♎',
  scorpio:     '蠍座 ♏',
  sagittarius: '射手座 ♐',
  capricorn:   '山羊座 ♑',
  aquarius:    '水瓶座 ♒',
  pisces:      '魚座 ♓',
}

// 生年月日から星座を取得
export function getZodiacSign(birthDate: string): ZodiacSign {
  const date = new Date(birthDate)
  const month = date.getMonth() + 1
  const day = date.getDate()

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'gemini'
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return 'libra'
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return 'scorpio'
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return 'sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
  return 'pisces'
}

// 星座相性テーブル（◎○△）
const ZODIAC_COMPAT: Record<ZodiacSign, Record<ZodiacSign, string>> = {
  aries:       { aries:'○', taurus:'△', gemini:'◎', cancer:'△', leo:'◎', virgo:'△', libra:'○', scorpio:'△', sagittarius:'◎', capricorn:'△', aquarius:'○', pisces:'△' },
  taurus:      { aries:'△', taurus:'○', gemini:'△', cancer:'◎', leo:'△', virgo:'◎', libra:'△', scorpio:'○', sagittarius:'△', capricorn:'◎', aquarius:'△', pisces:'○' },
  gemini:      { aries:'◎', taurus:'△', gemini:'○', cancer:'△', leo:'○', virgo:'△', libra:'◎', scorpio:'△', sagittarius:'○', capricorn:'△', aquarius:'◎', pisces:'△' },
  cancer:      { aries:'△', taurus:'◎', gemini:'△', cancer:'○', leo:'△', virgo:'○', libra:'△', scorpio:'◎', sagittarius:'△', capricorn:'○', aquarius:'△', pisces:'◎' },
  leo:         { aries:'◎', taurus:'△', gemini:'○', cancer:'△', leo:'○', virgo:'△', libra:'○', scorpio:'△', sagittarius:'◎', capricorn:'△', aquarius:'○', pisces:'△' },
  virgo:       { aries:'△', taurus:'◎', gemini:'△', cancer:'○', leo:'△', virgo:'○', libra:'△', scorpio:'○', sagittarius:'△', capricorn:'◎', aquarius:'△', pisces:'○' },
  libra:       { aries:'○', taurus:'△', gemini:'◎', cancer:'△', leo:'○', virgo:'△', libra:'○', scorpio:'△', sagittarius:'○', capricorn:'△', aquarius:'◎', pisces:'△' },
  scorpio:     { aries:'△', taurus:'○', gemini:'△', cancer:'◎', leo:'△', virgo:'○', libra:'△', scorpio:'○', sagittarius:'△', capricorn:'○', aquarius:'△', pisces:'◎' },
  sagittarius: { aries:'◎', taurus:'△', gemini:'○', cancer:'△', leo:'◎', virgo:'△', libra:'○', scorpio:'△', sagittarius:'○', capricorn:'△', aquarius:'○', pisces:'△' },
  capricorn:   { aries:'△', taurus:'◎', gemini:'△', cancer:'○', leo:'△', virgo:'◎', libra:'△', scorpio:'○', sagittarius:'△', capricorn:'○', aquarius:'△', pisces:'○' },
  aquarius:    { aries:'○', taurus:'△', gemini:'◎', cancer:'△', leo:'○', virgo:'△', libra:'◎', scorpio:'△', sagittarius:'○', capricorn:'△', aquarius:'○', pisces:'△' },
  pisces:      { aries:'△', taurus:'○', gemini:'△', cancer:'◎', leo:'△', virgo:'○', libra:'△', scorpio:'◎', sagittarius:'△', capricorn:'○', aquarius:'△', pisces:'○' },
}

export function getZodiacCompat(sign1: ZodiacSign, sign2: ZodiacSign): string {
  return ZODIAC_COMPAT[sign1]?.[sign2] ?? '—'
}
