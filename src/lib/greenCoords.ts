import data from './greenCoords.json'

export type GreenHole = {
  hole: number
  par: number
  green?: {
    type: 'single' | 'double'
    center?: { lat: number; lng: number }
    left?: { lat: number; lng: number }
    right?: { lat: number; lng: number } | null
  }
}

export type GreenData = {
  name: string
  greenType: 'single' | 'double'
  holes: GreenHole[]
}

export const GREEN_COORDS = data as Record<string, GreenData>

export const COURSE_ID_TO_GREEN_KEY: Record<string, string> = {
  'hiroshima-gc-suzugamine': 'hiroshima_gc_suzugamine',
  'higashi-hiroshima-gc-south': 'higashi_hiroshima_south',
  'higashi-hiroshima-gc-north': 'higashi_hiroshima_north',
  'kure-cc': 'kure_cc',
  'mihara-cc': 'mihara_cc',
  'onomichi-cc-uneyama': 'onomichi_cc',
  'fukuyama-cc': 'fukuyama_cc',
  'shobara-cc': 'shobara_cc',
  'hiroshima-country-saijo': 'hiroshima_cc_saijo',
  'hiroshima-country-hachihon': 'hiroshima_cc_hachimanmatsu',
  'setouchi-golf-resort': 'setouchi_resort',
  'takehara-cc': 'takehara_cc',
  'kamo-cc': 'kamo_cc',
  'hiroshima-momiji-maruko': 'hiroshima_momiji_maruko',
  'hiroshima-momiji-mikura': 'hiroshima_momiji_mikura',
  'hiroshima-momiji-minosegawa': 'hiroshima_momiji_minosegawa',
  'hakuryuko-cc': 'hakuryuuko_cc',
  'hiroshima-kokusai-gc': 'hiroshima_kokusai_gc',
  'aki-cc': 'aki_cc',
  'otagawa-gion': 'otagawa_gion',
  'otagawa-hesaka': 'otagawa_hesaka',
  'onomichi-uzushio-cc': 'onomichi_uzushio',
  'onomichi-gc': 'onomichi_gc',
  'country-park-senyo': 'country_park_senyo',
  'kyoran-cc-east': 'kyoran_east',
  'kyoran-cc-middle': 'kyoran_middle',
  'kyoran-cc-west': 'kyoran_west',
  'green-birds-gc': 'green_birds_gc',
  'genan-cc': 'genan_cc',
  'gobara-cc': 'gobara_cc',
  'shinichi-classic-gc': 'shinichi_classic_gc',
  'takanonasu-gc': 'takanosugolf',
  'chiyoda-gc': 'chiyoda_gc',
  'toyama-cc': 'toyama_cc',
  'hiroshima-asa-gc': 'hiroshima_asa_gc',
  'hiroshima-nishi-cc': 'hiroshima_nishi_cc',
  'fukuyama-gc': 'fukuyama_gc',
  'fukuyama-higashi-gc': 'fukuyama_higashi_gc',
  'hongo-cc': 'hongo_cc',
  'matsunaga-cc': 'matsunaga_cc',
  'miyajima-cc': 'miyajima_cc',
  'miyajima-shiwa-cc': 'miyajima_shiva_cc',
  'yachiyo-cc-river': 'yachiyocc_river',
  'yachiyo-cc-route': 'yachiyocc_route',
  'yachiyo-cc-lake': 'yachiyocc_lake',
  'regias-crest-grand': 'rejas_grand',
  'regias-crest-royal': 'rejas_royal',
}
